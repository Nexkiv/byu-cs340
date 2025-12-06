import { PagedUserItemRequest, PagedUserFollowItemResponse } from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";
import { buildPagedResponse } from "../LambdaHelpers";

export const handler = async (
  request: PagedUserItemRequest
): Promise<PagedUserFollowItemResponse> => {
  const followService = new FollowService();
  const [items, hasMore] = await followService.loadMoreFollowers(
    request.token,
    request.userId,
    request.pageSize,
    request.lastFollowTime,
    request.lastFollowId
  );

  // Return full UserFollowDto[] with pagination metadata
  return buildPagedResponse(items, hasMore);
};
