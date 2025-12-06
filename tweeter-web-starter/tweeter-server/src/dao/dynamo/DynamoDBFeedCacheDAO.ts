import { FeedCacheDAO } from "../interface/FeedCacheDAO";
import { StatusDto } from "tweeter-shared";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { BaseDynamoDBDAO } from "../base/BaseDynamoDBDAO";
import {
  buildPaginatedQuery,
  executePaginatedQuery,
} from "../utils/DynamoDBQueryHelpers";
import { executeBatchWrite } from "../utils/DynamoDBBatchHelpers";

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
  authorFollowerCount: number;
  authorFolloweeCount: number;
}

export class DynamoDBFeedCacheDAO extends BaseDynamoDBDAO implements FeedCacheDAO {
  private readonly tableName = "cachedFeed";

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
      authorFollowerCount: status.user.followerCount,
      authorFolloweeCount: status.user.followeeCount,
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

    await executeBatchWrite(
      this.client,
      this.tableName,
      followerUserIds,
      (userId) => ({
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
            authorFollowerCount: status.user!.followerCount,
            authorFolloweeCount: status.user!.followeeCount,
          },
        },
      })
    );
  }

  async loadCachedFeed(
    userId: string,
    lastItem: StatusDto | null,
    pageSize: number
  ): Promise<[StatusDto[], boolean]> {
    const params = buildPaginatedQuery<StatusDto>(
      {
        TableName: this.tableName,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
        ScanIndexForward: false, // Descending by postTime (newest first)
      },
      {
        pageSize,
        lastItem,
        buildStartKey: (item) => ({
          userId,
          postTime: item.postTime,
        }),
      }
    );

    const [items, hasMore] = await executePaginatedQuery<CachedFeedItem>(
      this.client,
      params
    );

    // Convert CachedFeedItem to StatusDto with user field populated
    const statuses: StatusDto[] = items.map(item => ({
      statusId: item.statusId,
      userId: item.authorUserId,
      user: {
        userId: item.authorUserId,
        alias: item.authorAlias,
        firstName: item.authorFirstName,
        lastName: item.authorLastName,
        imageUrl: item.authorImageUrl,
        followerCount: item.authorFollowerCount,
        followeeCount: item.authorFolloweeCount,
      },
      contents: item.contents,
      postTime: item.postTime,
    }));

    return [statuses, hasMore];
  }
}
