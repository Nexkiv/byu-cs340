import { Buffer } from "buffer";
import { AuthToken, User, FakeData } from "tweeter-shared";
import { Service } from "./Service";

export class UserService extends Service {
  public async getUser(
    authToken: AuthToken,
    alias: string
  ): Promise<User | null> {
    return await this.facade.getUser({
      token: authToken.token,
      alias: alias,
    });
  }

  public async login(
    alias: string,
    password: string
  ): Promise<[User, AuthToken]> {
    const [user, authToken] = await this.facade.login({
      alias: alias,
      password: password,
    });

    if (user === null || authToken === null) {
      throw new Error("Invalid alias or password");
    }

    return [user, authToken];
  }

  public async register(
    firstName: string,
    lastName: string,
    alias: string,
    password: string,
    userImageBytes: Uint8Array,
    imageFileExtension: string
  ): Promise<[User, AuthToken]> {
    const [user, authToken] = await this.facade.register({
      alias: alias,
      password: password,
      firstname: firstName,
      lastname: lastName,
      userImageBytes: userImageBytes,
      imageFileExtension: imageFileExtension,
    });

    if (user === null || authToken === null) {
      throw new Error("Unable to register new user.");
    }

    return [user, authToken];
  }

  public async logout(authToken: AuthToken): Promise<void> {
    await this.facade.logout({
      token: authToken.token,
    });
  }

  public async getIsFollowerStatus(
    authToken: AuthToken,
    user: User,
    selectedUser: User
  ): Promise<boolean> {
    return await this.facade.getIsFollowerStatus({
      token: authToken.token,
      user: user.dto,
      selectedUser: selectedUser.dto,
    });
  }

  public async getFolloweeCount(
    authToken: AuthToken,
    user: User
  ): Promise<number> {
    return await this.facade.getFolloweeCount({
      token: authToken.token,
      user: user.dto,
    });
  }

  public async getFollowerCount(
    authToken: AuthToken,
    user: User
  ): Promise<number> {
    return await this.facade.getFollowerCount({
      token: authToken.token,
      user: user.dto,
    });
  }

  public async follow(
    authToken: AuthToken,
    userToFollow: User
  ): Promise<[followerCount: number, followeeCount: number]> {
    return await this.facade.follow({
      token: authToken.token,
      user: userToFollow.dto,
    });
  }

  public async unfollow(
    authToken: AuthToken,
    userToUnfollow: User
  ): Promise<[followerCount: number, followeeCount: number]> {
    return await this.facade.unfollow({
      token: authToken.token,
      user: userToUnfollow.dto,
    });
  }
}
