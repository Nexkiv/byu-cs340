import { AuthToken, Status } from "tweeter-shared";
import { StatusItemPresenter } from "./StatusItemPresenter";
import { PAGE_SIZE } from "./PagedItemPresenter";

export class StoryPresenter extends StatusItemPresenter {
  protected itemDescription(): string {
    return "load story items";
  }

  protected async getMoreItems(
    authToken: AuthToken,
    alias: string
  ): Promise<[Status[], boolean]> {
    return await this.service.loadMoreStoryItems(
      authToken,
      alias,
      PAGE_SIZE,
      this.lastItem
    );
  }
}
