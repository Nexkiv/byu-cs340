import { Buffer } from "buffer";
import { SessionToken, User, FakeData } from "tweeter-shared";
import { Service } from "./Service";

export class UserService extends Service {
  public async getUser(
    sessionToken: SessionToken,
    alias: string
  ): Promise<User | null> {
    return await this.facade.getUser({
      token: sessionToken.tokenId,
      alias: alias,
    });
  }

  public async login(
    alias: string,
    password: string
  ): Promise<[User, SessionToken]> {
    const [user, sessionToken] = await this.facade.login({
      alias: alias,
      password: password,
    });

    if (user === null || sessionToken === null) {
      throw new Error("Invalid alias or password");
    }

    return [user, sessionToken];
  }

  public async register(
    firstName: string,
    lastName: string,
    alias: string,
    password: string,
    userImageBytes: Uint8Array,
    imageFileExtension: string
  ): Promise<[User, SessionToken]> {
    const [user, sessionToken] = await this.facade.register({
      alias: alias,
      password: password,
      firstname: firstName,
      lastname: lastName,
      userImageBytes: userImageBytes,
      imageFileExtension: imageFileExtension,
    });

    if (user === null || sessionToken === null) {
      throw new Error("Unable to register new user.");
    }

    return [user, sessionToken];
  }

  public async logout(sessionToken: SessionToken): Promise<void> {
    await this.facade.logout({
      token: sessionToken.tokenId,
    });
  }

  public async getIsFollowerStatus(
    sessionToken: SessionToken,
    user: User,
    selectedUser: User
  ): Promise<boolean> {
    return await this.facade.getIsFollowerStatus({
      token: sessionToken.tokenId,
      user: user.dto,
      selectedUser: selectedUser.dto,
    });
  }

  public async getFolloweeCount(
    sessionToken: SessionToken,
    user: User
  ): Promise<number> {
    return await this.facade.getFolloweeCount({
      token: sessionToken.tokenId,
      user: user.dto,
    });
  }

  public async getFollowerCount(
    sessionToken: SessionToken,
    user: User
  ): Promise<number> {
    return await this.facade.getFollowerCount({
      token: sessionToken.tokenId,
      user: user.dto,
    });
  }

  public async follow(
    sessionToken: SessionToken,
    userToFollow: User
  ): Promise<[followerCount: number, followeeCount: number]> {
    return await this.facade.follow({
      token: sessionToken.tokenId,
      user: userToFollow.dto,
    });
  }

  public async unfollow(
    sessionToken: SessionToken,
    userToUnfollow: User
  ): Promise<[followerCount: number, followeeCount: number]> {
    return await this.facade.unfollow({
      token: sessionToken.tokenId,
      user: userToUnfollow.dto,
    });
  }
}
