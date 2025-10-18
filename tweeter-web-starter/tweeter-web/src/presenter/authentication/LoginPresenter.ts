import { UserService } from "../../model.service/UserService";
import {
  AuthenticationPresenter,
  AuthenticationView,
} from "./AuthenticationPresenter";

export interface LoginView extends AuthenticationView {}

export class LoginPresenter extends AuthenticationPresenter<LoginView> {
  private userService: UserService = new UserService();
  private originalUrl?;

  constructor(view: LoginView, originalUrl?: string) {
    super(view);
    this.originalUrl = originalUrl;
  }

  public checkSubmitButtonStatus(alias: string, password: string): boolean {
    return !alias || !password;
  }

  public async doLogin(alias: string, password: string, rememberMe: boolean) {
    await this.doAuthentication(
      "log user in",
      () => this.userService.login(alias, password),
      rememberMe,
      this.originalUrl
    );
  }
}
