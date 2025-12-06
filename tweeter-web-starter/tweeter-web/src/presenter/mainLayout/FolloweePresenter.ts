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
    const [itemsWithMetadata, hasMore] = await this.service.loadMoreFollowees(
      sessionToken,
      userId,
      PAGE_SIZE,
      this.lastItem,
      this.lastFollowTime,
      this.lastFollowId
    );

    // Extract users and store pagination tokens
    const users: User[] = [];
    itemsWithMetadata.forEach(([user, followTime, followId]) => {
      users.push(user);
      this.lastFollowTime = followTime;
      this.lastFollowId = followId;
    });

    return [users, hasMore];
  }
}
