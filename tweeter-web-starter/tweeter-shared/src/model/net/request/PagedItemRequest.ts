import { Dto } from "../../dto/Dto";
import { AuthenticatedTweeterRequest } from "./TweeterRequest";

export interface PagedItemRequest<D extends Dto>
  extends AuthenticatedTweeterRequest {
  readonly userId: string;
  readonly pageSize: number;
  readonly lastItem: D | null;
  readonly lastFollowTime?: number | null; // For follow pagination with followTime
}
