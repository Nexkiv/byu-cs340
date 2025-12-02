import {
  SessionToken,
  FollowRequest,
  FollowResponse,
  GetFolloweeCountRequest,
  GetFolloweeCountResponse,
  GetFollowerCountRequest,
  GetFollowerCountResponse,
  GetIsFollowerStatusRequest,
  GetIsFollowerStatusResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  PagedStatusItemRequest,
  PagedStatusItemResponse,
  PagedUserItemRequest,
  PagedUserItemResponse,
  PostStatusItemRequest,
  PostStatusItemResponse,
  RegisterRequest,
  RegisterResponse,
  Status,
  StatusDto,
  UnfollowRequest,
  UnfollowResponse,
  User,
  UserDto,
  UserInfoRequest,
  UserInfoResponse,
} from "tweeter-shared";
import { ClientCommunicator } from "./ClientCommunicator";

export class ServerFacade {
  private SERVER_URL =
    "https://9platxfqc3.execute-api.us-east-1.amazonaws.com/prod";

  private clientCommunicator = new ClientCommunicator(this.SERVER_URL);

  public async getMoreFollowees(
    request: PagedUserItemRequest
  ): Promise<[User[], boolean]> {
    const response = await this.clientCommunicator.doPost<
      PagedUserItemRequest,
      PagedUserItemResponse
    >(request, "/followee/list");

    return this.handlePagedItemsResponse(
      response,
      (dto: UserDto) => User.fromDto(dto) as User,
      "No followees found"
    );
  }

  public async getMoreFollowers(
    request: PagedUserItemRequest
  ): Promise<[User[], boolean]> {
    const response = await this.clientCommunicator.doPost<
      PagedUserItemRequest,
      PagedUserItemResponse
    >(request, "/follower/list");

    return this.handlePagedItemsResponse(
      response,
      (dto: UserDto) => User.fromDto(dto) as User,
      "No followers found"
    );
  }

  public async getMoreFeedItems(
    request: PagedStatusItemRequest
  ): Promise<[Status[], boolean]> {
    const response = await this.clientCommunicator.doPost<
      PagedStatusItemRequest,
      PagedStatusItemResponse
    >(request, "/feed/list");

    return this.handlePagedItemsResponse(
      response,
      (dto: StatusDto) => Status.fromDto(dto) as Status,
      "No feed items found"
    );
  }

  public async getMoreStoryItems(
    request: PagedStatusItemRequest
  ): Promise<[Status[], boolean]> {
    const response = await this.clientCommunicator.doPost<
      PagedStatusItemRequest,
      PagedStatusItemResponse
    >(request, "/story/list");

    return this.handlePagedItemsResponse(
      response,
      (dto: StatusDto) => Status.fromDto(dto) as Status,
      "No story items found"
    );
  }

  public async postStatusItem(request: PostStatusItemRequest): Promise<void> {
    const response = await this.clientCommunicator.doPost<
      PostStatusItemRequest,
      PostStatusItemResponse
    >(request, "/status/post");

    this.handleVoidResponse(response);
  }

  public async getUser(request: UserInfoRequest): Promise<User | null> {
    const response = await this.clientCommunicator.doPost<
      UserInfoRequest,
      UserInfoResponse
    >(request, "/user/get");

    return this.handleSingleObjectResponse(
      response,
      "user",
      (dto: UserDto) => User.fromDto(dto) as User,
      "No user found"
    );
  }

  public async login(
    request: LoginRequest
  ): Promise<[User | null, SessionToken | null]> {
    const response = await this.clientCommunicator.doPost<
      LoginRequest,
      LoginResponse
    >(request, "/user/login");

    return this.handleAuthResponse(response);
  }

  public async register(
    request: RegisterRequest
  ): Promise<[User | null, SessionToken | null]> {
    const response = await this.clientCommunicator.doPost<
      RegisterRequest,
      RegisterResponse
    >(request, "/user/register");

    return this.handleAuthResponse(response);
  }

  public async logout(request: LogoutRequest): Promise<void> {
    const response = await this.clientCommunicator.doPost<
      LogoutRequest,
      LogoutResponse
    >(request, "/user/logout");

    this.handleVoidResponse(response);
  }

  public async getIsFollowerStatus(
    request: GetIsFollowerStatusRequest
  ): Promise<boolean> {
    const response = await this.clientCommunicator.doPost<
      GetIsFollowerStatusRequest,
      GetIsFollowerStatusResponse
    >(request, "/user/isfollower");

    return this.handleSimpleValueResponse(response, (r) => r.isFollower);
  }

  public async getFolloweeCount(
    request: GetFolloweeCountRequest
  ): Promise<number> {
    const response = await this.clientCommunicator.doPost<
      GetFolloweeCountRequest,
      GetFolloweeCountResponse
    >(request, "/user/numfollowees");

    return this.handleSimpleValueResponse(response, (r) => r.numFollowees);
  }

  public async getFollowerCount(
    request: GetFollowerCountRequest
  ): Promise<number> {
    const response = await this.clientCommunicator.doPost<
      GetFollowerCountRequest,
      GetFollowerCountResponse
    >(request, "/user/numfollowers");

    return this.handleSimpleValueResponse(response, (r) => r.numFollowers);
  }

