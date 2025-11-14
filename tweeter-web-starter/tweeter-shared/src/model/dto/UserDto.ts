import { Dto } from "./Dto";

export interface UserDto extends Dto {
  readonly firstName: string;
  readonly lastName: string;
  readonly alias: string;
  readonly imageUrl: string;
}
