import { Buffer } from "buffer";
import {
  SessionToken,
  User,
  UserDto,
  SessionTokenDto,
} from "tweeter-shared";
import { Service } from "./Service";
import { UserDAOFactory } from "../../dao/factory/UserDAOFactory";
import { UserDAO } from "../../dao/interface/UserDAO";
import { ImageDAOFactory } from "../../dao/factory/ImageDAOFactory";
import { ImageDAO } from "../../dao/interface/ImageDAO";
import { v4 as uuidv4 } from "uuid";

export class UserService extends Service {
  private userDAO: UserDAO;
  private imageDAO: ImageDAO;

  constructor() {
    super();
    this.userDAO = UserDAOFactory.create("dynamo");
    this.imageDAO = ImageDAOFactory.create("s3");
  }

  public async getUser(token: string, alias: string): Promise<UserDto | null> {
    return this.doAuthenticatedOperation(token, async (userId) => {
      const user = await this.userDAO.getUserByAlias(alias);
      return user ?? null;
    });
  }

  public async login(
    alias: string,
    password: string
  ): Promise<[UserDto, SessionTokenDto]> {
    const user = await this.userDAO.getUserByAlias(alias);
    if (!user) {
      throw new Error("[Bad Request] Invalid alias or password");
    }

    const isValidPassword = await this.userDAO.checkPassword(user.userId, password);
    if (!isValidPassword) {
      throw new Error("[Bad Request] Invalid alias or password");
    }

    // Create real session token
    const sessionToken = await this.sessionDAO.createSessionToken(user.userId);

    return [user, sessionToken];
  }

  public async register(
    firstName: string,
    lastName: string,
    alias: string,
    password: string,
    userImageBytes: Uint8Array,
    imageFileExtension: string
  ): Promise<[UserDto, SessionTokenDto]> {
    // Generate unique user ID
    const userId = uuidv4();

    // Upload image to S3 and get actual imageUrl
    const imageStringBase64: string =
      Buffer.from(userImageBytes).toString("base64");
    const fileName = `${userId}.${imageFileExtension}`;
    const imageUrl = await this.imageDAO.putImage(fileName, imageStringBase64);

    // Create UserDto for new user
    const newUser: UserDto = {
      userId,
      firstName,
      lastName,
      alias,
      imageUrl: imageUrl,
    };

    // Create user in database
    await this.userDAO.createUser(newUser, password);

    // Create session token for new user
    const sessionToken = await this.sessionDAO.createSessionToken(newUser.userId);

    return [newUser, sessionToken];
  }

  public async logout(tokenId: string): Promise<void> {
    await this.sessionDAO.deleteSessionToken(tokenId);
  }
}
