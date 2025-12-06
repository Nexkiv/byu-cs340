import { UserFollowDto } from "../../../dto/UserFollowDto";
import { PagedItemResponse } from "../PagedItemResponse";

export interface PagedUserFollowItemResponse
  extends PagedItemResponse<UserFollowDto> {}
