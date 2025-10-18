import { AuthToken, Status, User } from "tweeter-shared";
import { StatusService } from "../model.service/StatusService";
import { MessageView, Presenter } from "./Presenter";

export interface PostStatusView extends MessageView {
  setIsLoading: (value: boolean | ((prevState: boolean) => boolean)) => void;
  setPost: (value: string | ((prevState: string) => string)) => void;
}

export class PostStatusPresenter extends Presenter<PostStatusView> {
  private statusService: StatusService;

  constructor(view: PostStatusView) {
    super(view);
    this.statusService = new StatusService();
  }

  public checkButtonStatus(
    post: string,
    authToken: AuthToken | null,
    currentUser: User | null
  ): boolean {
    return !post.trim() || !authToken || !currentUser;
  }

  private async postStatus(
    authToken: AuthToken,
    newStatus: Status
  ): Promise<void> {
    return await this.statusService.postStatus(authToken, newStatus);
  }

  public async submitPost(
    post: string,
    currentUser: User,
    authToken: AuthToken
  ) {
    let postingStatusToastId = "";
    this.view.setIsLoading(true);

    await this.doFailureReportingOperation(async () => {
      postingStatusToastId = this.view.displayInfoMessage(
        "Posting status...",
        0
      );

      const status = new Status(post, currentUser, Date.now());

      await this.postStatus(authToken, status);

      this.view.setPost("");
      this.view.displayInfoMessage("Status posted!", 2000);
    }, "post the status");

    this.view.deleteMessage(postingStatusToastId);
    this.view.setIsLoading(false);
  }
}
