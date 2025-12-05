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
      console.error(`[FeedCacheBatchWriteLambda] Error:`, error);

      // Accept partial failures for eventual consistency
      console.warn(`[FeedCacheBatchWriteLambda] Accepting partial failure`);

      // Only retry for non-DynamoDB errors
      if (!(error as any).name?.includes("Dynamo")) {
        throw error;
      }
    }
  }
};
