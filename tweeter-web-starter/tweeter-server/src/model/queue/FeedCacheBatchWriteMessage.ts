import { StatusDto } from "tweeter-shared";

/**
 * Queue 2 message: Contains status + up to 100 follower IDs for batch writes
 */
export interface FeedCacheBatchWriteMessage {
  /**
   * Status DTO with user field populated (author info for denormalization)
   */
  status: StatusDto;

  /**
   * Array of follower user IDs (max 100 per message)
   * Each ID gets the status written to their cachedFeed table
   */
  followerUserIds: string[];

  /**
   * Batch sequence number (for logging and debugging)
   */
  batchNumber: number;
}
