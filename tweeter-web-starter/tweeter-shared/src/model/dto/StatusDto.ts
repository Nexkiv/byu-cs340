import { Dto } from "./Dto";
import { UserDto } from "./UserDto";

export interface StatusDto extends Dto {
  readonly post: string;
  readonly user: UserDto;
  readonly timestamp: number;
}
