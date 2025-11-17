import { TableclothPatternProvider } from "../interface/TableclothPatternProvider";
import { WallHangingProvider } from "../interface/WallHangingProvider";
import { YardOrnamentProvider } from "../interface/YardOrnamentProvider";

export interface DecorationFactory {
  createYardOrnamentProvider(): YardOrnamentProvider;
  createWallHangingProvider(): WallHangingProvider;
  createTableclothPatternProvider(): TableclothPatternProvider;
}
