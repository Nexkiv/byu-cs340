import { AuthToken, User } from "tweeter-shared";
import { UserItemPresenter } from "./UserItemPresenter";
import { PAGE_SIZE } from "./PagedItemPresenter";

export class FolloweePresenter extends UserItemPresenter {
  protected itemDescription(): string {
    return "load followees";
  }

  protected async getMoreItems(
    authToken: AuthToken,
    alias: string
  ): Promise<[User[], boolean]> {
    return await this.service.loadMoreFollowees(
      authToken,
      alias,
      PAGE_SIZE,
      this.lastItem
    );
  }
}
