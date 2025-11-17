import { UserDto } from "../../../dto/UserDto";
import { AuthenticatedTweeterRequest } from "../TweeterRequest";

export interface PagedUserItemRequest extends AuthenticatedTweeterRequest {
  readonly userAlias: string;
  readonly pageSize: number;
  readonly lastItem: UserDto | null;
}
