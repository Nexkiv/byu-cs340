import { StatusDAO } from "../interface/StatusDAO";
import { StatusDto } from "tweeter-shared";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBFollowDAO } from "./DynamoDBFollowDAO";

export class DynamoDBStatusDAO implements StatusDAO {
  private statusTable = "status";
  private feedTable = "feed";
  private client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  private followDAO = new DynamoDBFollowDAO();

  // TODO: not working: fix functionality
  // async postStatus(status: StatusDto): Promise<void> {
  //   // 1. Post to the author's own story (statuses table)
  //   await this.client.send(
  //     new PutCommand({
  //       TableName: this.statusTable,
  //       Item: {
  //         ...status,
  //         alias: status.user.alias, // Partition key
  //         timestamp: status.timestamp, // Sort key
  //       },
  //     })
  //   );

  //   // 2. Fan-out: Get all followers author has
  //   const [followers] = await this.followDAO.getPageOfFollowers(
  //     status.user.alias,
  //     null,
  //     10000 // Arbitrary large page size
  //   );

  //   if (followers.length === 0) {
  //     return;
  //   }

  //   // 3. Batch write status to feed table for all followers
  //   const requests = followers.map((follower) => ({
  //     PutRequest: {
  //       Item: {
  //         ...status,
  //         alias: follower.alias,
  //         timestamp: status.timestamp,
  //       },
  //     },
  //   }));

  //   // DynamoDB limit: 25 items per batch
  //   for (let i = 0; i < requests.length; i += 25) {
  //     await this.client.send(
  //       new BatchWriteCommand({
  //         RequestItems: {
  //           [this.feedTable]: requests.slice(i, i + 25),
  //         },
  //       })
  //     );
  //   }
  // }

  async loadMoreStoryItems(
    alias: string,
    lastItem: StatusDto | null,
    pageSize: number
  ): Promise<[StatusDto[], boolean]> {
    const params: any = {
      TableName: this.statusTable,
      KeyConditionExpression: "alias = :alias",
      ExpressionAttributeValues: { ":alias": alias },
      Limit: pageSize,
      ScanIndexForward: false, // Latest first
    };
    if (lastItem && lastItem.timestamp) {
      params.ExclusiveStartKey = { alias, timestamp: lastItem.timestamp };
    }
    const result = await this.client.send(new QueryCommand(params));
    const storyItems: StatusDto[] = (result.Items as StatusDto[]) ?? [];
    const hasMorePages = !!result.LastEvaluatedKey;
    return [storyItems, hasMorePages];
  }

  async loadMoreFeedItems(
    alias: string,
    lastItem: StatusDto | null,
    pageSize: number
  ): Promise<[StatusDto[], boolean]> {
    const params: any = {
      TableName: "feed", // The feed table!
      KeyConditionExpression: "alias = :alias",
      ExpressionAttributeValues: { ":alias": alias },
      Limit: pageSize,
      ScanIndexForward: false, // Newest first
    };
    if (lastItem && lastItem.timestamp) {
      params.ExclusiveStartKey = {
        alias,
        timestamp: lastItem.timestamp,
      };
    }
    const result = await this.client.send(new QueryCommand(params));
    const feedItems: StatusDto[] = (result.Items ?? []) as StatusDto[];
    const hasMorePages = !!result.LastEvaluatedKey;
    return [feedItems, hasMorePages];
  }
}
