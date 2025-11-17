import { UserDto } from "../../../dto/UserDto";
import { TweeterResponse } from "../TweeterResponse";

export interface UserInfoResponse extends TweeterResponse {
  readonly user: UserDto | null;
}
