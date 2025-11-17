import { YardOrnamentProvider } from "../interface/YardOrnamentProvider";

export class EasterYardOrnamentProvider implements YardOrnamentProvider {
  getOrnament(): string {
    return '"He Lives" sign';
  }
}
