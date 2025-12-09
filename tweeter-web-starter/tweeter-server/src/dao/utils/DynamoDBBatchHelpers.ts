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
  const MAX_RETRIES = 3;

  // Process items in chunks of 25
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    // Convert items to WriteRequests
    let writeRequests = batch.map(buildWriteRequest);
    let retryCount = 0;

    // Retry loop for UnprocessedItems (handles DynamoDB throttling)
    while (writeRequests.length > 0 && retryCount < MAX_RETRIES) {
      const response = await client.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: writeRequests,
          },
        })
      );

      // Check for unprocessed items (throttling/capacity issues)
      const unprocessedItems = response.UnprocessedItems?.[tableName];

      if (!unprocessedItems || unprocessedItems.length === 0) {
        break; // All items written successfully
      }

      // Exponential backoff before retry (1s, 2s, 4s, max 5s)
      retryCount++;
      const backoffMs = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
      console.warn(
        `[executeBatchWrite] ${unprocessedItems.length} unprocessed items, retry ${retryCount}/${MAX_RETRIES} after ${backoffMs}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));

      // Cast unprocessed items to match our PutRequest type
      writeRequests = unprocessedItems as { PutRequest: { Item: any } }[];
    }

    // If items still unprocessed after max retries, log warning but don't throw
    // This allows partial success rather than complete batch failure
    if (writeRequests.length > 0) {
      console.error(
        `[executeBatchWrite] Failed to write ${writeRequests.length} items after ${MAX_RETRIES} retries - accepting partial failure for eventual consistency`
      );
      // Don't throw - partial success is better than complete batch loss via DLQ
    }
  }
}
