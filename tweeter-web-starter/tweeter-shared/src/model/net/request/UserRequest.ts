import { TweeterRequest } from "./TweeterRequest";

export interface UserRequest extends TweeterRequest {
  readonly alias: string;
}
