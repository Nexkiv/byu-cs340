import { EasterTableclothPatternProvider } from "../easter/EasterTableclothPatternProvider";
import { EasterWallHangingProvider } from "../easter/EasterWallHangingProvider";
import { EasterYardOrnamentProvider } from "../easter/EasterYardOrnamentProvider";
import { DecorationFactory } from "./DecorationFactory";

export class EasterDecorationFactory implements DecorationFactory {
  createYardOrnamentProvider() {
    return new EasterYardOrnamentProvider();
  }
  createWallHangingProvider() {
    return new EasterWallHangingProvider();
  }
  createTableclothPatternProvider() {
    return new EasterTableclothPatternProvider();
  }
}
