import { AuthenticatedTweeterRequest } from "../TweeterRequest";

export interface UserInfoRequest extends AuthenticatedTweeterRequest {
  readonly alias: string;
}
