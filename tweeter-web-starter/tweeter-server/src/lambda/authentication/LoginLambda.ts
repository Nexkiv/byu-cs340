import { LoginRequest, LoginResponse } from "tweeter-shared";
import { UserService } from "../../model/service/UserService";
import { buildAuthResponse } from "../LambdaHelpers";

export const handler = async (
  request: LoginRequest
): Promise<LoginResponse> => {
  const userService = new UserService();
  const [user, token] = await userService.login(
    request.alias,
    request.password
  );

  return buildAuthResponse(user, token);
};
