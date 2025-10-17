import { User, AuthToken } from "tweeter-shared";
import { NavigateFunction } from "react-router-dom";
import { UserService } from "../../model.service/UserService";
import { View, Presenter } from "../Presenter";

export interface LoginView extends View {
  setIsLoading: (value: React.SetStateAction<boolean>) => void;
  updateUserInfo: (
    currentUser: User,
    displayedUser: User | null,
    authToken: AuthToken,
    remember: boolean
  ) => void;
  navigate: NavigateFunction;
}

export class LoginPresenter extends Presenter<LoginView> {
  private userService: UserService;
  private originalUrl?;

  constructor(view: LoginView, originalUrl?: string) {
    super(view);
    this.userService = new UserService();
    this.originalUrl = originalUrl;
  }

  public checkSubmitButtonStatus(alias: string, password: string): boolean {
    return !alias || !password;
  }

  public async doLogin(alias: string, password: string, rememberMe: boolean) {
    await this.doFailureReportingOperation(async () => {
      this.view.setIsLoading(true);

      const [user, authToken] = await this.userService.login(alias, password);

      this.view.updateUserInfo(user, user, authToken, rememberMe);

      if (!!this.originalUrl) {
        this.view.navigate(this.originalUrl);
      } else {
        this.view.navigate(`/feed/${user.alias}`);
      }
    }, "log user in");
    this.view.setIsLoading(false);
  }
}
