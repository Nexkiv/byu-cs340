import { UserDto, UserInfoRequest, UserInfoResponse } from "tweeter-shared";
import { UserService } from "../../model/service/UserService";

export const handler = async (
  request: UserInfoRequest
): Promise<UserInfoResponse> => {
  const userService = new UserService();
  const user: UserDto | null = await userService.getUser(
    request.token,
    request.alias
  );

  return {
    success: true,
    message: null,
    user: user,
  };
};
