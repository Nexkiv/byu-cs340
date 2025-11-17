import { UnfollowRequest, UnfollowResponse } from "tweeter-shared";
import { UserService } from "../../model/service/UserService";

export const handler = async (
  request: UnfollowRequest
): Promise<UnfollowResponse> => {
  const userService = new UserService();
  const [followerCount, followeeCount] = await userService.unfollow(
    request.token,
    request.user
  );

  return {
    success: true,
    message: null,
    followerCount: followerCount,
    followeeCount: followeeCount,
  };
};
