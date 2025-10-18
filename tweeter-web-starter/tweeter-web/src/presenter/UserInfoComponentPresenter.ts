import { User, AuthToken } from "tweeter-shared";
import { UserService } from "../model.service/UserService";
import { MessageView, Presenter, View } from "./Presenter";

export interface UserInfoComponentView extends MessageView {
  setIsFollower: React.Dispatch<React.SetStateAction<boolean>>;
  setFolloweeCount: React.Dispatch<React.SetStateAction<number>>;
  setFollowerCount: React.Dispatch<React.SetStateAction<number>>;
  setIsLoading: (value: boolean | ((prevState: boolean) => boolean)) => void;
}

export class UserInfoComponentPresenter extends Presenter<UserInfoComponentView> {
  private userService: UserService;

  constructor(view: UserInfoComponentView) {
    super(view);
    this.userService = new UserService();
  }

  public async setIsFollowerStatus(
    authToken: AuthToken,
    currentUser: User,
    displayedUser: User
  ) {
    await this.doFailureReportingOperation(async () => {
      if (currentUser === displayedUser) {
        this.view.setIsFollower(false);
      } else {
        this.view.setIsFollower(
          await this.userService.getIsFollowerStatus(
            authToken!,
            currentUser!,
            displayedUser!
          )
        );
      }
    }, "determine follower status");
  }

  public async setNumbFollowees(authToken: AuthToken, displayedUser: User) {
    await this.doFailureReportingOperation(async () => {
      this.view.setFolloweeCount(
        await this.userService.getFolloweeCount(authToken, displayedUser)
      );
    }, "get followees count");
  }

  public async setNumbFollowers(authToken: AuthToken, displayedUser: User) {
    await this.doFailureReportingOperation(async () => {
      this.view.setFollowerCount(
        await this.userService.getFollowerCount(authToken, displayedUser)
      );
    }, "get followers count");
  }

  public getBaseUrl(): string {
    const segments = location.pathname.split("/@");
    return segments.length > 1 ? segments[0] : "/";
  }

  public async followedDisplayedUser(
    displayedUser: User,
    authToken: AuthToken
  ) {
    let followingUserToast = "";

    await this.doFailureReportingOperation(async () => {
      this.view.setIsLoading(true);
      followingUserToast = this.view.displayInfoMessage(
        `Following ${displayedUser.name}...`,
        0
      );

      const [followerCount, followeeCount] = await this.userService.follow(
        authToken,
        displayedUser
      );

      this.view.setIsFollower(true);
      this.view.setFollowerCount(followerCount);
      this.view.setFolloweeCount(followeeCount);
    }, "follow user");

    this.view.deleteMessage(followingUserToast);
    this.view.setIsLoading(false);
  }

  public async unfollowDisplayedUser(
    displayedUser: User,
    authToken: AuthToken
  ) {
    let unfollowingUserToast = "";

    await this.doFailureReportingOperation(async () => {
      this.view.setIsLoading(true);
      unfollowingUserToast = this.view.displayInfoMessage(
        `Unfollowing ${displayedUser.name}...`,
        0
      );

      const [followerCount, followeeCount] = await this.userService.unfollow(
        authToken,
        displayedUser
      );

      this.view.setIsFollower(false);
      this.view.setFollowerCount(followerCount);
      this.view.setFolloweeCount(followeeCount);
    }, "unfollow user");

    this.view.deleteMessage(unfollowingUserToast);
    this.view.setIsLoading(false);
  }
}
