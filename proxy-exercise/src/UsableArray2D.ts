import Array2D from "./Array2D";
import * as fs from "fs";

class UsableArray2D implements Array2D {
  private array: number[][];

  constructor(fileName?: string, rows?: number, cols?: number) {
    if (rows != null && cols != null) {
      if (rows > 0 && cols > 0) {
        this.array = new Array(rows)
          .fill(null)
          .map(() => new Array(cols).fill(0));
      } else {
        throw new Error(
          "Invalid row and column sizes both must be greater than 0."
        );
      }
    } else if (fileName != null) {
      const data: string = fs.readFileSync(fileName, "utf8");
      this.array = JSON.parse(data);
    } else {
      throw new Error(
        "Invalid construction, Array2D requires either both the number of rows and cols,\
        \nor a file path to a file containing a 2D array."
      );
    }
  }

  public save(fileName: string): void {
    const data: string = JSON.stringify(this.array);
    fs.writeFileSync(fileName, data);
  }

  public load(fileName: string): void {
    const data: string = fs.readFileSync(fileName, "utf8");
    this.array = JSON.parse(data);
  }

  public set(row: number, col: number, value: number): void {
    if (this.array.length > row) {
      if (this.array[row]!.length > col) {
        this.array[row]![col]! = value;
      }
    }
  }

  public get(row: number, col: number): number {
    if (this.array.length > row) {
      if (this.array[row]!.length > col) {
        return this.array[row]![col]!;
      }
    }
    throw new Error("Invalid row or col value.");
  }
}

export default UsableArray2D;
