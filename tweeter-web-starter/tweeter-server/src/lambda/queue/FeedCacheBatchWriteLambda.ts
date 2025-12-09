import { SQSEvent } from "aws-lambda";
import { FeedCacheDAOFactory } from "../../dao/factory/FeedCacheDAOFactory";
import { FeedCacheBatchWriteMessage } from "../../model/queue/FeedCacheBatchWriteMessage";

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log(
    `[FeedCacheBatchWriteLambda] Received ${event.Records.length} messages`
  );

  const feedCacheDAO = FeedCacheDAOFactory.create("dynamo");

  for (const record of event.Records) {
    try {
      const message: FeedCacheBatchWriteMessage = JSON.parse(record.body);
      console.log(
        `[FeedCacheBatchWriteLambda] Processing batch ${message.batchNumber} with ${message.followerUserIds.length} followers`
      );

      // Validate message
      if (!message.status.user) {
        throw new Error(
          `Status ${message.status.statusId} missing user field`
        );
      }

      // Call existing DAO (handles chunking into 25-item batches)
      await feedCacheDAO.batchAddToCache(
        message.followerUserIds,
        message.status
      );

      console.log(
        `[FeedCacheBatchWriteLambda] Successfully wrote ${message.followerUserIds.length} cache entries`
      );
    } catch (error) {
      console.error(
        `[FeedCacheBatchWriteLambda] Error processing batch:`,
        error
      );

      // Log full error details for debugging
      console.error(
        `[FeedCacheBatchWriteLambda] Error name: ${(error as any).name}`
      );
      console.error(
        `[FeedCacheBatchWriteLambda] Error message: ${(error as any).message}`
      );

      // ALWAYS throw to trigger SQS retry
      // Previous bug: swallowed DynamoDB errors, causing silent failures
      throw error;
    }
  }
};
