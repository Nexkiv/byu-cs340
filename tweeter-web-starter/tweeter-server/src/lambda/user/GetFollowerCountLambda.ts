import {
  GetFollowerCountRequest,
  GetFollowerCountResponse,
} from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";
import { buildCountResponse } from "../LambdaHelpers";

export const handler = async (
  request: GetFollowerCountRequest
): Promise<GetFollowerCountResponse> => {
  const followService = new FollowService();
  const numFollowers = await followService.getFollowerCount(
    request.token,
    request.user.userId
  );

  return buildCountResponse(numFollowers, 'numFollowers');
};
