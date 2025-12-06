import { Dto } from "../../dto/Dto";
import { AuthenticatedTweeterRequest } from "./TweeterRequest";

/**
 * Base interface for paginated requests.
 * Contains only common fields shared by all pagination types.
 */
export interface PagedItemRequest<D extends Dto>
  extends AuthenticatedTweeterRequest {
  readonly userId: string;
  readonly pageSize: number;
  readonly lastItem: D | null;
}
