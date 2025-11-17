import { TweeterRequest, AuthenticatedTweeterRequest } from "../TweeterRequest";

export interface LoginRequest extends TweeterRequest {
  readonly alias: string;
  readonly password: string;
}

export interface LogoutRequest extends AuthenticatedTweeterRequest {}

export interface RegisterRequest extends LoginRequest {
  readonly firstname: string;
  readonly lastname: string;
  readonly userImageBytes: Uint8Array;
  readonly imageFileExtension: string;
}
