import { Dto } from "../../dto/Dto";
import { AuthenticatedTweeterRequest } from "./TweeterRequest";

export interface PagedItemRequest<D extends Dto>
  extends AuthenticatedTweeterRequest {
  readonly alias: string;
  readonly pageSize: number;
  readonly lastItem: D | null;
}
