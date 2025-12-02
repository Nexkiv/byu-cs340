import { LogoutRequest, LogoutResponse } from "tweeter-shared";
import { UserService } from "../../model/service/UserService";
import { buildVoidResponse } from "../LambdaHelpers";

export const handler = async (
  request: LogoutRequest
): Promise<LogoutResponse> => {
  const userService = new UserService();
  await userService.logout(request.token);

  return buildVoidResponse();
};
