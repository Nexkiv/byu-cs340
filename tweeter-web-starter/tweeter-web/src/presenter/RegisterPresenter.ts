import { User, AuthToken } from "tweeter-shared";
import { UserService } from "../model.service/UserService";

export class RegisterPresenter {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  public async register(
    firstName: string,
    lastName: string,
    alias: string,
    password: string,
    userImageBytes: Uint8Array,
    imageFileExtension: string
  ): Promise<[User, AuthToken]> {
    return this.userService.register(
      firstName,
      lastName,
      alias,
      password,
      userImageBytes,
      imageFileExtension
    );
  }
}
