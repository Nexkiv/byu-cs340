import { StatusDto } from "tweeter-shared";

export interface FeedCacheDAO {
  /**
   * Add a post to multiple users' cached feeds (batch operation)
   * @param followerUserIds - List of follower userIds
   * @param status - The status to add (with user field populated)
   */
  batchAddToCache(followerUserIds: string[], status: StatusDto): Promise<void>;

  /**
   * Load paginated feed from cache
   * @param userId - User whose feed to load
   * @param lastItem - Last item from previous page (for pagination)
   * @param pageSize - Number of items to return
   * @returns [items, hasMore]
   */
  loadCachedFeed(
    userId: string,
    lastItem: StatusDto | null,
    pageSize: number
  ): Promise<[StatusDto[], boolean]>;

  /**
   * One-time backfill helper for migration script
   * Adds a single post to a specific user's cache
   * @param userId - Follower's userId
   * @param status - Status with user field populated
   */
  addToCache(userId: string, status: StatusDto): Promise<void>;
}
