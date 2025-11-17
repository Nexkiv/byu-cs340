import { UserDto } from "../../../dto/UserDto";
import { UserRequest } from "./UserRequest";

export interface GetIsFollowerStatusRequest extends UserRequest {
  readonly selectedUser: UserDto;
}
