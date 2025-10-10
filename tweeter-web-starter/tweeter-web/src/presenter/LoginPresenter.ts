import { User, AuthToken } from "tweeter-shared";
import { UserService } from "../model.service/UserService";

export class LoginPresenter {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  public async login(
    alias: string,
    password: string
  ): Promise<[User, AuthToken]> {
    return this.userService.login(alias, password);
  }
}
