import { User, SessionToken } from "tweeter-shared";
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
    sessionToken: SessionToken,
    currentUser: User,
    displayedUser: User
  ) {
    await this.doFailureReportingOperation(async () => {
      if (currentUser === displayedUser) {
        this.view.setIsFollower(false);
      } else {
        this.view.setIsFollower(
          await this.userService.getIsFollowerStatus(
            sessionToken!,
            currentUser!,
            displayedUser!
          )
        );
      }
    }, "determine follower status");
  }

  public async setNumbFollowees(sessionToken: SessionToken, displayedUser: User) {
    await this.doFailureReportingOperation(async () => {
      this.view.setFolloweeCount(
        await this.userService.getFolloweeCount(sessionToken, displayedUser)
      );
    }, "get followees count");
  }

  public async setNumbFollowers(sessionToken: SessionToken, displayedUser: User) {
    await this.doFailureReportingOperation(async () => {
      this.view.setFollowerCount(
        await this.userService.getFollowerCount(sessionToken, displayedUser)
      );
    }, "get followers count");
  }

  public getBaseUrl(): string {
    const segments = location.pathname.split("/@");
    return segments.length > 1 ? segments[0] : "/";
  }

  public async followDisplayedUser(displayedUser: User, sessionToken: SessionToken) {
    this.toggleFollowingUser(
      () => this.userService.follow(sessionToken, displayedUser),
      "Follow",
      displayedUser.name,
      true
    );
  }

  public async unfollowDisplayedUser(
    displayedUser: User,
    sessionToken: SessionToken
  ) {
    this.toggleFollowingUser(
      () => this.userService.unfollow(sessionToken, displayedUser),
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
