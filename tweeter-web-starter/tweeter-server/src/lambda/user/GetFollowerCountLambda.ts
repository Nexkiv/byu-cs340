import {
  GetFollowerCountRequest,
  GetFollowerCountResponse,
} from "tweeter-shared";
import { UserService } from "../../model/service/UserService";

export const handler = async (
  request: GetFollowerCountRequest
): Promise<GetFollowerCountResponse> => {
  const userService = new UserService();
  const numFollowers = await userService.getFollowerCount(
    request.token,
    request.user
  );

  return {
    success: true,
    message: null,
    numFollowers: numFollowers,
  };
};
