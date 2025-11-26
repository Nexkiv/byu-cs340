import { AuthToken, Status } from "tweeter-shared";
import { StatusItemPresenter } from "./StatusItemPresenter";
import { PAGE_SIZE } from "./PagedItemPresenter";

export class FeedPresenter extends StatusItemPresenter {
  protected itemDescription(): string {
    return "load feed items";
  }

  protected async getMoreItems(
    authToken: AuthToken,
    alias: string
  ): Promise<[Status[], boolean]> {
    return await this.service.loadMoreFeedItems(
      authToken,
      alias,
      PAGE_SIZE,
      this.lastItem
    );
  }
}
