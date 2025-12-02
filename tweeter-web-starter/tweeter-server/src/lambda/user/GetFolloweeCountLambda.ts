import {
  GetFolloweeCountRequest,
  GetFolloweeCountResponse,
} from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";
import { buildCountResponse } from "../LambdaHelpers";

export const handler = async (
  request: GetFolloweeCountRequest
): Promise<GetFolloweeCountResponse> => {
  const followService = new FollowService();
  const numFollowees = await followService.getFolloweeCount(
    request.token,
    request.user.userId
  );

  return buildCountResponse(numFollowees, 'numFollowees');
};
