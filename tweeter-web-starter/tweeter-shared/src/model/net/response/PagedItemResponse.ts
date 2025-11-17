import { Dto } from "../../dto/Dto";
import { TweeterResponse } from "./TweeterResponse";

export interface PagedItemResponse<D extends Dto> extends TweeterResponse {
  readonly items: D[] | null;
  readonly hasMore: boolean;
}
