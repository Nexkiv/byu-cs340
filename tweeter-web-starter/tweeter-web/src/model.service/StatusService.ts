import { AuthToken, Status, FakeData } from "tweeter-shared";
import { Service } from "./Service";

export class StatusService extends Service {
  public async loadMoreFeedItems(
    authToken: AuthToken,
    alias: string,
    pageSize: number,
    lastStatus: Status | null
  ): Promise<[Status[], boolean]> {
    return await this.facade.getMoreFeedItems({
      token: authToken.token,
      alias: alias,
      pageSize: pageSize,
      lastItem: lastStatus === null ? null : lastStatus.dto,
    });
  }

  public async loadMoreStoryItems(
    authToken: AuthToken,
    alias: string,
    pageSize: number,
    lastStatus: Status | null
  ): Promise<[Status[], boolean]> {
    return await this.facade.getMoreStoryItems({
      token: authToken.token,
      alias: alias,
      pageSize: pageSize,
      lastItem: lastStatus === null ? null : lastStatus.dto,
    });
  }

  public async postStatus(
    authToken: AuthToken,
    newStatus: Status
  ): Promise<void> {
    await this.facade.postStatusItem({
      token: authToken.token,
      newStatus: newStatus.dto,
    });
  }
}