  public async follow(request: FollowRequest): Promise<[number, number]> {
    const response = await this.clientCommunicator.doPost<
      FollowRequest,
      FollowResponse
    >(request, "/user/follow");

    return this.handleFollowActionResponse(response);
  }

  public async unfollow(request: FollowRequest): Promise<[number, number]> {
    const response = await this.clientCommunicator.doPost<
      UnfollowRequest,
      UnfollowResponse
    >(request, "/user/unfollow");

    return this.handleFollowActionResponse(response);
  }

  /**
   * Handles void operation responses (operations with no return value).
   * Used by: logout, postStatusItem
   * @param response - API response with success flag
   * @throws Error if the operation failed
   */
  private handleVoidResponse(response: {
    success: boolean;
    message: string | null;
  }): void {
    if (!response.success) {
      console.error(response);
      throw new Error(response.message ?? undefined);
    }
  }

  /**
   * Handles responses that extract a simple value from the response.
   * Used by: getIsFollowerStatus, getFollowerCount, getFolloweeCount
   * @template TResponse - The full API response type
   * @template TValue - The extracted value type
   * @param response - API response containing the value
   * @param extractor - Function to extract the desired value from response
   * @returns The extracted value
   * @throws Error if the operation failed
   */
  private handleSimpleValueResponse<
    TResponse extends { success: boolean; message: string | null },
    TValue
  >(response: TResponse, extractor: (response: TResponse) => TValue): TValue {
    if (response.success) {
      return extractor(response);
    } else {
      console.error(response);
      throw new Error(response.message ?? undefined);
    }
  }

  /**
   * Handles follow action responses (follow/unfollow operations).
   * Used by: follow, unfollow
   * @param response - API response with follower and followee counts
   * @returns Tuple of [followerCount, followeeCount]
   * @throws Error if the operation failed
   */
  private handleFollowActionResponse(response: {
    success: boolean;
    message: string | null;
    followerCount: number;
    followeeCount: number;
  }): [number, number] {
    if (response.success) {
      return [response.followerCount, response.followeeCount];
    } else {
      console.error(response);
      throw new Error(response.message ?? undefined);
    }
  }

  /**
   * Handles authentication responses with DTO to domain model conversion.
   * Used by: login, register
   * @param response - API response with user DTO and session token DTO
   * @returns Tuple of [User | null, SessionToken | null]
   * @throws Error if the operation failed
   */
  private handleAuthResponse(response: {
    success: boolean;
    message: string | null;
    user?: UserDto;
    token?: { tokenId: string; userId: string; expirationTime: number };
  }): [User | null, SessionToken | null] {
    // Convert DTOs to domain models
    const user: User | null =
      response.success && response.user
        ? (User.fromDto(response.user) as User)
        : null;

    const sessionToken: SessionToken | null =
      response.success && response.token
        ? (SessionToken.fromDto(response.token) as SessionToken)
        : null;

    // Handle errors
    if (response.success) {
      return [user, sessionToken];
    } else {
      console.error(response);
      throw new Error(response.message ?? undefined);
    }
  }

  /**
   * Handles responses with a single object, converting DTO to domain model.
   * Used by: getUser
   * @template TDto - The DTO type from the API
   * @template TModel - The domain model type to convert to
   * @param response - API response containing the DTO object
   * @param dtoField - Name of the field containing the DTO in the response
   * @param converter - Function to convert DTO to domain model
   * @param errorMessage - Error message if DTO is null but success is true
   * @returns The converted domain model
   * @throws Error if the operation failed or DTO is null
   */
  private handleSingleObjectResponse<TDto, TModel>(
    response: { success: boolean; message: string | null } & Record<
      string,
      any
    >,
    dtoField: string,
    converter: (dto: TDto) => TModel,
    errorMessage: string
  ): TModel {
    // Convert DTO to domain model
    const model: TModel | null =
      response.success && response[dtoField]
        ? converter(response[dtoField] as TDto)
        : null;

    // Handle errors
    if (response.success) {
      if (model == null) {
        throw new Error(errorMessage);
      } else {
        return model;
      }
    } else {
      console.error(response);
      throw new Error(response.message ?? undefined);
    }
  }

  /**
   * Handles paginated responses, converting DTO array to domain model array.
   * Used by: getMoreFollowees, getMoreFollowers, getMoreFeedItems, getMoreStoryItems
   * @template TDto - The DTO type from the API
   * @template TModel - The domain model type to convert to
   * @param response - API response with items array and hasMore flag
   * @param converter - Function to convert DTO to domain model
   * @param errorMessage - Error message if items are null but success is true
   * @returns Tuple of [converted items array, hasMore flag]
   * @throws Error if the operation failed or items are null
   */
  private handlePagedItemsResponse<TDto, TModel>(
    response: {
      success: boolean;
      message: string | null;
      items?: TDto[] | null;
      hasMore: boolean;
    },
    converter: (dto: TDto) => TModel,
    errorMessage: string
  ): [TModel[], boolean] {
    // Convert DTO array to domain model array
    const items: TModel[] | null =
      response.success && response.items
        ? response.items.map((dto) => converter(dto))
        : null;

    // Handle errors
    if (response.success) {
      if (items == null) {
        throw new Error(errorMessage);
      } else {
        return [items, response.hasMore];
      }
    } else {
      console.error(response);
      throw new Error(response.message ?? undefined);
    }
  }
}
