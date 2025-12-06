import { UserDto } from "../../../dto/UserDto";
import { PagedItemRequest } from "../PagedItemRequest";

/**
 * Request for paginated user follow lists (followers/followees).
 * Includes DynamoDB GSI pagination tokens for proper continuation.
 */
export interface PagedUserItemRequest extends PagedItemRequest<UserDto> {
  /**
   * Follow timestamp from last item (GSI sort key)
   * Null on first page, then set to last item's followTime for continuation
   */
  readonly lastFollowTime: number | null;

  /**
   * Follow ID from last item (table primary key)
   * Required for proper DynamoDB pagination when followTime values are identical
   */
  readonly lastFollowId: string | null;
}
