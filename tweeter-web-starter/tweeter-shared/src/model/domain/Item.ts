import { Dto } from "../dto/Dto";

// The instance interface
export interface Item<D extends Dto> {
  get dto(): D;
}

// The static side interface
export interface ItemStatic<D extends Dto, I extends Item<D>> {
  fromDto(dto: D | null): I | null;
}
