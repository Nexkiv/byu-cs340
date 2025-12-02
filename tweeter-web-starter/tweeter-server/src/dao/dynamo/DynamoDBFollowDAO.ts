import {
  PutCommand,
  QueryCommand,
  QueryCommandInput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { FollowDAO, UserFollowDto } from "../interface/FollowDAO";
import { UserDto, FollowDto } from "tweeter-shared";
import { BaseDynamoDBDAO } from "../base/BaseDynamoDBDAO";
import {
  buildPaginatedQuery,
  executePaginatedQuery,
  executeCountQuery,
  executeExistsQuery,
} from "../utils/DynamoDBQueryHelpers";
import {
  batchGetUsers,
  hydrateFollowsWithUsers,
} from "../utils/UserHydrationHelpers";

export class DynamoDBFollowDAO extends BaseDynamoDBDAO implements FollowDAO {
  readonly followTable = "follow";
  readonly userTable = "user";
  readonly followerIndexName = "follower_index";
  readonly followeeIndexName = "followee_index";

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
    return executeExistsQuery(this.client, {
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
    });
  }

  async getFolloweeCount(userId: string): Promise<number> {
    return executeCountQuery(this.client, {
      TableName: this.followTable,
      IndexName: this.followerIndexName,
      KeyConditionExpression: "followerUserId = :followerUserId",
      FilterExpression: "attribute_not_exists(unfollowTime)",
      ExpressionAttributeValues: {
        ":followerUserId": userId,
      },
      Select: "COUNT",
    });
  }

  async getFollowerCount(userId: string): Promise<number> {
    return executeCountQuery(this.client, {
      TableName: this.followTable,
      IndexName: this.followeeIndexName,
      KeyConditionExpression: "followeeUserId = :followeeUserId",
      FilterExpression: "attribute_not_exists(unfollowTime)",
      ExpressionAttributeValues: {
        ":followeeUserId": userId,
      },
      Select: "COUNT",
    });
  }

  async getPageOfFollowees(
    userId: string,
    lastFollowTime: number | null,
    pageSize: number,
    activeOnly: boolean
  ): Promise<[UserFollowDto[], boolean]> {
    // Build base query params
    const baseParams: Omit<QueryCommandInput, "Limit" | "ExclusiveStartKey"> = {
      TableName: this.followTable,
      IndexName: this.followerIndexName,
      KeyConditionExpression: "followerUserId = :followerUserId",
      ExpressionAttributeValues: {
        ":followerUserId": userId,
      },
      ScanIndexForward: false,
    };

    if (activeOnly) {
      baseParams.FilterExpression = "attribute_not_exists(unfollowTime)";
    }

    // Build paginated query
    const params = buildPaginatedQuery(
      baseParams,
      {
        pageSize,
        lastItem: lastFollowTime !== null ? { followTime: lastFollowTime } : null,
        buildStartKey: (item: { followTime: number }) => ({
          followerUserId: userId,
          followTime: item.followTime,
        }),
      }
    );

    // Execute query
    const [followItems, hasMore] = await executePaginatedQuery<any>(
      this.client,
      params
    );

    if (followItems.length === 0) {
      return [[], hasMore];
    }

    // Batch fetch and hydrate users
    const followeeUserIds = followItems.map((item) => item.followeeUserId);
    const userMap = await batchGetUsers(this.client, this.userTable, followeeUserIds);

    const userFollows = hydrateFollowsWithUsers(
      followItems,
      userMap,
      (item) => item.followeeUserId,
      (item) => item.followTime
    );

    return [userFollows, hasMore];
  }

  async getPageOfFollowers(
    userId: string,
    lastFollowTime: number | null,
    pageSize: number,
    activeOnly: boolean
  ): Promise<[UserFollowDto[], boolean]> {
    // Build base query params
    const baseParams: Omit<QueryCommandInput, "Limit" | "ExclusiveStartKey"> = {
      TableName: this.followTable,
      IndexName: this.followeeIndexName,
      KeyConditionExpression: "followeeUserId = :followeeUserId",
      ExpressionAttributeValues: {
        ":followeeUserId": userId,
      },
      ScanIndexForward: false,
    };

    if (activeOnly) {
      baseParams.FilterExpression = "attribute_not_exists(unfollowTime)";
    }

    // Build paginated query
    const params = buildPaginatedQuery(
      baseParams,
      {
        pageSize,
        lastItem: lastFollowTime !== null ? { followTime: lastFollowTime } : null,
        buildStartKey: (item: { followTime: number }) => ({
          followeeUserId: userId,
          followTime: item.followTime,
        }),
      }
    );

    // Execute query
    const [followItems, hasMore] = await executePaginatedQuery<any>(
      this.client,
      params
    );

    if (followItems.length === 0) {
      return [[], hasMore];
    }

    // Batch fetch and hydrate users
    const followerUserIds = followItems.map((item) => item.followerUserId);
    const userMap = await batchGetUsers(this.client, this.userTable, followerUserIds);

    const userFollows = hydrateFollowsWithUsers(
      followItems,
      userMap,
      (item) => item.followerUserId,
      (item) => item.followTime
    );

    return [userFollows, hasMore];
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
