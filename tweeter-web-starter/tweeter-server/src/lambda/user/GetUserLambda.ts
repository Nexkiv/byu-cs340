import { UserDto, UserRequest, UserResponse } from "tweeter-shared";
import { UserService } from "../../model/service/UserService";

export const handler = async (request: UserRequest): Promise<UserResponse> => {
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
