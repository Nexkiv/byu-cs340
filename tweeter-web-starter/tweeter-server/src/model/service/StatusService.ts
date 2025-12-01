import { StatusDto, UserDto } from "tweeter-shared";
import { Service } from "./Service";
import { StatusDAOFactory } from "../../dao/factory/StatusDAOFactory";
import { StatusDAO } from "../../dao/interface/StatusDAO";
import { FollowDAOFactory } from "../../dao/factory/FollowDAOFactory";
import { FollowDAO } from "../../dao/interface/FollowDAO";
import { UserDAOFactory } from "../../dao/factory/UserDAOFactory";
import { UserDAO } from "../../dao/interface/UserDAO";
import { v4 as uuidv4 } from "uuid";

export class StatusService extends Service {
  private statusDAO: StatusDAO;
  private followDAO: FollowDAO;
  private userDAO: UserDAO;

  constructor() {
    super();
    this.statusDAO = StatusDAOFactory.create("dynamo");
    this.followDAO = FollowDAOFactory.create("dynamo");
    this.userDAO = UserDAOFactory.create("dynamo");
  }

  public async postStatus(
    token: string,
    userId: string,
    contents: string
  ): Promise<void> {
    return this.doAuthenticatedOperation(token, async (authenticatedUserId) => {
      // Verify the authenticated user matches the userId parameter
      if (authenticatedUserId !== userId) {
        throw new Error("forbidden: Cannot post status on behalf of another user");
      }

      const statusDto: StatusDto = {
        statusId: uuidv4(),
        userId: userId,
        contents: contents,
        postTime: Date.now(),
      };

      await this.statusDAO.postStatus(statusDto);
    });
  }

  public async loadMoreStoryItems(
    token: string,
    userId: string,
    pageSize: number,
    lastItem: StatusDto | null
  ): Promise<[StatusDto[], boolean]> {
    return this.doAuthenticatedOperation(token, async (authenticatedUserId) => {
      const [statuses, hasMore] = await this.statusDAO.loadMoreStoryItems(
        userId,
        lastItem,
        pageSize
      );

      // Hydrate user data for frontend
      const hydratedStatuses = await this.hydrateUsers(statuses);

      return [hydratedStatuses, hasMore];
    });
  }

  public async loadMoreFeedItems(
    token: string,
    userId: string,
    pageSize: number,
    lastItem: StatusDto | null
  ): Promise<[StatusDto[], boolean]> {
    return this.doAuthenticatedOperation(token, async (authenticatedUserId) => {
      // Get list of users the current user follows
      const followeeUserIds = await this.getFolloweeUserIds(userId);

      if (followeeUserIds.length === 0) {
        return [[], false];
      }

      const [statuses, hasMore] = await this.statusDAO.loadMoreFeedItems(
        followeeUserIds,
        lastItem,
        pageSize
      );

      // Hydrate user data for frontend
      const hydratedStatuses = await this.hydrateUsers(statuses);

      return [hydratedStatuses, hasMore];
    });
  }

  private async getFolloweeUserIds(userId: string): Promise<string[]> {
    const userIds: string[] = [];
    let hasMore = true;
    let lastFollowTime: number | null = null;

    // Paginate through all followees
    while (hasMore) {
      const [userFollows, more] = await this.followDAO.getPageOfFollowees(
        userId,
        lastFollowTime,
        100, // Batch size
        true // activeOnly
      );

      userIds.push(...userFollows.map((uf) => uf.user.userId));
      hasMore = more;

      if (userFollows.length > 0) {
        // Use followTime from last item for proper pagination
        lastFollowTime = userFollows[userFollows.length - 1].followTime;
      }
    }

    return userIds;
  }

  /**
   * Hydrate user data for statuses (frontend requires user field populated)
   */
  private async hydrateUsers(statuses: StatusDto[]): Promise<StatusDto[]> {
    if (statuses.length === 0) {
      return statuses;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(statuses.map((s) => s.userId))];

    // Batch fetch all users
    const userMap = new Map<string, UserDto>();
    for (const userId of uniqueUserIds) {
      const user = await this.userDAO.getUserById(userId);
      if (user) {
        userMap.set(userId, user);
      }
    }

    // Return statuses with user field populated
    return statuses.map((status) => ({
      ...status,
      user: userMap.get(status.userId),
    }));
  }
}
