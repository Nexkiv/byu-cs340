import { TweeterResponse } from "../TweeterResponse";

export interface FollowingActionResponse extends TweeterResponse {
  readonly followerCount: number;
  readonly followeeCount: number;
}

export interface FollowResponse extends FollowingActionResponse {}

export interface UnfollowResponse extends FollowingActionResponse {}
