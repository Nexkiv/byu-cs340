import { PostStatusItemRequest, PostStatusItemResponse } from "tweeter-shared";
import { StatusService } from "../../model/service/StatusService";
import { buildVoidResponse } from "../LambdaHelpers";

export const handler = async (
  request: PostStatusItemRequest
): Promise<PostStatusItemResponse> => {
  const statusService = new StatusService();

  // Extract userId and contents from the StatusDto
  await statusService.postStatus(
    request.token,
    request.newStatus.userId,
    request.newStatus.contents
  );

  return buildVoidResponse();
};
