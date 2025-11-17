import { UserDto } from "../../../dto/UserDto";
import { AuthenticatedTweeterRequest } from "../TweeterRequest";

export interface UserRequest extends AuthenticatedTweeterRequest {
  readonly user: UserDto;
}
