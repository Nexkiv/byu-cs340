import { StatusDto } from "tweeter-shared";

export interface StatusDAO {
  postStatus(status: StatusDto): Promise<void>;
  loadMoreStoryItems(
    alias: string,
    lastItem: StatusDto | null,
    pageSize: number
  ): Promise<[StatusDto[], boolean]>;
  loadMoreFeedItems(
    alias: string,
    lastItem: StatusDto | null,
    pageSize: number
  ): Promise<[StatusDto[], boolean]>;
}
