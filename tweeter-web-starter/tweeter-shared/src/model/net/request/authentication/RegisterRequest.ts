import { LoginRequest } from "./LoginRequest";

export interface RegisterRequest extends LoginRequest {
  readonly firstname: string;
  readonly lastname: string;
  readonly userImageBytes: Uint8Array;
  readonly imageFileExtension: string;
}
