import { AuthenticatedTweeterRequest } from "./TweeterRequest";

export interface UserRequest extends AuthenticatedTweeterRequest {
  readonly alias: string;
}
