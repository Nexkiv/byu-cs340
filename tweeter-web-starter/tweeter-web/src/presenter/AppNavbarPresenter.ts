import { User, AuthToken } from "tweeter-shared";
import { UserService } from "../model.service/UserService";

export class AppNavbarPresenter {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  public async logout(authToken: AuthToken): Promise<void> {
    return this.userService.logout(authToken);
  }
}
