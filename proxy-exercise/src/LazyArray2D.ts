import Array2D from "./Array2D";
import UsableArray2D from "./UsableArray2D";

class LazyArray2D implements Array2D {
  private fileName: string;
  private realArray: UsableArray2D | null = null;

  constructor(fileName: string) {
    this.fileName = fileName;
  }

  public set(row: number, col: number, value: number): void {
    if (this.realArray == null) {
      this.realArray = new UsableArray2D(this.fileName);
    }
    this.realArray.set(row, col, value);
  }

  public get(row: number, col: number): number {
    if (this.realArray == null) {
      this.realArray = new UsableArray2D(this.fileName);
    }
    return this.realArray.get(row, col);
  }

  public save(fileName: string): void {
    if (this.realArray == null) {
      this.realArray = new UsableArray2D(this.fileName);
    }
    this.realArray.save(fileName);
  }

  public load(fileName: string): void {
    if (this.realArray == null) {
      this.realArray = new UsableArray2D(this.fileName);
    }
    this.realArray.load(fileName);
  }
}

export default LazyArray2D;
