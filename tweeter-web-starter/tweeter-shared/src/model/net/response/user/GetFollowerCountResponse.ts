import { TweeterResponse } from "../TweeterResponse";

export interface GetFollowerCountResponse extends TweeterResponse {
  readonly numFollowers: number;
}
