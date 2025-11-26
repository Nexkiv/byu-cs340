import { UserDto } from "tweeter-shared";

export interface FollowDAO {
  // Returns one page of followees for a user, start after lastItem (if provided)
  getPageOfFollowees(
    alias: string,
    lastItem: UserDto | null,
    pageSize: number
  ): Promise<[UserDto[], boolean]>;

  // Returns one page of followers for a user
  getPageOfFollowers(
    alias: string,
    lastItem: UserDto | null,
    pageSize: number
  ): Promise<[UserDto[], boolean]>;

  // Optionally: methods for creating/deleting follow records (for unfollow/follow functionality)
  follow(followerAlias: string, followeeAlias: string): Promise<void>;
  unfollow(followerAlias: string, followeeAlias: string): Promise<void>;
  isFollower(followerAlias: string, followeeAlias: string): Promise<boolean>;
  getFolloweeCount(alias: string): Promise<number>;
  getFollowerCount(alias: string): Promise<number>;
}
