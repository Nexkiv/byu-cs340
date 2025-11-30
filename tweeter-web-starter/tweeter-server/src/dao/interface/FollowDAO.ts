import { UserDto, FollowDto } from "tweeter-shared";

export interface FollowDAO {
  /**
   * Get one page of followees (users that userId follows)
   * @param userId - The follower's user GUID
   * @param lastFollowTime - The follow_time of the last item from previous page
   * @param pageSize - Number of items to return
   * @param activeOnly - If true, only return follows where unfollow_time is null
   * @returns [UserDto[], hasMorePages]
   */
  getPageOfFollowees(
    userId: string,
    lastFollowTime: number | null,
    pageSize: number,
    activeOnly: boolean
  ): Promise<[UserDto[], boolean]>;

  /**
   * Get one page of followers (users that follow userId)
   */
  getPageOfFollowers(
    userId: string,
    lastFollowTime: number | null,
    pageSize: number,
    activeOnly: boolean
  ): Promise<[UserDto[], boolean]>;

  /**
   * Create a new follow relationship
   * @returns The new FollowDto record
   */
  follow(followerUserId: string, followeeUserId: string): Promise<FollowDto>;

  /**
   * Soft-delete a follow by setting unfollow_time
   */
  unfollow(followerUserId: string, followeeUserId: string): Promise<void>;

  /**
   * Check if an ACTIVE follow relationship exists
   */
  isFollower(followerUserId: string, followeeUserId: string): Promise<boolean>;

  /**
   * Count active followees (must page through all results for accuracy)
   */
  getFolloweeCount(userId: string): Promise<number>;

  /**
   * Count active followers (must page through all results for accuracy)
   */
  getFollowerCount(userId: string): Promise<number>;

  /**
   * Get follow history between two users (audit trail)
   */
  getFollowHistory(followerUserId: string, followeeUserId: string): Promise<FollowDto[]>;
}
