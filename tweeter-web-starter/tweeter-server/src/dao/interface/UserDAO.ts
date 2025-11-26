import { UserDto } from "tweeter-shared";

export interface UserDAO {
  getUser(alias: string): Promise<UserDto | undefined>;
  createUser(user: UserDto, password: string): Promise<void>;
  checkPassword(alias: string, suppliedPassword: string): Promise<boolean>;
}
