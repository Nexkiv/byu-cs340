import { StatusDto } from "tweeter-shared";

export interface StatusDAO {
  postStatus(status: StatusDto): Promise<void>;

  loadMoreStoryItems(
    userId: string,
    lastItem: StatusDto | null,
    pageSize: number
  ): Promise<[StatusDto[], boolean]>;

  loadMoreFeedItems(
    userIds: string[],
    lastItem: StatusDto | null,
    pageSize: number
  ): Promise<[StatusDto[], boolean]>;
}
