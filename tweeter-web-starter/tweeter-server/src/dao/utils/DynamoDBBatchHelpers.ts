import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

/**
 * Utility functions for DynamoDB batch operations.
 *
 * Design: Pure functions for batch write patterns
 * - Handles DynamoDB's 25-item batch limit automatically
 * - Generic for reusability across different item types
 * - Eliminates chunking logic duplication
 *
 * Eliminates ~15 lines of batch chunking logic in FeedCacheDAO.
 */

/**
 * Executes batch writes in chunks of 25 (DynamoDB API limit).
 * Automatically splits large batches into multiple API calls.
 *
 * Pattern Used In:
 * - FeedCacheDAO.batchAddToCache
 *
 * DynamoDB Constraint: BatchWriteCommand accepts max 25 items per request.
 * This helper automatically chunks larger arrays into 25-item batches.
 *
 * @param client - DynamoDB DocumentClient
 * @param tableName - Target table name
 * @param items - Array of items to write (any size)
 * @param buildWriteRequest - Function to convert item to DynamoDB WriteRequest
 *
 * @example
 * ```typescript
 * // Write 100 feed items (will be chunked into 4 batches of 25)
 * await executeBatchWrite(
 *   this.client,
 *   "cachedFeed",
 *   followerUserIds,  // Array of 100 userIds
 *   (userId) => ({
 *     PutRequest: {
 *       Item: {
 *         userId,
 *         postTime: status.postTime,
 *         statusId: status.statusId,
 *         contents: status.contents,
 *         // ... other fields
 *       },
 *     },
 *   })
 * );
 * ```
 */
export async function executeBatchWrite<T>(
  client: DynamoDBDocumentClient,
  tableName: string,
  items: T[],
  buildWriteRequest: (item: T) => { PutRequest: { Item: any } }
): Promise<void> {
  // DynamoDB BatchWriteCommand limit
  const BATCH_SIZE = 25;

  // Process items in chunks of 25
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    // Convert items to WriteRequests
    const writeRequests = batch.map(buildWriteRequest);

    // Execute batch write for this chunk
    await client.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: writeRequests,
        },
      })
    );
  }
}
