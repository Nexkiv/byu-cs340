import { Dto } from "./Dto";

export interface AuthTokenDto extends Dto {
  readonly token: string;
  readonly timestamp: number;
}
