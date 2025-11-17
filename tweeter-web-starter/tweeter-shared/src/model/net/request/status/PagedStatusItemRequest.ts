import { StatusDto } from "../../../dto/StatusDto";
import { PagedItemRequest } from "../PagedItemRequest";

export interface PagedStatusItemRequest extends PagedItemRequest<StatusDto> {}
