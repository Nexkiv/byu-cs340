import { UnfollowRequest, UnfollowResponse, FakeData } from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";

export const handler = async (
  request: UnfollowRequest
): Promise<UnfollowResponse> => {
  const followService = new FollowService();

  // TODO: Extract current user from token using future auth utility
  // PLACEHOLDER: Using first test user (@allen) as current user
  const currentUser = FakeData.instance.firstUser!.dto;

  const [followerCount, followeeCount] = await followService.unfollow(
    request.token,
    currentUser,
    request.user
  );

  return {
    success: true,
    message: null,
    followerCount: followerCount,
    followeeCount: followeeCount,
  };
};
