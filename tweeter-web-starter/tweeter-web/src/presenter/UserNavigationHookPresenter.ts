import { User, AuthToken } from "tweeter-shared";
import { UserService } from "../model.service/UserService";

export class UserNavigationHookPresenter {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  public async getUser(
    authToken: AuthToken,
    alias: string
  ): Promise<User | null> {
    return await this.userService.getUser(authToken, alias);
  }
}
