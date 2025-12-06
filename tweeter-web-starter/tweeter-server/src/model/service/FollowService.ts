import { UserDto } from "tweeter-shared";
import { Service } from "./Service";
import { FollowDAOFactory } from "../../dao/factory/FollowDAOFactory";
import { FollowDAO, UserFollowDto } from "../../dao/interface/FollowDAO";
import { UserDAOFactory } from "../../dao/factory/UserDAOFactory";

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
    lastFollowTime: number | null,
    lastFollowId: string | null
  ): Promise<[UserFollowDto[], boolean]> {
    return this.doAuthenticatedOperation(token, async (authenticatedUserId) => {
      return await this.followDAO.getPageOfFollowees(
        userId,
        lastFollowTime,
        lastFollowId,
        pageSize,
        true // activeOnly
      );
    });
  }

  public async loadMoreFollowers(
    token: string,
    userId: string,
    pageSize: number,
    lastFollowTime: number | null,
    lastFollowId: string | null
  ): Promise<[UserFollowDto[], boolean]> {
    return this.doAuthenticatedOperation(token, async (authenticatedUserId) => {
      return await this.followDAO.getPageOfFollowers(
        userId,
        lastFollowTime,
        lastFollowId,
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
    return this.doAuthenticatedOperation(token, async () => {
      const userDAO = UserDAOFactory.create("dynamo");
      const user = await userDAO.getUserById(userId);
      if (!user) throw new Error("bad-request: User not found");
      return user.followeeCount;
    });
  }

  public async getFollowerCount(token: string, userId: string): Promise<number> {
    return this.doAuthenticatedOperation(token, async () => {
      const userDAO = UserDAOFactory.create("dynamo");
      const user = await userDAO.getUserById(userId);
      if (!user) throw new Error("bad-request: User not found");
      return user.followerCount;
    });
  }
}
