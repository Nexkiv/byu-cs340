import { User, AuthToken } from "tweeter-shared";
import { UserService } from "../model.service/UserService";

export interface UserItemView {
  displayErrorMessage: (message: string) => void;
}

export class UserInfoComponentPresenter {
  private userService: UserService;
  private isFollower = false;

  constructor() {
    this.userService = new UserService();
  }

  public async getIsFollowerStatus(
    authToken: AuthToken,
    user: User,
    selectedUser: User
  ): Promise<boolean> {
    return this.userService.getIsFollowerStatus(authToken, user, selectedUser);
  }

  public async getFolloweeCount(
    authToken: AuthToken,
    user: User
  ): Promise<number> {
    // TODO: Replace with the result of calling server
    return this.userService.getFolloweeCount(authToken, user);
  }

  public async getFollowerCount(
    authToken: AuthToken,
    user: User
  ): Promise<number> {
    return this.userService.getFollowerCount(authToken, user);
  }
}
