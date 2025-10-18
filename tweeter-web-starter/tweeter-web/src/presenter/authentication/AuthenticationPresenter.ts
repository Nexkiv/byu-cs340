import { NavigateFunction } from "react-router-dom";
import { User, AuthToken } from "tweeter-shared";
import { Presenter, View } from "../Presenter";

export interface AuthenticationView extends View {
  updateUserInfo: (
    currentUser: User,
    displayedUser: User | null,
    authToken: AuthToken,
    remember: boolean
  ) => void;
  setIsLoading: (value: boolean | ((prevState: boolean) => boolean)) => void;
  navigate: NavigateFunction;
}

export abstract class AuthenticationPresenter<
  V extends AuthenticationView
> extends Presenter<V> {
  public abstract checkSubmitButtonStatus(...credentials: string[]): boolean;

  public async doAuthentication(
    action: string,
    authentication: () => Promise<[User, AuthToken]>,
    rememberMe: boolean,
    originalUrl?: string
  ): Promise<void> {
    this.view.setIsLoading(true);

    await this.doFailureReportingOperation(async () => {
      const [user, authToken] = await authentication();

      this.view.updateUserInfo(user, user, authToken, rememberMe);

      if (!!originalUrl) {
        this.view.navigate(originalUrl);
      } else {
        this.view.navigate(`/feed/${user.alias}`);
      }
    }, action);

    this.view.setIsLoading(false);
  }
}
