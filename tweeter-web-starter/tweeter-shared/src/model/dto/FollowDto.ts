import { Dto } from "./Dto";

export interface FollowDto extends Dto {
  readonly followId: string;
  readonly followerUserId: string;
  readonly followeeUserId: string;
  readonly followTime: number;
  readonly unfollowTime: number | null;
}
