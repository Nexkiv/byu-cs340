import { FollowRequest, FollowResponse } from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";
import { buildFollowActionResponse } from "../LambdaHelpers";

export const handler = async (
  request: FollowRequest
): Promise<FollowResponse> => {
  const followService = new FollowService();

  const [followerCount, followeeCount] = await followService.follow(
    request.token,
    request.user.userId
  );

  return buildFollowActionResponse(followerCount, followeeCount);
};
