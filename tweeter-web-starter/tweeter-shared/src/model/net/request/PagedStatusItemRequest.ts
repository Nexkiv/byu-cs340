import { StatusDto } from "../../dto/StatusDto";
import { AuthenticatedTweeterRequest } from "./TweeterRequest";

export interface PagedStatusItemRequest extends AuthenticatedTweeterRequest {
  readonly userAlias: string;
  readonly pageSize: number;
  readonly lastItem: StatusDto | null;
}
