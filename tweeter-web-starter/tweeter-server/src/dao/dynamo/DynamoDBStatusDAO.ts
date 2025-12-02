import { StatusDAO } from "../interface/StatusDAO";
import { StatusDto } from "tweeter-shared";
import {
  PutCommand,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { BaseDynamoDBDAO } from "../base/BaseDynamoDBDAO";
import {
  buildPaginatedQuery,
  executePaginatedQuery,
} from "../utils/DynamoDBQueryHelpers";

export class DynamoDBStatusDAO extends BaseDynamoDBDAO implements StatusDAO {
  private readonly statusTable = "status";
  private readonly userIndexName = "user_index";

  async postStatus(status: StatusDto): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.statusTable,
        Item: {
          statusId: status.statusId,
          userId: status.userId,
          contents: status.contents,
          postTime: status.postTime,
        },
      })
    );
  }

  async loadMoreStoryItems(
    userId: string,
    lastItem: StatusDto | null,
    pageSize: number
  ): Promise<[StatusDto[], boolean]> {
    const params = buildPaginatedQuery<StatusDto>(
      {
        TableName: this.statusTable,
        IndexName: this.userIndexName,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
        ScanIndexForward: false, // Newest first (descending postTime)
      },
      {
        pageSize,
        lastItem,
        buildStartKey: (item) => ({
          userId: userId,
          postTime: item.postTime,
          statusId: item.statusId,
        }),
      }
    );

    return executePaginatedQuery<StatusDto>(this.client, params);
  }

  async loadMoreFeedItems(
    userIds: string[],
    lastItem: StatusDto | null,
    pageSize: number
  ): Promise<[StatusDto[], boolean]> {
    // Query each user's posts and merge
    const allPosts: StatusDto[] = [];

    for (const userId of userIds) {
      const params: QueryCommandInput = {
        TableName: this.statusTable,
        IndexName: this.userIndexName,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
        ScanIndexForward: false,
        Limit: pageSize * 2, // Fetch extra to ensure enough after merge
      };

      const result = await this.client.send(new QueryCommand(params));
      if (result.Items) {
        allPosts.push(...(result.Items as StatusDto[]));
      }
    }

    // Sort all posts by postTime descending
    allPosts.sort((a, b) => b.postTime - a.postTime);

    // Apply pagination
    let startIndex = 0;
    if (lastItem) {
      startIndex = allPosts.findIndex(
        (p) => p.statusId === lastItem.statusId
      ) + 1;
    }

    const page = allPosts.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < allPosts.length;

    return [page, hasMore];
  }
}
