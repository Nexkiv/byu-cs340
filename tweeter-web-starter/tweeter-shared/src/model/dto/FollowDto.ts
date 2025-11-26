import { Dto } from "./Dto";
import { UserDto } from "./UserDto";

export interface FollowDto extends Dto {
  readonly follower: UserDto;
  readonly followee: UserDto;
}
