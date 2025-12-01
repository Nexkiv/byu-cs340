import {
  GetFolloweeCountRequest,
  GetFolloweeCountResponse,
} from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";

export const handler = async (
  request: GetFolloweeCountRequest
): Promise<GetFolloweeCountResponse> => {
  const followService = new FollowService();
  const numFollowees = await followService.getFolloweeCount(
    request.token,
    request.user.userId
  );

  return {
    success: true,
    message: null,
    numFollowees: numFollowees,
  };
};
