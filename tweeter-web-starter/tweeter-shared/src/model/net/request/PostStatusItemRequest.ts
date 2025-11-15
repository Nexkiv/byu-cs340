import { StatusDto } from "../../dto/StatusDto";
import { TweeterRequest } from "./TweeterRequest";

export interface PostStatusItemRequest extends TweeterRequest {
  readonly newStatus: StatusDto;
}
