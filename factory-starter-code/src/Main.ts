import { DecorationPlacer } from "./decoration/DecorationPlacer";
import { EasterDecorationFactory } from "./holiday/factory/EasterDecorationFactory";

const HOLIDAY_FACTORY = new EasterDecorationFactory();

main();

function main(): void {
  let decorationPlacer = new DecorationPlacer(HOLIDAY_FACTORY);

  console.log(decorationPlacer.placeDecorations());
}
