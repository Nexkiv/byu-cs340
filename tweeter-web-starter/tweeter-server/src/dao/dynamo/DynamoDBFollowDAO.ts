import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  QueryCommandInput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { FollowDAO, UserFollowDto } from "../interface/FollowDAO";
import { UserDto, FollowDto } from "tweeter-shared";

export class DynamoDBFollowDAO implements FollowDAO {
  readonly followTable = "follow";
  readonly userTable = "user";
  readonly followerIndexName = "follower_index";
  readonly followeeIndexName = "followee_index";

  private readonly client = DynamoDBDocumentClient.from(new DynamoDBClient());

  async follow(
    followerUserId: string,
    followeeUserId: string
  ): Promise<FollowDto> {
    // Check if active follow already exists (idempotency)
    const existingFollow = await this.getActiveFollow(
      followerUserId,
      followeeUserId
    );

    if (existingFollow) {
      return existingFollow;
    }

    // Create new follow if doesn't exist
    const followId = uuidv4();
    const followTime = Date.now();

    // Don't include unfollowTime attribute for active follows
    // (attribute_not_exists checks for attribute presence, not null value)
    const followItem: any = {
      followId,
      followerUserId: followerUserId,
      followeeUserId: followeeUserId,
      followTime,
    };

    await this.client.send(
      new PutCommand({
        TableName: this.followTable,
        Item: followItem,
      })
    );

    // Return DTO with unfollowTime as null for API consistency
    const followDto: FollowDto = {
      ...followItem,
      unfollowTime: null,
    };

    return followDto;
  }

  async unfollow(
    followerUserId: string,
    followeeUserId: string
  ): Promise<void> {
    // Query for active follow (no Limit - same reason as getActiveFollow)
    const params: QueryCommandInput = {
      TableName: this.followTable,
      IndexName: this.followerIndexName,
      KeyConditionExpression: "followerUserId = :followerUserId",
      FilterExpression:
        "followeeUserId = :followeeUserId AND attribute_not_exists(unfollowTime)",
      ExpressionAttributeValues: {
        ":followerUserId": followerUserId,
        ":followeeUserId": followeeUserId,
      },
    };

    const result = await this.client.send(new QueryCommand(params));

    if (!result.Items || result.Items.length === 0) {
      const error = "No active follow relationship found";
      console.error(`[unfollow] ERROR: ${error}`);
      throw new Error(error);
    }

    // Update with unfollowTime
    await this.client.send(
      new UpdateCommand({
        TableName: this.followTable,
        Key: { followId: result.Items[0].followId },
        UpdateExpression: "SET unfollowTime = :unfollowTime",
        ExpressionAttributeValues: {
          ":unfollowTime": Date.now(),
        },
      })
    );
  }

  async isFollower(
    followerUserId: string,
    followeeUserId: string
  ): Promise<boolean> {
    // No Limit - same reason as getActiveFollow (Limit applied before FilterExpression)
    const params: QueryCommandInput = {
      TableName: this.followTable,
      IndexName: this.followerIndexName,
      KeyConditionExpression: "followerUserId = :followerUserId",
      FilterExpression:
        "followeeUserId = :followeeUserId AND attribute_not_exists(unfollowTime)",
      ExpressionAttributeValues: {
        ":followerUserId": followerUserId,
        ":followeeUserId": followeeUserId,
      },
      Select: "COUNT",
    };

    const result = await this.client.send(new QueryCommand(params));
    return (result.Count ?? 0) > 0;
  }

