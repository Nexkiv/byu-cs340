import { SessionToken, User, FakeData } from "tweeter-shared";
import { Service } from "./Service";
import { ServerFacade } from "../net/ServerFacade";

export class FollowService extends Service {
  public async loadMoreFollowees(
    sessionToken: SessionToken,
    userId: string,
    pageSize: number,
    lastUser: User | null
  ): Promise<[User[], boolean]> {
    return await this.facade.getMoreFollowees({
      token: sessionToken.tokenId,
      userId: userId,
      pageSize: pageSize,
      lastItem: lastUser === null ? null : lastUser.dto,
    });
  }

  public async loadMoreFollowers(
    sessionToken: SessionToken,
    userId: string,
    pageSize: number,
    lastUser: User | null
  ): Promise<[User[], boolean]> {
    return await this.facade.getMoreFollowers({
      token: sessionToken.tokenId,
      userId: userId,
      pageSize: pageSize,
      lastItem: lastUser === null ? null : lastUser.dto,
    });
  }
}
