import { UserDto } from "../../../dto/UserDto";
import { TweeterResponse } from "../TweeterResponse";

export interface UserResponse extends TweeterResponse {
  readonly user: UserDto | null;
}
