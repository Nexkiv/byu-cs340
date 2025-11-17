import { LogoutRequest, LogoutResponse } from "tweeter-shared";
import { UserService } from "../../model/service/UserService";

export const handler = async (
  request: LogoutRequest
): Promise<LogoutResponse> => {
  const userService = new UserService();
  await userService.logout(request.token);

  return {
    success: true,
    message: null,
  };
};
