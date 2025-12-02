import { RegisterRequest, RegisterResponse } from "tweeter-shared";
import { UserService } from "../../model/service/UserService";
import { buildAuthResponse } from "../LambdaHelpers";

export const handler = async (
  request: RegisterRequest
): Promise<RegisterResponse> => {
  const userService = new UserService();
  const [user, token] = await userService.register(
    request.firstname,
    request.lastname,
    request.alias,
    request.password,
    request.userImageBytes,
    request.imageFileExtension
  );

  return buildAuthResponse(user, token);
};
