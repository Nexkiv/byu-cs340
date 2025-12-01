import { SessionToken, User } from "tweeter-shared";
import { PAGE_SIZE } from "./PagedItemPresenter";
import { UserItemPresenter } from "./UserItemPresenter";

export class FollowerPresenter extends UserItemPresenter {
  protected itemDescription(): string {
    return "load followers";
  }

  protected async getMoreItems(
    sessionToken: SessionToken,
    userId: string
  ): Promise<[User[], boolean]> {
    return await this.service.loadMoreFollowers(
      sessionToken,
      userId,
      PAGE_SIZE,
      this.lastItem
    );
  }
}
