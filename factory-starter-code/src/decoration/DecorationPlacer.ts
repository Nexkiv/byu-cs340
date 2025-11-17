import { DecorationFactory } from "../holiday/factory/DecorationFactory";
import { TableclothPatternProvider } from "../holiday/interface/TableclothPatternProvider";
import { WallHangingProvider } from "../holiday/interface/WallHangingProvider";
import { YardOrnamentProvider } from "../holiday/interface/YardOrnamentProvider";

export class DecorationPlacer {
  private tableclothPattern: TableclothPatternProvider;
  private wallHanging: WallHangingProvider;
  private yardOrnament: YardOrnamentProvider;

  constructor(factory: DecorationFactory) {
    this.tableclothPattern = factory.createTableclothPatternProvider();
    this.wallHanging = factory.createWallHangingProvider();
    this.yardOrnament = factory.createYardOrnamentProvider();
  }

  placeDecorations(): string {
    return (
      "Everything was ready for the party. The " +
      this.yardOrnament.getOrnament() +
      " was in front of the house, the " +
      this.wallHanging.getHanging() +
      " was hanging on the wall, and the tablecloth with " +
      this.tableclothPattern.getTablecloth() +
      " was spread over the table."
    );
  }
}
