import { TweeterResponse } from "../TweeterResponse";

export interface FollowResponse extends TweeterResponse {
  readonly followerCount: number;
  readonly followeeCount: number;
}
