import { TableclothPatternProvider } from "../interface/TableclothPatternProvider";

export class EasterTableclothPatternProvider
  implements TableclothPatternProvider
{
  getTablecloth(): string {
    return "eggs and grass";
  }
}
