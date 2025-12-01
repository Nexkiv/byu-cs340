import { SessionToken, Status, User } from "tweeter-shared";
import { StatusService } from "../model.service/StatusService";
import { MessageView, Presenter } from "./Presenter";

export interface PostStatusView extends MessageView {
  setIsLoading: (value: boolean | ((prevState: boolean) => boolean)) => void;
  setPost: (value: string | ((prevState: string) => string)) => void;
}

export class PostStatusPresenter extends Presenter<PostStatusView> {
  private _service: StatusService;

  constructor(view: PostStatusView) {
    super(view);
    this._service = new StatusService();
  }

  public get service() {
    return this._service;
  }

  public checkButtonStatus(
    post: string,
    sessionToken: SessionToken | null,
    currentUser: User | null
  ): boolean {
    return !post.trim() || !sessionToken || !currentUser;
  }

  public async submitPost(
    post: string,
    currentUser: User,
    sessionToken: SessionToken
  ) {
    let postingStatusToastId = "";
    this.view.setIsLoading(true);

    await this.doFailureReportingOperation(async () => {
      postingStatusToastId = this.view.displayInfoMessage(
        "Posting status...",
        0
      );

      const status = new Status("new_post", currentUser.userId, post, Date.now(), currentUser);

      await this.service.postStatus(sessionToken, status);

      this.view.setPost("");
      this.view.displayInfoMessage("Status posted!", 2000);
    }, "post the status");

    this.view.deleteMessage(postingStatusToastId);
    this.view.setIsLoading(false);
  }
}
