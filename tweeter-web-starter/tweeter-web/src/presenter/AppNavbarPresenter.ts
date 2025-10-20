import { AuthToken } from "tweeter-shared";
import { UserService } from "../model.service/UserService";
import { MessageView, Presenter } from "./Presenter";
import { NavigateFunction } from "react-router-dom";

export interface AppNavbarView extends MessageView {
  clearUserInfo: () => void;
  navigate: NavigateFunction;
}

export class AppNavbarPresenter extends Presenter<AppNavbarView> {
  private _service: UserService;

  constructor(view: AppNavbarView) {
    super(view);
    this._service = new UserService();
  }

  public get service() {
    return this._service;
  }

  public async logOut(authToken: AuthToken) {
    const loggingOutToastId = this.view.displayInfoMessage("Logging Out...", 0);

    await this.doFailureReportingOperation(async () => {
      await this.service.logout(authToken);

      this.view.deleteMessage(loggingOutToastId);
      this.view.clearUserInfo();
      this.view.navigate("/login");
    }, "log user out");
  }
}
