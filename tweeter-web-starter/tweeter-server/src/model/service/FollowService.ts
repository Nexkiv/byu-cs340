import { UserDto } from "tweeter-shared";
import { Service } from "./Service";
import { FollowDAOFactory } from "../../dao/factory/FollowDAOFactory";
import { UserDAOFactory } from "../../dao/factory/UserDAOFactory";
import { FollowDAO } from "../../dao/interface/FollowDAO";
import { UserDAO } from "../../dao/interface/UserDAO";

export class FollowService implements Service {
  private followDAO: FollowDAO;
  private userDAO: UserDAO;

  constructor() {
    this.followDAO = FollowDAOFactory.create("dynamo");
    this.userDAO = UserDAOFactory.create("dynamo");
  }

  public async loadMoreFollowees(
    token: string,
    userAlias: string,
    pageSize: number,
    lastItem: UserDto | null
  ): Promise<[UserDto[], boolean]> {
    // TODO: Validate token with future auth utility

    const user = await this.userDAO.getUserByAlias(userAlias);
    if (!user) {
      throw new Error("User not found");
    }

    // TODO: Extract lastFollowTime from pagination context
    const lastFollowTime = null;

    return await this.followDAO.getPageOfFollowees(
      user.userId,
      lastFollowTime,
      pageSize,
      true // activeOnly
    );
  }

  public async loadMoreFollowers(
    token: string,
    userAlias: string,
    pageSize: number,
    lastItem: UserDto | null
  ): Promise<[UserDto[], boolean]> {
    // TODO: Validate token with future auth utility

    const user = await this.userDAO.getUserByAlias(userAlias);
    if (!user) {
      throw new Error("User not found");
    }

    // TODO: Extract lastFollowTime from pagination context
    const lastFollowTime = null;

    return await this.followDAO.getPageOfFollowers(
      user.userId,
      lastFollowTime,
      pageSize,
      true // activeOnly
    );
  }

  public async follow(
    token: string,
    currentUser: UserDto,
    userToFollow: UserDto
  ): Promise<[followerCount: number, followeeCount: number]> {
    // TODO: Validate token with future auth utility

    await this.followDAO.follow(currentUser.userId, userToFollow.userId);

    const followerCount = await this.followDAO.getFollowerCount(userToFollow.userId);
    const followeeCount = await this.followDAO.getFolloweeCount(currentUser.userId);

    return [followerCount, followeeCount];
  }

  public async unfollow(
    token: string,
    currentUser: UserDto,
    userToUnfollow: UserDto
  ): Promise<[followerCount: number, followeeCount: number]> {
    // TODO: Validate token with future auth utility

    await this.followDAO.unfollow(currentUser.userId, userToUnfollow.userId);

    const followerCount = await this.followDAO.getFollowerCount(userToUnfollow.userId);
    const followeeCount = await this.followDAO.getFolloweeCount(currentUser.userId);

    return [followerCount, followeeCount];
  }

  public async getIsFollowerStatus(
    token: string,
    user: UserDto,
    selectedUser: UserDto
  ): Promise<boolean> {
    // TODO: Validate token with future auth utility
    return await this.followDAO.isFollower(user.userId, selectedUser.userId);
  }

  public async getFolloweeCount(token: string, user: UserDto): Promise<number> {
    // TODO: Validate token with future auth utility
    return await this.followDAO.getFolloweeCount(user.userId);
  }

  public async getFollowerCount(token: string, user: UserDto): Promise<number> {
    // TODO: Validate token with future auth utility
    return await this.followDAO.getFollowerCount(user.userId);
  }
}
