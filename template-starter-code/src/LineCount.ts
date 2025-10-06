import * as fs from "fs";
import * as path from "path";

class LineCount {
  private dirName: string;
  private fileRegExp: RegExp;
  private recurse: boolean;

  private totalLineCount: number = 0;

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

  private constructor(
    dirName: string,
    filePattern: string,
    recurse: boolean = false
  ) {
    this.dirName = dirName;
    this.fileRegExp = new RegExp(filePattern);
    this.recurse = recurse;
  }

  private async run() {
    await this.countLinesInDirectory(this.dirName);
    console.log(`TOTAL: ${this.totalLineCount}`);
  }

  private async countLinesInDirectory(filePath: string) {
    if (this.isDirectory(filePath)) {
      if (this.isReadable(filePath)) {
        const files = fs.readdirSync(filePath);

        for (let file of files) {
          const fullPath = path.join(filePath, file);
          if (this.isFile(fullPath)) {
            if (this.isReadable(fullPath)) {
              await this.countLinesInFile(fullPath);
            } else {
              console.log(`File ${fullPath} is unreadable`);
            }
          }
        }

        if (this.recurse) {
          for (let file of files) {
            const fullPath = path.join(filePath, file);
            if (this.isDirectory(fullPath)) {
              await this.countLinesInDirectory(fullPath);
            }
          }
        }
      }
    }
  }

  private async countLinesInFile(filePath: string) {
    if (this.fileRegExp.test(filePath)) {
      let currentLineCount = 0;

      try {
        const fileContent: string = await fs.promises.readFile(
          filePath,
          "utf-8"
        );

        const lines: string[] = fileContent.split(/\r?\n/);
        currentLineCount = lines.length;
        this.totalLineCount += currentLineCount;
      } catch (error) {
        console.log(`File ${filePath} is unreadable`);
      } finally {
        console.log(`${currentLineCount} ${filePath}`);
      }
    }
  }

  private isDirectory(path: string): boolean {
    try {
      return fs.statSync(path).isDirectory();
    } catch (error) {
      return false;
    }
  }

  private isFile(path: string): boolean {
    try {
      return fs.statSync(path).isFile();
    } catch (error) {
      return false;
    }
  }

  private isReadable(path: string): boolean {
    try {
      fs.accessSync(path, fs.constants.R_OK);
      return true;
    } catch (error) {
      return false;
    }
  }
}

LineCount.main();
