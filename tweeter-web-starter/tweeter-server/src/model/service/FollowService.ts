import { UserDto } from "tweeter-shared";
import { Service } from "./Service";
import { FollowDAOFactory } from "../../dao/factory/FollowDAOFactory";
import { FollowDAO, UserFollowDto } from "../../dao/interface/FollowDAO";

export class FollowService extends Service {
  private followDAO: FollowDAO;

  constructor() {
    super();
    this.followDAO = FollowDAOFactory.create("dynamo");
  }

  public async loadMoreFollowees(
    token: string,
    userId: string,
    pageSize: number,
    lastItem: UserDto | null
  ): Promise<[UserFollowDto[], boolean]> {
    return this.doAuthenticatedOperation(token, async (authenticatedUserId) => {
      // Look up followTime from lastItem if provided
      let lastFollowTime: number | null = null;
      if (lastItem) {
        const followRecord = await this.followDAO.getActiveFollow(userId, lastItem.userId);
        if (followRecord) {
          lastFollowTime = followRecord.followTime;
        }
      }

      return await this.followDAO.getPageOfFollowees(
        userId,
        lastFollowTime,
        pageSize,
        true // activeOnly
      );
    });
  }

  public async loadMoreFollowers(
    token: string,
    userId: string,
    pageSize: number,
    lastItem: UserDto | null
  ): Promise<[UserFollowDto[], boolean]> {
    return this.doAuthenticatedOperation(token, async (authenticatedUserId) => {
      // Look up followTime from lastItem if provided
      // For followers: lastItem is the follower, user is the followee
      let lastFollowTime: number | null = null;
      if (lastItem) {
        const followRecord = await this.followDAO.getActiveFollow(lastItem.userId, userId);
        if (followRecord) {
          lastFollowTime = followRecord.followTime;
        }
      }

      return await this.followDAO.getPageOfFollowers(
        userId,
        lastFollowTime,
        pageSize,
        true // activeOnly
      );
    });
  }

  public async follow(
    token: string,
    userToFollowId: string
  ): Promise<[followerCount: number, followeeCount: number]> {
    return this.doAuthenticatedOperation(token, async (currentUserId) => {
      await this.followDAO.follow(currentUserId, userToFollowId);

      // Return counts FOR the displayed user (userToFollow)
      const followerCount = await this.followDAO.getFollowerCount(userToFollowId);
      const followeeCount = await this.followDAO.getFolloweeCount(userToFollowId);

      return [followerCount, followeeCount];
    });
  }

  public async unfollow(
    token: string,
    userToUnfollowId: string
  ): Promise<[followerCount: number, followeeCount: number]> {
    return this.doAuthenticatedOperation(token, async (currentUserId) => {
      await this.followDAO.unfollow(currentUserId, userToUnfollowId);

      // Return counts FOR the displayed user (userToUnfollow)
      const followerCount = await this.followDAO.getFollowerCount(userToUnfollowId);
      const followeeCount = await this.followDAO.getFolloweeCount(userToUnfollowId);

      return [followerCount, followeeCount];
    });
  }

  public async getIsFollowerStatus(
    token: string,
    userId: string,
    selectedUserId: string
  ): Promise<boolean> {
    return this.doAuthenticatedOperation(token, async (authenticatedUserId) => {
      return await this.followDAO.isFollower(userId, selectedUserId);
    });
  }

  public async getFolloweeCount(token: string, userId: string): Promise<number> {
    return this.doAuthenticatedOperation(token, async (authenticatedUserId) => {
      return await this.followDAO.getFolloweeCount(userId);
    });
  }

  public async getFollowerCount(token: string, userId: string): Promise<number> {
    return this.doAuthenticatedOperation(token, async (authenticatedUserId) => {
      return await this.followDAO.getFollowerCount(userId);
    });
  }
}
