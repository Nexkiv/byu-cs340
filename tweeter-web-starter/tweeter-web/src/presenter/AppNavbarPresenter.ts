import { AuthToken } from "tweeter-shared";
import { UserService } from "../model.service/UserService";
import { NavigateFunction } from "react-router-dom";

export interface AppNavbarView {
  displayInfoMessage: (
    message: string,
    duration: number,
    bootstrapClasses?: string | undefined
  ) => string;
  displayErrorMessage: (message: string) => void;
  deleteMessage: (messageId: string) => void;
  clearUserInfo: () => void;
  navigate: NavigateFunction;
}

export class AppNavbarPresenter {
  private userService: UserService;
  private view: AppNavbarView;

  constructor(view: AppNavbarView) {
    this.userService = new UserService();
    this.view = view;
  }

  public async logOut(authToken: AuthToken) {
    const loggingOutToastId = this.view.displayInfoMessage("Logging Out...", 0);

    try {
      await this.userService.logout(authToken);

      this.view.deleteMessage(loggingOutToastId);
      this.view.clearUserInfo();
      this.view.navigate("/login");
    } catch (error) {
      this.view.displayErrorMessage(
        `Failed to log user out because of exception: ${error}`
      );
    }
  }
}
