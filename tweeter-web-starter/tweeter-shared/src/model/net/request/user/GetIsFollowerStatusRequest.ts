import { UserDto } from "../../../dto/UserDto";
import { AuthenticatedTweeterRequest } from "../TweeterRequest";

export interface GetIsFollowerStatusRequest
  extends AuthenticatedTweeterRequest {
  readonly user: UserDto;
  readonly selectedUser: UserDto;
}
