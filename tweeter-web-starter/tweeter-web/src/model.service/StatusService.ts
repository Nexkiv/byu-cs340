import { SessionToken, Status, FakeData } from "tweeter-shared";
import { Service } from "./Service";

export class StatusService extends Service {
  public async loadMoreFeedItems(
    sessionToken: SessionToken,
    userId: string,
    pageSize: number,
    lastStatus: Status | null
  ): Promise<[Status[], boolean]> {
    return await this.facade.getMoreFeedItems({
      token: sessionToken.tokenId,
      userId: userId,
      pageSize: pageSize,
      lastItem: lastStatus === null ? null : lastStatus.dto,
    });
  }

  public async loadMoreStoryItems(
    sessionToken: SessionToken,
    userId: string,
    pageSize: number,
    lastStatus: Status | null
  ): Promise<[Status[], boolean]> {
    return await this.facade.getMoreStoryItems({
      token: sessionToken.tokenId,
      userId: userId,
      pageSize: pageSize,
      lastItem: lastStatus === null ? null : lastStatus.dto,
    });
  }

  public async postStatus(
    sessionToken: SessionToken,
    newStatus: Status
  ): Promise<void> {
    await this.facade.postStatusItem({
      token: sessionToken.tokenId,
      newStatus: newStatus.dto,
    });
  }
}
