import { AuthToken, User, FakeData } from "tweeter-shared";
import { Service } from "./Service";
import { ServerFacade } from "../net/ServerFacade";

export class FollowService extends Service {
  public async loadMoreFollowees(
    authToken: AuthToken,
    alias: string,
    pageSize: number,
    lastUser: User | null
  ): Promise<[User[], boolean]> {
    return await this.facade.getMoreFollowees({
      token: authToken.token,
      alias: alias,
      pageSize: pageSize,
      lastItem: lastUser === null ? null : lastUser.dto,
    });
  }

  public async loadMoreFollowers(
    authToken: AuthToken,
    alias: string,
    pageSize: number,
    lastUser: User | null
  ): Promise<[User[], boolean]> {
    return await this.facade.getMoreFollowers({
      token: authToken.token,
      alias: alias,
      pageSize: pageSize,
      lastItem: lastUser === null ? null : lastUser.dto,
    });
  }
}
