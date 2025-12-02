import { UnfollowRequest, UnfollowResponse } from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";
import { buildFollowActionResponse } from "../LambdaHelpers";

export const handler = async (
  request: UnfollowRequest
): Promise<UnfollowResponse> => {
  const followService = new FollowService();

  const [followerCount, followeeCount] = await followService.unfollow(
    request.token,
    request.user.userId
  );

  return buildFollowActionResponse(followerCount, followeeCount);
};
