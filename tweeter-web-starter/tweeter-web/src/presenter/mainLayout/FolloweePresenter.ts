import { SessionToken, User } from "tweeter-shared";
import { UserItemPresenter } from "./UserItemPresenter";
import { PAGE_SIZE } from "./PagedItemPresenter";

export class FolloweePresenter extends UserItemPresenter {
  protected itemDescription(): string {
    return "load followees";
  }

  protected async getMoreItems(
    sessionToken: SessionToken,
    userId: string
  ): Promise<[User[], boolean]> {
    return await this.service.loadMoreFollowees(
      sessionToken,
      userId,
      PAGE_SIZE,
      this.lastItem
    );
  }
}
