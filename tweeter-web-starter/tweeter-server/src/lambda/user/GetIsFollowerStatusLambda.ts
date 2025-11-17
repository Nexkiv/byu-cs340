import {
  GetIsFollowerStatusRequest,
  GetIsFollowerStatusResponse,
} from "tweeter-shared";
import { UserService } from "../../model/service/UserService";

export const handler = async (
  request: GetIsFollowerStatusRequest
): Promise<GetIsFollowerStatusResponse> => {
  const userService = new UserService();
  const isFollower = await userService.getIsFollowerStatus(
    request.token,
    request.user,
    request.selectedUser
  );

  return {
    success: true,
    message: null,
    isFollower: isFollower,
  };
};
