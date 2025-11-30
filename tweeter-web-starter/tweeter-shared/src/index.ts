// All classes that should be avaialble to other modules need to exported here. export * does not work when
// uploading to lambda. Instead we have to list each export.

//
// Domain Classes
//
export { Follow } from "./model/domain/Follow";
export { PostSegment, Type } from "./model/domain/PostSegment";
export type { Item } from "./model/domain/Item";
export { Status } from "./model/domain/Status";
export { User } from "./model/domain/User";
export { AuthToken } from "./model/domain/AuthToken";

//
// DTOs
//
export type { Dto } from "./model/dto/Dto";
export type { UserDto } from "./model/dto/UserDto";
export type { StatusDto } from "./model/dto/StatusDto";
export type { AuthTokenDto } from "./model/dto/AuthTokenDto";
export type { FollowDto } from "./model/dto/FollowDto";

//
// Requests
//
export type { TweeterRequest } from "./model/net/request/TweeterRequest";
export type { PagedUserItemRequest } from "./model/net/request/follow/PagedUserItemRequest";
export type { PagedStatusItemRequest } from "./model/net/request/status/PagedStatusItemRequest";
export type { PostStatusItemRequest } from "./model/net/request/status/PostStatusItemRequest";
export type { UserInfoRequest } from "./model/net/request/user/UserInfoRequest";
export type {
  LoginRequest,
  RegisterRequest,
  LogoutRequest,
} from "./model/net/request/authentication/AuthenticationRequest";
export type { GetIsFollowerStatusRequest } from "./model/net/request/user/GetIsFollowerStatusRequest";
export type { GetFolloweeCountRequest } from "./model/net/request/user/GetFolloweeCountRequest";
export type { GetFollowerCountRequest } from "./model/net/request/user/GetFollowerCountRequest";
export type { FollowRequest } from "./model/net/request/user/FollowRequest";
export type { UnfollowRequest } from "./model/net/request/user/UnfollowRequest";

//
// Responses
//
export type { TweeterResponse } from "./model/net/response/TweeterResponse";
export type { PagedUserItemResponse } from "./model/net/response/follow/PagedUserItemResponse";
export type { PagedStatusItemResponse } from "./model/net/response/status/PagedStatusItemResponse";
export type { PostStatusItemResponse } from "./model/net/response/status/PostStatusItemResponse";
export type { UserInfoResponse } from "./model/net/response/user/UserInfoResponse";
export type { LoginResponse } from "./model/net/response/authentication/LoginResponse";
export type { RegisterResponse } from "./model/net/response/authentication/RegisterResponse";
export type { LogoutResponse } from "./model/net/response/authentication/LogoutResponse";
export type { GetIsFollowerStatusResponse } from "./model/net/response/user/GetIsFollowerStatusResponse";
export type { GetFolloweeCountResponse } from "./model/net/response/user/GetFolloweeCountResponse";
export type { GetFollowerCountResponse } from "./model/net/response/user/GetFollowerCountResponse";
export type {
  FollowResponse,
  UnfollowResponse,
} from "./model/net/response/user/FollowingActionResponse";

//
// Other
//
export { FakeData } from "./util/FakeData";
