import { FeedCacheDAO } from "../interface/FeedCacheDAO";
import { StatusDto } from "tweeter-shared";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  QueryCommandInput,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

interface CachedFeedItem {
  userId: string;           // PK - Follower
  postTime: number;         // SK - Sort key
  statusId: string;
  contents: string;
  authorUserId: string;
  authorAlias: string;
  authorFirstName: string;
  authorLastName: string;
  authorImageUrl: string;
}

export class DynamoDBFeedCacheDAO implements FeedCacheDAO {
  private readonly tableName = "cachedFeed";
  private readonly client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  async addToCache(userId: string, status: StatusDto): Promise<void> {
    if (!status.user) {
      throw new Error("Status must have user field populated");
    }

    const item: CachedFeedItem = {
      userId,                           // PK: follower
      postTime: status.postTime,        // SK: for sorting
      statusId: status.statusId,
      contents: status.contents,
      authorUserId: status.userId,      // Author's ID
      authorAlias: status.user.alias,
      authorFirstName: status.user.firstName,
      authorLastName: status.user.lastName,
      authorImageUrl: status.user.imageUrl,
    };

    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: item,
    }));
  }

  async batchAddToCache(followerUserIds: string[], status: StatusDto): Promise<void> {
    if (!status.user) {
      throw new Error("Status must have user field populated");
    }

    // BatchWrite in chunks of 25 (DynamoDB limit)
    const BATCH_SIZE = 25;

    for (let i = 0; i < followerUserIds.length; i += BATCH_SIZE) {
      const batch = followerUserIds.slice(i, i + BATCH_SIZE);

      const putRequests = batch.map(userId => ({
        PutRequest: {
          Item: {
            userId,
            postTime: status.postTime,
            statusId: status.statusId,
            contents: status.contents,
            authorUserId: status.userId,
            authorAlias: status.user!.alias,
            authorFirstName: status.user!.firstName,
            authorLastName: status.user!.lastName,
            authorImageUrl: status.user!.imageUrl,
          },
        },
      }));

      await this.client.send(new BatchWriteCommand({
        RequestItems: {
          [this.tableName]: putRequests,
        },
      }));
    }
  }

  async loadCachedFeed(
    userId: string,
    lastItem: StatusDto | null,
    pageSize: number
  ): Promise<[StatusDto[], boolean]> {
    const params: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      Limit: pageSize,
      ScanIndexForward: false, // Descending by postTime (newest first)
    };

    if (lastItem) {
      params.ExclusiveStartKey = {
        userId,
        postTime: lastItem.postTime,
      };
    }

    const result = await this.client.send(new QueryCommand(params));

    // Convert CachedFeedItem to StatusDto with user field populated
    const statuses: StatusDto[] = (result.Items || []).map(item => ({
      statusId: item.statusId,
      userId: item.authorUserId,
      user: {
        userId: item.authorUserId,
        alias: item.authorAlias,
        firstName: item.authorFirstName,
        lastName: item.authorLastName,
        imageUrl: item.authorImageUrl,
      },
      contents: item.contents,
      postTime: item.postTime,
    }));

    return [statuses, !!result.LastEvaluatedKey];
  }
}
