import { User, AuthToken } from "tweeter-shared";
import { UserService } from "../model.service/UserService";
import { NavigateFunction } from "react-router-dom";
import { Presenter, View } from "./Presenter";

export interface UserNavigationHookView extends View {
  setDisplayedUser: (user: User) => void;
  navigate: NavigateFunction;
}

export class UserNavigationHookPresenter extends Presenter<UserNavigationHookView> {
  private userService: UserService = new UserService();

  private async getUser(
    authToken: AuthToken,
    alias: string
  ): Promise<User | null> {
    return await this.userService.getUser(authToken, alias);
  }

  public async navigateToUser(
    authToken: AuthToken,
    eventString: string,
    displayedUser: User,
    featurePath: string
  ): Promise<void> {
    await this.doFailureReportingOperation(async () => {
      const alias = this.extractAlias(eventString);

      const toUser = await this.getUser(authToken, alias);

      if (toUser) {
        if (!toUser.equals(displayedUser)) {
          this.view.setDisplayedUser(toUser);
          this.view.navigate(`${featurePath}/${toUser.alias}`);
        }
      }
    }, "get user");
  }

  private extractAlias(value: string): string {
    const index = value.indexOf("@");
    return value.substring(index);
  }
}
