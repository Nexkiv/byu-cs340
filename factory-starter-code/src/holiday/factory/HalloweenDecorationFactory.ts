import { HalloweenTableclothPatternProvider } from "../halloween/HalloweenTableclothPatternProvider";
import { HalloweenWallHangingProvider } from "../halloween/HalloweenWallHangingProvider";
import { HalloweenYardOrnamentProvider } from "../halloween/HalloweenYardOrnamentProvider";
import { DecorationFactory } from "./DecorationFactory";

export class HalloweenDecorationFactory implements DecorationFactory {
  createYardOrnamentProvider() {
    return new HalloweenYardOrnamentProvider();
  }
  createWallHangingProvider() {
    return new HalloweenWallHangingProvider();
  }
  createTableclothPatternProvider() {
    return new HalloweenTableclothPatternProvider();
  }
}
