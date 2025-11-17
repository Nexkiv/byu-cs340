import { YardOrnamentProvider } from "../interface/YardOrnamentProvider";

export class HalloweenYardOrnamentProvider implements YardOrnamentProvider {
  getOrnament(): string {
    return "jack-o-lantern";
  }
}
