import { AuthToken, Status, User } from "tweeter-shared";
import { StatusService } from "../model.service/StatusService";

export class PostStatusPresenter {
  private statusService: StatusService;

  constructor() {
    this.statusService = new StatusService();
  }

  public checkButtonStatus(
    post: string,
    authToken: AuthToken | null,
    currentUser: User | null
  ): boolean {
    return !post.trim() || !authToken || !currentUser;
  }

  public async postStatus(
    authToken: AuthToken,
    newStatus: Status
  ): Promise<void> {
    return this.statusService.postStatus(authToken, newStatus);
  }
}
