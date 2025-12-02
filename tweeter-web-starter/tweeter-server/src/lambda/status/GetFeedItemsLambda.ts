import {
  PagedStatusItemRequest,
  PagedStatusItemResponse,
} from "tweeter-shared";
import { StatusService } from "../../model/service/StatusService";
import { buildPagedResponse } from "../LambdaHelpers";

export const handler = async (
  request: PagedStatusItemRequest
): Promise<PagedStatusItemResponse> => {
  const statusService = new StatusService();
  const [items, hasMore] = await statusService.loadMoreFeedItems(
    request.token,
    request.userId,
    request.pageSize,
    request.lastItem
  );

  return buildPagedResponse(items, hasMore);
};
