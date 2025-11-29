import { UserDto } from "tweeter-shared";

export interface UserDAO {
  getUserById(userId: string): Promise<UserDto | undefined>;
  getUserByAlias(alias: string): Promise<UserDto | undefined>;
  createUser(user: UserDto, password: string): Promise<void>;
  checkPassword(userId: string, suppliedPassword: string): Promise<boolean>;
}
