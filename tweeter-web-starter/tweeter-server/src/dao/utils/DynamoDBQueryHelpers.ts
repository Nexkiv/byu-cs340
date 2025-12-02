import {
  QueryCommand,
  QueryCommandInput,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

/**
 * Utility functions for common DynamoDB query patterns.
 *
 * Design: Pure functions (no state) for composability and testability
 * - All functions take client as parameter (no shared state)
 * - Generic types for type safety
 * - Follows single responsibility principle
 *
 * Eliminates ~160 lines of duplicated pagination and counting logic across 4 DAOs.
 */

/**
 * Builds a paginated query with standard pagination parameters.
 * Handles ExclusiveStartKey logic to eliminate boilerplate in DAO methods.
 *
 * Pattern Used In:
 * - StatusDAO.loadMoreStoryItems
 * - FeedCacheDAO.loadCachedFeed
 * - FollowDAO.getPageOfFollowees
 * - FollowDAO.getPageOfFollowers
 *
 * @param baseParams - Base query parameters (table, key condition, etc.) without Limit or ExclusiveStartKey
 * @param options - Pagination configuration
 * @param options.pageSize - Number of items to return
 * @param options.lastItem - Last item from previous page (null for first page)
 * @param options.buildStartKey - Function to convert lastItem to ExclusiveStartKey
 * @returns QueryCommandInput with pagination configured
 *
 * @example
 * ```typescript
 * const params = buildPaginatedQuery(
 *   {
 *     TableName: "status",
 *     IndexName: "user_index",
 *     KeyConditionExpression: "userId = :userId",
 *     ExpressionAttributeValues: { ":userId": "user-123" },
 *     ScanIndexForward: false,
 *   },
 *   {
 *     pageSize: 10,
 *     lastItem: previousPageLastItem,
 *     buildStartKey: (item) => ({ userId: item.userId, postTime: item.postTime, statusId: item.statusId }),
 *   }
 * );
 * ```
 */
export function buildPaginatedQuery<TLastItem = any>(
  baseParams: Omit<QueryCommandInput, "Limit" | "ExclusiveStartKey">,
  options: {
    pageSize: number;
    lastItem: TLastItem | null;
    buildStartKey: (lastItem: TLastItem) => Record<string, any>;
  }
): QueryCommandInput {
  const params: QueryCommandInput = {
    ...baseParams,
    Limit: options.pageSize,
  };

  // Only set ExclusiveStartKey if lastItem exists (not first page)
  if (options.lastItem) {
    params.ExclusiveStartKey = options.buildStartKey(options.lastItem);
  }

  return params;
}

/**
 * Executes a paginated query and returns items with hasMore flag.
 * Standard pagination pattern used across all paginated DAO methods.
 *
 * @param client - DynamoDB DocumentClient
 * @param params - Query parameters (typically from buildPaginatedQuery)
 * @returns Tuple of [items, hasMore] where hasMore indicates if more pages exist
 *
 * @example
 * ```typescript
 * const params = buildPaginatedQuery(...);
 * const [items, hasMore] = await executePaginatedQuery<StatusDto>(client, params);
 * return [items, hasMore];
 * ```
 */
export async function executePaginatedQuery<TItem = any>(
  client: DynamoDBDocumentClient,
  params: QueryCommandInput
): Promise<[TItem[], boolean]> {
  const result = await client.send(new QueryCommand(params));

  // Safely cast Items with fallback to empty array
  const items = (result.Items as TItem[]) ?? [];

  // Convert LastEvaluatedKey presence to boolean (hasMore flag)
  const hasMore = !!result.LastEvaluatedKey;

  return [items, hasMore];
}

/**
 * Executes a query that accumulates count across all pages.
 * Handles DynamoDB's pagination automatically with FilterExpression support.
 *
 * Pattern Used In:
 * - FollowDAO.getFollowerCount
 * - FollowDAO.getFolloweeCount
 *
 * Note: DynamoDB applies FilterExpression AFTER reading items, so pagination is required
 * to get accurate counts when filters are used.
 *
 * @param client - DynamoDB DocumentClient
 * @param baseParams - Base query parameters (without ExclusiveStartKey, which is managed internally)
 * @returns Total count across all pages
 *
 * @example
 * ```typescript
 * const count = await executeCountQuery(client, {
 *   TableName: "follow",
 *   IndexName: "followee_index",
 *   KeyConditionExpression: "followeeUserId = :userId",
 *   FilterExpression: "attribute_not_exists(unfollowTime)",
 *   ExpressionAttributeValues: { ":userId": "user-123" },
 *   Select: "COUNT",
 * });
 * ```
 */
export async function executeCountQuery(
  client: DynamoDBDocumentClient,
  baseParams: Omit<QueryCommandInput, "ExclusiveStartKey">
): Promise<number> {
  let count = 0;
  let lastEvaluatedKey: Record<string, any> | undefined = undefined;

  // Paginate through all results until no more pages
  do {
    const params: QueryCommandInput = {
      ...baseParams,
      ExclusiveStartKey: lastEvaluatedKey,
    };

    const result = await client.send(new QueryCommand(params));

    // Accumulate count from each page
    count += result.Count ?? 0;

    // Continue if more pages exist
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return count;
}

/**
 * Executes a query with filter to check existence (returns boolean).
 * Optimized for "does this exist?" queries using Select: "COUNT".
 *
 * Pattern Used In:
 * - FollowDAO.isFollower
 *
 * @param client - DynamoDB DocumentClient
 * @param params - Query parameters with FilterExpression (should include Select: "COUNT" for efficiency)
 * @returns True if at least one item matches, false otherwise
 *
 * @example
 * ```typescript
 * const isFollower = await executeExistsQuery(client, {
 *   TableName: "follow",
 *   IndexName: "follower_index",
 *   KeyConditionExpression: "followerUserId = :follower",
 *   FilterExpression: "followeeUserId = :followee AND attribute_not_exists(unfollowTime)",
 *   ExpressionAttributeValues: {
 *     ":follower": "user-123",
 *     ":followee": "user-456",
 *   },
 *   Select: "COUNT",
 * });
 * ```
 */
export async function executeExistsQuery(
  client: DynamoDBDocumentClient,
  params: QueryCommandInput
): Promise<boolean> {
  const result = await client.send(new QueryCommand(params));
  return (result.Count ?? 0) > 0;
}
