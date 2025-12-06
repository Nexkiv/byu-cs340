import { Dto } from "./Dto";
import { UserDto } from "./UserDto";

/**
 * Composite DTO that includes both user data and follow metadata.
 * Used for paginated follow/follower lists where followTime and followId are needed for DynamoDB GSI pagination.
 */
export interface UserFollowDto extends Dto {
  readonly user: UserDto;
  readonly followTime: number;
  readonly followId: string;
}
