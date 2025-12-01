import { Dto } from "./Dto";
import { UserDto } from "./UserDto";

export interface StatusDto extends Dto {
  readonly statusId: string;
  readonly userId: string;
  readonly user?: UserDto; // Optional: hydrated by service layer for frontend display
  readonly contents: string;
  readonly postTime: number;
}
