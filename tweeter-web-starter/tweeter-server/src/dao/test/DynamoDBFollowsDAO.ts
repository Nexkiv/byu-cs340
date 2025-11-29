// DynamoDBFollowsDAO.ts
import { FollowsDAO } from "./FollowsDAO";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DataPage } from "../../entity/DataPage";
import { Follow } from "../../entity/Follow";

const PAGE_LIMIT = 10;

export class DynamoDBFollowsDAO implements FollowsDAO {
  readonly tableName = "follows";
  readonly indexName = "follows_index";
  readonly followerHandleAttr = "follower_handle";
  readonly followerNameAttr = "follower_name";
  readonly followeeHandleAttr = "followee_handle";
  readonly followeeNameAttr = "follower_name";

  private readonly client = DynamoDBDocumentClient.from(new DynamoDBClient());

  /** Retrieve a specific follow relationship */
  async getFollow(follow: Follow): Promise<Follow | undefined> {
    const params = {
      TableName: this.tableName,
      Key: this.generateFollowItem(follow),
    };
    const output = await this.client.send(new GetCommand(params));
    return output.Item == undefined
      ? undefined
      : this.constructFollow(output.Item);
  }

  /** Put a new follow relationship */
  async putFollow(follow: Follow): Promise<void> {
    const params = {
      TableName: this.tableName,
      Item: follow,
    };
    await this.client.send(new PutCommand(params));
  }

  /** Delete a follow relationship */
  async deleteFollow(follow: Follow): Promise<void> {
    const params = {
      TableName: this.tableName,
      Key: this.generateFollowItem(follow),
    };
    await this.client.send(new DeleteCommand(params));
  }

  /** Paginated fetch of users followed by a follower */
  async getPageOfFollowees(
    followerHandle: string,
    pageSize: number = PAGE_LIMIT,
    lastFolloweeHandle?: string
  ): Promise<DataPage<Follow>> {
    const params: any = {
      TableName: this.tableName,
      KeyConditionExpression: `${this.followerHandleAttr} = :follower_handle`,
      ExpressionAttributeValues: { ":follower_handle": followerHandle },
      Limit: pageSize,
    };
    if (lastFolloweeHandle !== undefined) {
      params.ExclusiveStartKey = {
        [this.followerHandleAttr]: followerHandle,
        [this.followeeHandleAttr]: lastFolloweeHandle,
      };
    }

    const items: Follow[] = [];
    const data = await this.client.send(new QueryCommand(params));
    const hasMorePages = !!data.LastEvaluatedKey;
    data.Items?.forEach((item) => items.push(this.constructFollow(item)));

    return new DataPage<Follow>(items, hasMorePages);
  }

  /** Paginated fetch of followers of a given user by index */
  async getPageOfFollowers(
    followeeHandle: string,
    pageSize: number = PAGE_LIMIT,
    lastFolloweeHandle?: string
  ): Promise<DataPage<Follow>> {
    const params: any = {
      TableName: this.tableName,
      IndexName: this.indexName,
      KeyConditionExpression: `${this.followeeHandleAttr} = :followee_handle`,
      ExpressionAttributeValues: { ":followee_handle": followeeHandle },
      Limit: pageSize,
    };
    if (lastFolloweeHandle !== undefined) {
      params.ExclusiveStartKey = {
        [this.followeeHandleAttr]: followeeHandle,
        [this.followerHandleAttr]: lastFolloweeHandle,
      };
    }

    const items: Follow[] = [];
    const data = await this.client.send(new QueryCommand(params));
    const hasMorePages = !!data.LastEvaluatedKey;
    data.Items?.forEach((item) => items.push(this.constructFollow(item)));

    return new DataPage<Follow>(items, hasMorePages);
  }

  /** Update the associated names in a follow relationship */
  async updateFollowNames(
    follower_handle: string,
    followee_handle: string,
    follower_name?: string,
    followee_name?: string
  ): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttrValues: Record<string, any> = {};

    if (follower_name !== undefined) {
      updateExpressions.push("follower_name = :follower_name");
      expressionAttrValues[":follower_name"] = follower_name;
    }

    if (followee_name !== undefined) {
      updateExpressions.push("followee_name = :followee_name");
      expressionAttrValues[":followee_name"] = followee_name;
    }

    if (updateExpressions.length === 0) {
      throw new Error("No attributes provided to update");
    }

    const params = {
      TableName: this.tableName,
      Key: {
        follower_handle,
        followee_handle,
      },
      UpdateExpression: "SET " + updateExpressions.join(", "),
      ExpressionAttributeValues: expressionAttrValues,
    };

    await this.client.send(new UpdateCommand(params));
  }

  /** Helper to create the key item for a Follow */
  private generateFollowItem(follow: Follow) {
    return {
      follower_handle: follow.follower_handle,
      followee_handle: follow.followee_handle,
    };
  }

  private constructFollow(item: any): Follow {
    return new Follow(
      item.follower_handle,
      item.followee_handle,
      item.follower_name,
      item.followee_name
    );
  }
}
