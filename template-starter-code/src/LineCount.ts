import * as fs from "fs";
import * as path from "path";
import CounterTemplate from "./CounterTemplate";

class LineCount extends CounterTemplate {
  public static main(): void {
    let lineCount: LineCount;

    if (process.argv.length === 4) {
      lineCount = new LineCount(process.argv[2], process.argv[3]);
    } else if (process.argv.length === 5 && process.argv[2].match("-r")) {
      lineCount = new LineCount(process.argv[3], process.argv[4], true);
    } else {
      this.usage();
      return;
    }

    lineCount.run();
  }

  private static usage(): void {
    console.log(
      "USAGE: npx ts-node src/LineCount.ts {-r} <dir> <file-pattern>"
    );
  }

  incrementCounter(lines: string[]): number {
    let numLines = 0;

    numLines = lines.length;

    return numLines;
  }

  endOfFile(instancesFound: number, filePath: string): void {
    console.log(`${instancesFound} ${filePath}`);
  }

  outputTotal(): void {
    console.log(`TOTAL: ${this.totalCount}`);
  }
}

LineCount.main();