  async getFolloweeCount(userId: string): Promise<number> {
    let count = 0;
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;

    do {
      const params: QueryCommandInput = {
        TableName: this.followTable,
        IndexName: this.followerIndexName,
        KeyConditionExpression: "followerUserId = :followerUserId",
        FilterExpression: "attribute_not_exists(unfollowTime)",
        ExpressionAttributeValues: {
          ":followerUserId": userId,
        },
        Select: "COUNT",
        ExclusiveStartKey: lastEvaluatedKey,
      };

      const result = await this.client.send(new QueryCommand(params));
      count += result.Count ?? 0;
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return count;
  }

  async getFollowerCount(userId: string): Promise<number> {
    let count = 0;
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;

    do {
      const params: QueryCommandInput = {
        TableName: this.followTable,
        IndexName: this.followeeIndexName,
        KeyConditionExpression: "followeeUserId = :followeeUserId",
        FilterExpression: "attribute_not_exists(unfollowTime)",
        ExpressionAttributeValues: {
          ":followeeUserId": userId,
        },
        Select: "COUNT",
        ExclusiveStartKey: lastEvaluatedKey,
      };

      const result = await this.client.send(new QueryCommand(params));
      count += result.Count ?? 0;
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return count;
  }

  async getPageOfFollowees(
    userId: string,
    lastFollowTime: number | null,
    pageSize: number,
    activeOnly: boolean
  ): Promise<[UserFollowDto[], boolean]> {
    const params: QueryCommandInput = {
      TableName: this.followTable,
      IndexName: this.followerIndexName,
      KeyConditionExpression: "followerUserId = :followerUserId",
      ExpressionAttributeValues: {
        ":followerUserId": userId,
      },
      Limit: pageSize,
      ScanIndexForward: false,
    };

    if (lastFollowTime !== null) {
      params.ExclusiveStartKey = {
        followerUserId: userId,
        followTime: lastFollowTime,
      };
    }

    if (activeOnly) {
      params.FilterExpression = "attribute_not_exists(unfollowTime)";
    }

    const result = await this.client.send(new QueryCommand(params));

    // Batch fetch user details
    const followItems = result.Items || [];
    const followeeUserIds = followItems.map((item) => item.followeeUserId);
    const userFollows: UserFollowDto[] = [];

    if (followeeUserIds.length > 0) {
      const batchResult = await this.client.send(
        new BatchGetCommand({
          RequestItems: {
            [this.userTable]: {
              Keys: followeeUserIds.map((userId) => ({ userId })),
            },
          },
        })
      );
      const users = (batchResult.Responses?.[this.userTable] ||
        []) as UserDto[];

      // Create map of userId -> UserDto for efficient lookup
      const userMap = new Map<string, UserDto>();
      users.forEach((user) => userMap.set(user.userId, user));

      // Combine user data with follow metadata
      followItems.forEach((followItem) => {
        const user = userMap.get(followItem.followeeUserId);
        if (user) {
          userFollows.push({
            user: user,
            followTime: followItem.followTime,
          });
        }
      });
    }

    return [userFollows, !!result.LastEvaluatedKey];
  }

  async getPageOfFollowers(
    userId: string,
    lastFollowTime: number | null,
    pageSize: number,
    activeOnly: boolean
  ): Promise<[UserFollowDto[], boolean]> {
    const params: QueryCommandInput = {
      TableName: this.followTable,
      IndexName: this.followeeIndexName,
      KeyConditionExpression: "followeeUserId = :followeeUserId",
      ExpressionAttributeValues: {
        ":followeeUserId": userId,
      },
      Limit: pageSize,
      ScanIndexForward: false,
    };

    if (lastFollowTime !== null) {
      params.ExclusiveStartKey = {
        followeeUserId: userId,
        followTime: lastFollowTime,
      };
    }

    if (activeOnly) {
      params.FilterExpression = "attribute_not_exists(unfollowTime)";
    }

    const result = await this.client.send(new QueryCommand(params));

    // Batch fetch user details
    const followItems = result.Items || [];
    const followerUserIds = followItems.map((item) => item.followerUserId);
    const userFollows: UserFollowDto[] = [];

    if (followerUserIds.length > 0) {
      const batchResult = await this.client.send(
        new BatchGetCommand({
          RequestItems: {
            [this.userTable]: {
              Keys: followerUserIds.map((userId) => ({ userId })),
            },
          },
        })
      );
      const users = (batchResult.Responses?.[this.userTable] ||
        []) as UserDto[];

      // Create map of userId -> UserDto for efficient lookup
      const userMap = new Map<string, UserDto>();
      users.forEach((user) => userMap.set(user.userId, user));

      // Combine user data with follow metadata
      followItems.forEach((followItem) => {
        const user = userMap.get(followItem.followerUserId);
        if (user) {
          userFollows.push({
            user: user,
            followTime: followItem.followTime,
          });
        }
      });
    }

    return [userFollows, !!result.LastEvaluatedKey];
  }

  async getFollowHistory(
    followerUserId: string,
    followeeUserId: string
  ): Promise<FollowDto[]> {
    const params: QueryCommandInput = {
      TableName: this.followTable,
      IndexName: this.followerIndexName,
      KeyConditionExpression: "followerUserId = :followerUserId",
      FilterExpression: "followeeUserId = :followeeUserId",
      ExpressionAttributeValues: {
        ":followerUserId": followerUserId,
        ":followeeUserId": followeeUserId,
      },
      ScanIndexForward: false,
    };

    const result = await this.client.send(new QueryCommand(params));
    return (result.Items || []) as FollowDto[];
  }

  async getActiveFollow(
    followerUserId: string,
    followeeUserId: string
  ): Promise<FollowDto | null> {
    // Note: No Limit specified because DynamoDB applies Limit BEFORE FilterExpression.
    // With Limit: 1, it might check only the first follow by time, which may not match
    // the followeeUserId filter, resulting in false negatives for idempotency checks.
    const params: QueryCommandInput = {
      TableName: this.followTable,
      IndexName: this.followerIndexName,
      KeyConditionExpression: "followerUserId = :followerUserId",
      FilterExpression:
        "followeeUserId = :followeeUserId AND attribute_not_exists(unfollowTime)",
      ExpressionAttributeValues: {
        ":followerUserId": followerUserId,
        ":followeeUserId": followeeUserId,
      },
    };

    const result = await this.client.send(new QueryCommand(params));

    if (result.Items && result.Items.length > 0) {
      return result.Items[0] as FollowDto;
    }

    return null;
  }
}
