import { SessionToken, Status } from "tweeter-shared";
import { StatusItemPresenter } from "./StatusItemPresenter";
import { PAGE_SIZE } from "./PagedItemPresenter";

export class FeedPresenter extends StatusItemPresenter {
  protected itemDescription(): string {
    return "load feed items";
  }

  protected async getMoreItems(
    sessionToken: SessionToken,
    userId: string
  ): Promise<[Status[], boolean]> {
    return await this.service.loadMoreFeedItems(
      sessionToken,
      userId,
      PAGE_SIZE,
      this.lastItem
    );
  }
}
