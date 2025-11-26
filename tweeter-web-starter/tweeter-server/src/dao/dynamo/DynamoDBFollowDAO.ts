import {
  BatchGetCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { FollowDAO } from "../interface/FollowDAO";
import { UserDto } from "tweeter-shared";
import { QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export class DynamoDBFollowDAO implements FollowDAO {
  readonly followTable = "follow";
  readonly userTable = "user";
  readonly indexName = "follows_index";

  private readonly client = DynamoDBDocumentClient.from(new DynamoDBClient());

  async getPageOfFollowees(
    alias: string,
    lastItem: UserDto | null,
    pageSize: number
  ): Promise<[UserDto[], boolean]> {
    // KeyCondition: all followees for this follower
    const params: QueryCommandInput = {
      TableName: this.followTable,
      KeyConditionExpression: "follower_alias = :follower",
      ExpressionAttributeValues: {
        ":follower": alias,
      },
      Limit: pageSize,
    };

    // For pagination: If lastItem provided, start after it
    if (lastItem && lastItem.alias) {
      params.ExclusiveStartKey = {
        follower_alias: alias,
        followee_alias: lastItem.alias,
      };
    }

    const command = new QueryCommand(params);
    const result = await this.client.send(command);

    // Get all follower handles from items
    const followeeHandles: string[] = (result.Items || []).map(
      (item) => item.followee_alias
    );

    // Batch-fetch user details from users table
    let followees: UserDto[] = [];
    if (followeeHandles.length > 0) {
      const batchResult = await this.client.send(
        new BatchGetCommand({
          RequestItems: {
            [this.userTable]: {
              Keys: followeeHandles.map((alias) => ({ alias })),
            },
          },
        })
      );
      followees = (batchResult.Responses?.[this.userTable] || []) as UserDto[];
    }

    const hasMorePages = !!result.LastEvaluatedKey;

    return [followees, hasMorePages];
  }

  async getPageOfFollowers(
    alias: string,
    lastItem: UserDto | null,
    pageSize: number
  ): Promise<[UserDto[], boolean]> {
    // Query the GSI where followee_alias == alias
    const params: QueryCommandInput = {
      TableName: this.followTable,
      IndexName: this.indexName,
      KeyConditionExpression: "followee_alias = :followee",
      ExpressionAttributeValues: { ":followee": alias },
      Limit: pageSize,
    };

    // Add pagination support
    if (lastItem && lastItem.alias) {
      params.ExclusiveStartKey = {
        follower_alias: lastItem.alias, // GSI keys
        followee_alias: alias,
      };
    }

    const command = new QueryCommand(params);
    const result = await this.client.send(command);

    // Get all follower handles from items
    const followerHandles: string[] = (result.Items || []).map(
      (item) => item.follower_alias
    );

    // Batch-fetch user details from users table
    let followers: UserDto[] = [];
    if (followerHandles.length > 0) {
      const batchResult = await this.client.send(
        new BatchGetCommand({
          RequestItems: {
            [this.userTable]: {
              Keys: followerHandles.map((alias) => ({ alias })),
            },
          },
        })
      );
      followers = (batchResult.Responses?.[this.userTable] || []) as UserDto[];
    }

    const hasMorePages = !!result.LastEvaluatedKey;

    return [followers, hasMorePages];
  }

  async isFollower(
    followerAlias: string,
    followeeAlias: string
  ): Promise<boolean> {
    const cmd = new GetCommand({
      TableName: this.followTable,
      Key: {
        follower_alias: followerAlias,
        followee_alias: followeeAlias,
      },
    });

    const result = await this.client.send(cmd);
    // If an item is found, they are following.
    return !!result.Item;
  }

  async getFolloweeCount(alias: string): Promise<number> {
    const params: QueryCommandInput = {
      TableName: this.followTable,
      KeyConditionExpression: "follower_alias = :user",
      ExpressionAttributeValues: {
        ":user": alias,
      },
      Select: "COUNT",
    };
    const command = new QueryCommand(params);
    const result = await this.client.send(command);
    return result.Count ?? 0;
  }

  async getFollowerCount(alias: string): Promise<number> {
    const params: QueryCommandInput = {
      TableName: this.followTable,
      KeyConditionExpression: "followee_alias = :user",
      ExpressionAttributeValues: {
        ":user": alias,
      },
      Select: "COUNT",
    };
    const command = new QueryCommand(params);
    const result = await this.client.send(command);
    return result.Count ?? 0;
  }

  async follow(followerAlias: string, followeeAlias: string): Promise<void> {
    const cmd = new PutCommand({
      TableName: this.followTable,
      Item: {
        follower_alias: followerAlias,
        followee_alias: followeeAlias,
      },
    });
    await this.client.send(cmd);
  }

  async unfollow(followerAlias: string, followeeAlias: string): Promise<void> {
    const cmd = new DeleteCommand({
      TableName: this.followTable,
      Key: {
        follower_alias: followerAlias,
        followee_alias: followeeAlias,
      },
    });
    await this.client.send(cmd);
  }
}
