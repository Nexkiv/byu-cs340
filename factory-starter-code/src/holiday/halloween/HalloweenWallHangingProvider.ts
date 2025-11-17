import { WallHangingProvider } from "../interface/WallHangingProvider";

export class HalloweenWallHangingProvider implements WallHangingProvider {
  getHanging(): string {
    return "spider-web";
  }
}
