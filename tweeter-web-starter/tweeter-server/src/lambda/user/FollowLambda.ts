import { FollowRequest, FollowResponse, FakeData } from "tweeter-shared";
import { FollowService } from "../../model/service/FollowService";

export const handler = async (
  request: FollowRequest
): Promise<FollowResponse> => {
  const followService = new FollowService();

  // TODO: Extract current user from token using future auth utility
  // PLACEHOLDER: Using first test user (@allen) as current user
  const currentUser = FakeData.instance.firstUser!.dto;

  const [followerCount, followeeCount] = await followService.follow(
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
