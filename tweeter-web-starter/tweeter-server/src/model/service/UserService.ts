import { Buffer } from "buffer";
import {
  AuthToken,
  User,
  FakeData,
  UserDto,
  AuthTokenDto,
} from "tweeter-shared";
import { Service } from "./Service";
import { UserDAOFactory } from "../../dao/factory/UserDAOFactory";
import { UserDAO } from "../../dao/interface/UserDAO";
import { v4 as uuidv4 } from "uuid";

export class UserService implements Service {
  private userDAO: UserDAO;

  constructor() {
    this.userDAO = UserDAOFactory.create("dynamo");
  }

  public async getUser(token: string, alias: string): Promise<UserDto | null> {
    // TODO: Validate auth token when AuthDataDAO is integrated
    const user = await this.userDAO.getUserByAlias(alias);
    return user ?? null;
  }

  public async login(
    alias: string,
    password: string
  ): Promise<[UserDto, AuthTokenDto]> {
    // TODO: Replace with the result of calling the database
    const user = FakeData.instance.firstUser;

    if (user === null) {
      throw new Error("Invalid alias or password");
    }

    return [user.dto, FakeData.instance.authToken.dto];
  }

  public async register(
    firstName: string,
    lastName: string,
    alias: string,
    password: string,
    userImageBytes: Uint8Array,
    imageFileExtension: string
  ): Promise<[UserDto, AuthTokenDto]> {
    // Generate unique user ID
    const userId = uuidv4();

    // TODO: Upload image to S3 and get actual imageUrl
    const imageStringBase64: string =
      Buffer.from(userImageBytes).toString("base64");
    const placeholderImageUrl = `https://placeholder.com/${alias}.${imageFileExtension}`;

    // Create UserDto for new user
    const newUser: UserDto = {
      userId,
      firstName,
      lastName,
      alias,
      imageUrl: placeholderImageUrl,
    };

    // Create user in database
    await this.userDAO.createUser(newUser, password);

    // TODO: Create real auth token using AuthDataDAO
    const authToken = FakeData.instance.authToken.dto;

    return [newUser, authToken];
  }

  public async logout(token: string): Promise<void> {
    // Remove authToken from the database
  }

  public async getIsFollowerStatus(
    token: string,
    user: UserDto,
    selectedUser: UserDto
  ): Promise<boolean> {
    // TODO: Replace with the result of calling the database
    return FakeData.instance.isFollower();
  }

  public async getFolloweeCount(token: string, user: UserDto): Promise<number> {
    // TODO: Replace with the result of calling the database
    return FakeData.instance.getFolloweeCount(user.alias);
  }

  public async getFollowerCount(token: string, user: UserDto): Promise<number> {
    // TODO: Replace with the result of calling the database
    return FakeData.instance.getFollowerCount(user.alias);
  }

  public async follow(
    token: string,
    userToFollow: UserDto
  ): Promise<[followerCount: number, followeeCount: number]> {
    // Pause so we can see the follow message. Remove when connected to the database
    await new Promise((f) => setTimeout(f, 2000));

    // TODO: Call the server

    const followerCount = await this.getFollowerCount(token, userToFollow);
    const followeeCount = await this.getFolloweeCount(token, userToFollow);

    return [followerCount, followeeCount];
  }

  public async unfollow(
    token: string,
    userToUnfollow: UserDto
  ): Promise<[followerCount: number, followeeCount: number]> {
    // Pause so we can see the unfollow message. Remove when connected to the database
    await new Promise((f) => setTimeout(f, 2000));

    // TODO: Call the database

    const followerCount = await this.getFollowerCount(token, userToUnfollow);
    const followeeCount = await this.getFolloweeCount(token, userToUnfollow);

    return [followerCount, followeeCount];
  }
}
