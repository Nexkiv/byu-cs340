import { Dto } from "./Dto";

export interface UserDto extends Dto {
  readonly userId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly alias: string;
  readonly imageUrl: string;
  readonly followerCount: number;
  readonly followeeCount: number;
}
