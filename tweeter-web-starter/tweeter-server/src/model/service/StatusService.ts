import { AuthToken, Status, FakeData } from "tweeter-shared";
import { Service } from "./Service";

export class StatusService implements Service {
  public async loadMoreFeedItems(
    authToken: AuthToken,
    userAlias: string,
    pageSize: number,
    lastStatus: Status | null
  ): Promise<[Status[], boolean]> {
    // TODO: Replace with the result of calling the database
    return FakeData.instance.getPageOfStatuses(lastStatus, pageSize);
  }

  public async loadMoreStoryItems(
    authToken: AuthToken,
    userAlias: string,
    pageSize: number,
    lastStatus: Status | null
  ): Promise<[Status[], boolean]> {
    // TODO: Replace with the result of calling the database
    return FakeData.instance.getPageOfStatuses(lastStatus, pageSize);
  }

  public async postStatus(
    authToken: AuthToken,
    newStatus: Status
  ): Promise<void> {
    // Pause so we can see the logging out message. Remove when connected to the database
    await new Promise((f) => setTimeout(f, 2000));

    // TODO: Call the database to post the status
  }
}
