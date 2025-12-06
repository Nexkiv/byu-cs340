import { StatusDto } from "tweeter-shared";

/**
 * Queue 1 message: Triggers follower pagination and batch job creation
 */
export interface FeedCacheFanoutMessage {
  /**
   * Status DTO with user field populated (author info for denormalization)
   */
  status: StatusDto;

  /**
   * Cursor for pagination (followTime of last processed follower)
   * Null on first message, then set to continue pagination
   */
  lastFollowTime: number | null;

  /**
   * Cursor for pagination (followId of last processed follower)
   * Required for proper DynamoDB GSI pagination with followTime
   */
  lastFollowId: string | null;

  /**
   * Total number of batches published so far (for logging/metrics)
   */
  batchesPublished: number;
}
