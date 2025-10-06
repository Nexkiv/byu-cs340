import * as fs from "fs";
import * as path from "path";
import CounterTemplate from "./CounterTemplate";

class FileSearch extends CounterTemplate {
  private searchRegExp: RegExp;

  private constructor(
    dirName: string,
    filePattern: string,
    searchPattern: string,
    recurse: boolean = false
  ) {
    super(dirName, filePattern, recurse);
    this.searchRegExp = new RegExp(searchPattern);
  }

  public static main(): void {
    let fileSearch: FileSearch;

    if (process.argv.length === 5) {
      fileSearch = new FileSearch(
        process.argv[2],
        process.argv[3],
        process.argv[4]
      );
    } else if (process.argv.length === 6 && process.argv[2].match("-r")) {
      fileSearch = new FileSearch(
        process.argv[3],
        process.argv[4],
        process.argv[5],
        true
      );
    } else {
      this.usage();
      return;
    }

    fileSearch.run();
  }

  private static usage(): void {
    console.log(
      "USAGE: npx ts-node src/FileSearch.ts {-r} <dir> <file-pattern> <search-pattern>"
    );
  }

  incrementCounter(lines: string[], filePath: string): number {
    let numFound = 0;

    lines.forEach((line) => {
      if (this.searchRegExp.test(line)) {
        if (++numFound == 1) {
          console.log();
          console.log(`FILE: ${filePath}`);
        }

        console.log(line);
      }
    });

    return numFound;
  }

  endOfFile(instancesFound: number, filePath: string): void {
    if (instancesFound > 0) {
      console.log(`MATCHES: ${instancesFound}`);
    }
  }

  outputTotal(): void {
    console.log();
    console.log(`TOTAL: ${this.totalCount}`);
  }
}

FileSearch.main();
