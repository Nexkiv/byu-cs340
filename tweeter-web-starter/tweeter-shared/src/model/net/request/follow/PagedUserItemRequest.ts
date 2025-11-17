import { UserDto } from "../../../dto/UserDto";
import { PagedItemRequest } from "../PagedItemRequest";

export interface PagedUserItemRequest extends PagedItemRequest<UserDto> {}
