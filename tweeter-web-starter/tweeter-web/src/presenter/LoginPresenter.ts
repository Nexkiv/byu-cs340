import { User, AuthToken } from "tweeter-shared";
import { UserService } from "../model.service/UserService";
import { NavigateFunction } from "react-router-dom";

export interface LoginView {
  setIsLoading: (value: React.SetStateAction<boolean>) => void;
  updateUserInfo: (
    currentUser: User,
    displayedUser: User | null,
    authToken: AuthToken,
    remember: boolean
  ) => void;
  navigate: NavigateFunction;
  displayErrorMessage: (message: string) => void;
}

export class LoginPresenter {
  private userService: UserService;
  private view: LoginView;
  private originalUrl?;

  constructor(view: LoginView, originalUrl?: string) {
    this.userService = new UserService();
    this.view = view;
    this.originalUrl = originalUrl;
  }

  public checkSubmitButtonStatus(alias: string, password: string): boolean {
    return !alias || !password;
  }

  public async doLogin(alias: string, password: string, rememberMe: boolean) {
    try {
      this.view.setIsLoading(true);

      const [user, authToken] = await this.userService.login(alias, password);

      this.view.updateUserInfo(user, user, authToken, rememberMe);

      if (!!this.originalUrl) {
        this.view.navigate(this.originalUrl);
      } else {
        this.view.navigate(`/feed/${user.alias}`);
      }
    } catch (error) {
      this.view.displayErrorMessage(
        `Failed to log user in because of exception: ${error}`
      );
    } finally {
      this.view.setIsLoading(false);
    }
  }
}
