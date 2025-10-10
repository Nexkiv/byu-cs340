import { AuthToken, Status } from "tweeter-shared";
import { StatusService } from "../model.service/StatusService";

export class PostStatusPresenter {
  private statusService: StatusService;

  constructor() {
    this.statusService = new StatusService();
  }

  public async postStatus(
    authToken: AuthToken,
    newStatus: Status
  ): Promise<void> {
    return this.statusService.postStatus(authToken, newStatus);
  }
}
