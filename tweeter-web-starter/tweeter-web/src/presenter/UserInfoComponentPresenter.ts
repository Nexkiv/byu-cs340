import { User, AuthToken } from "tweeter-shared";
import { UserService } from "../model.service/UserService";
import { MessageView, Presenter, View } from "./Presenter";

export interface UserInfoComponentView extends MessageView {
  setIsFollower: (value: boolean | ((prevState: boolean) => boolean)) => void;
  setFolloweeCount: (value: number | ((prevState: number) => number)) => void;
  setFollowerCount: (value: number | ((prevState: number) => number)) => void;
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

  public async followDisplayedUser(displayedUser: User, authToken: AuthToken) {
    this.toggleFollowingUser(
      () => this.userService.follow(authToken, displayedUser),
      "Follow",
      displayedUser.name,
      true
    );
  }

  public async unfollowDisplayedUser(
    displayedUser: User,
    authToken: AuthToken
  ) {
    this.toggleFollowingUser(
      () => this.userService.unfollow(authToken, displayedUser),
      "Unfollow",
      displayedUser.name,
      false
    );
  }

  public async toggleFollowingUser(
    opperation: () => Promise<[number, number]>,
    action: string,
    name: string,
    nowFollowing: boolean
  ) {
    let toggleFollowingUserToast = "";

    await this.doFailureReportingOperation(async () => {
      this.view.setIsLoading(true);
      toggleFollowingUserToast = this.view.displayInfoMessage(
        `${action}ing ${name}...`,
        0
      );

      const [followerCount, followeeCount] = await opperation();

      this.view.setIsFollower(nowFollowing);
      this.view.setFollowerCount(followerCount);
      this.view.setFolloweeCount(followeeCount);
    }, `${action.toLowerCase()} user`);

    this.view.deleteMessage(toggleFollowingUserToast);
    this.view.setIsLoading(false);
  }
}
