import { Dto } from "./Dto";
import { UserDto } from "./UserDto";

/**
 * Composite DTO that includes both user data and follow metadata.
 * Used for paginated follow/follower lists where followTime is needed for pagination.
 */
export interface UserFollowDto extends Dto {
  readonly user: UserDto;
  readonly followTime: number;
}
