import { SessionToken, Status } from "tweeter-shared";
import { StatusItemPresenter } from "./StatusItemPresenter";
import { PAGE_SIZE } from "./PagedItemPresenter";

export class StoryPresenter extends StatusItemPresenter {
  protected itemDescription(): string {
    return "load story items";
  }

  protected async getMoreItems(
    sessionToken: SessionToken,
    userId: string
  ): Promise<[Status[], boolean]> {
    return await this.service.loadMoreStoryItems(
      sessionToken,
      userId,
      PAGE_SIZE,
      this.lastItem
    );
  }
}
