import { StatusDto } from "../../dto/StatusDto";
import { AuthenticatedTweeterRequest } from "./TweeterRequest";

export interface PostStatusItemRequest extends AuthenticatedTweeterRequest {
  readonly newStatus: StatusDto;
}
