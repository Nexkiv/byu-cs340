import { StatusDto, UserDto } from "tweeter-shared";
import { Service } from "./Service";
import { StatusDAOFactory } from "../../dao/factory/StatusDAOFactory";
import { StatusDAO } from "../../dao/interface/StatusDAO";
import { FollowDAOFactory } from "../../dao/factory/FollowDAOFactory";
import { FollowDAO } from "../../dao/interface/FollowDAO";
import { UserDAOFactory } from "../../dao/factory/UserDAOFactory";
import { UserDAO } from "../../dao/interface/UserDAO";
import { FeedCacheDAOFactory } from "../../dao/factory/FeedCacheDAOFactory";
import { FeedCacheDAO } from "../../dao/interface/FeedCacheDAO";
import { v4 as uuidv4 } from "uuid";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { FeedCacheFanoutMessage } from "../queue/FeedCacheFanoutMessage";

export class StatusService extends Service {
  private statusDAO: StatusDAO;
  private followDAO: FollowDAO;
  private userDAO: UserDAO;
  private feedCacheDAO: FeedCacheDAO;
  private sqsClient: SQSClient;

  constructor() {
    super();
    this.statusDAO = StatusDAOFactory.create("dynamo");
    this.followDAO = FollowDAOFactory.create("dynamo");
    this.userDAO = UserDAOFactory.create("dynamo");
    this.feedCacheDAO = FeedCacheDAOFactory.create("dynamo");
    this.sqsClient = new SQSClient({});
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

      // Write to status table (synchronous - must complete)
      await this.statusDAO.postStatus(statusDto);

      // Publish to Queue 1 for async cache population
      await this.publishToFeedCacheFanoutQueue(statusDto);
    });
  }

  /**
   * Publishes to Queue 1 for asynchronous cache population.
   * Replaces synchronous populateFeedCache() call.
   */
  private async publishToFeedCacheFanoutQueue(
    status: StatusDto
  ): Promise<void> {
    // Get author user info for denormalization
    const author = await this.userDAO.getUserById(status.userId);
    if (!author) {
      console.error(
        `[publishToFeedCacheFanoutQueue] User not found: ${status.userId}`
      );
      throw new Error(`internal-server-error: User not found`);
    }

    // Hydrate status with author info
    const hydratedStatus: StatusDto = { ...status, user: author };

    // Build initial fanout message
    const message: FeedCacheFanoutMessage = {
      status: hydratedStatus,
      lastFollowTime: null,
      lastFollowId: null,
      batchesPublished: 0,
    };

    const queueUrl = process.env.FEED_CACHE_FANOUT_QUEUE_URL;
    if (!queueUrl) {
      console.error(
        "[publishToFeedCacheFanoutQueue] Queue URL not configured"
      );
      throw new Error("internal-server-error: Queue URL not configured");
    }

    try {
      await this.sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(message),
        })
      );

      console.log(
        `[publishToFeedCacheFanoutQueue] Published status ${status.statusId} to Queue 1`
      );
    } catch (error) {
      console.error(`[publishToFeedCacheFanoutQueue] Failed:`, error);
      // Don't throw - graceful degradation
      console.warn(
        `[publishToFeedCacheFanoutQueue] Continuing despite failure`
      );
    }
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
      // Use cached feed instead of querying all followees
      const [statuses, hasMore] = await this.feedCacheDAO.loadCachedFeed(
        userId,
        lastItem,
        pageSize
      );

      // No need to hydrate - cache already has user data denormalized
      return [statuses, hasMore];
    });
  }

  private async getFolloweeUserIds(userId: string): Promise<string[]> {
    const userIds: string[] = [];
    let hasMore = true;
    let lastFollowTime: number | null = null;
    let lastFollowId: string | null = null;

    // Paginate through all followees
    while (hasMore) {
      const [userFollows, more] = await this.followDAO.getPageOfFollowees(
        userId,
        lastFollowTime,
        lastFollowId,
        100, // Batch size
        true // activeOnly
      );

      userIds.push(...userFollows.map((uf) => uf.user.userId));
      hasMore = more;

      if (userFollows.length > 0) {
        // Use followTime and followId from last item for proper pagination
        const lastItem = userFollows[userFollows.length - 1];
        lastFollowTime = lastItem.followTime;
        lastFollowId = lastItem.followId;
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

  /**
   * Populate feed cache for all followers when a post is created
   * @deprecated Use SQS-based async fanout via publishToFeedCacheFanoutQueue() instead.
   * Kept for manual backfill scripts only.
   */
  private async populateFeedCache(status: StatusDto): Promise<void> {
    // Get author's user info for denormalization
    const author = await this.userDAO.getUserById(status.userId);
    if (!author) {
      console.error(`User not found for userId: ${status.userId}`);
      return;
    }

    // Hydrate status with author info
    const hydratedStatus = { ...status, user: author };

    // Get ALL followers of the posting user
    const followerUserIds = await this.getAllFollowerUserIds(status.userId);

    if (followerUserIds.length === 0) {
      return; // No followers, nothing to cache
    }

    // Write to cache for all followers (synchronous BatchWrite)
    await this.feedCacheDAO.batchAddToCache(followerUserIds, hydratedStatus);
  }

  /**
   * Get all follower userIds (users who follow this user)
   * @deprecated Use stream pagination in FeedCacheFanoutLambda instead.
   * Kept for manual backfill scripts only.
   */
  private async getAllFollowerUserIds(userId: string): Promise<string[]> {
    const userIds: string[] = [];
    let hasMore = true;
    let lastFollowTime: number | null = null;
    let lastFollowId: string | null = null;

    while (hasMore) {
      const [userFollows, more] = await this.followDAO.getPageOfFollowers(
        userId,
        lastFollowTime,
        lastFollowId,
        100, // Batch size
        true // activeOnly
      );

      userIds.push(...userFollows.map((uf) => uf.user.userId));
      hasMore = more;

      if (userFollows.length > 0) {
        const lastItem = userFollows[userFollows.length - 1];
        lastFollowTime = lastItem.followTime;
        lastFollowId = lastItem.followId;
      }
    }

    return userIds;
  }
}
