import { WallHangingProvider } from "../interface/WallHangingProvider";

export class EasterWallHangingProvider implements WallHangingProvider {
  getHanging(): string {
    return "painting of Jesus Christ";
  }
}
