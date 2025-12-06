import { UserDto } from "tweeter-shared";

export interface UserDAO {
  getUserById(userId: string): Promise<UserDto | undefined>;
  getUserByAlias(alias: string): Promise<UserDto | undefined>;
  createUser(user: UserDto, password: string): Promise<void>;
  checkPassword(userId: string, suppliedPassword: string): Promise<boolean>;
  incrementFollowerCount(userId: string, delta: number): Promise<void>;
  incrementFolloweeCount(userId: string, delta: number): Promise<void>;
  batchGetUsersByIds(userIds: string[]): Promise<Map<string, UserDto>>;
}
