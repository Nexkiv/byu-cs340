import { PagedUserItemRequest, PagedUserItemResponse } from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";
import { buildPagedResponse } from "../LambdaHelpers";

export const handler = async (
  request: PagedUserItemRequest
): Promise<PagedUserItemResponse> => {
  const followService = new FollowService();
  const [items, hasMore] = await followService.loadMoreFollowers(
    request.token,
    request.userId,
    request.pageSize,
    request.lastItem
  );

  return buildPagedResponse(items.map(item => item.user), hasMore);
};
