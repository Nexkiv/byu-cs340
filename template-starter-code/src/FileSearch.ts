import * as fs from "fs";
import * as path from "path";

class FileSearch {
  private dirName: string;
  private fileRegExp: RegExp;
  private searchRegExp: RegExp;
  private recurse: boolean;

  private totalMatches: number = 0;

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

  private constructor(
    dirName: string,
    filePattern: string,
    searchPattern: string,
    recurse: boolean = false
  ) {
    this.dirName = dirName;
    this.fileRegExp = new RegExp(filePattern);
    this.searchRegExp = new RegExp(searchPattern);
    this.recurse = recurse;
  }

  private async run() {
    await this.searchDirectory(this.dirName);
    console.log();
    console.log(`TOTAL MATCHES: ${this.totalMatches}`);
  }

  private async searchDirectory(filePath: string) {
    if (!this.isDirectory(filePath)) {
      this.nonDirectory(filePath);
      return;
    }

    if (!this.isReadable(filePath)) {
      this.unreadableDirectory(filePath);
      return;
    }

    const files = fs.readdirSync(filePath);

    for (let file of files) {
      const fullPath = path.join(filePath, file);
      if (this.isFile(fullPath)) {
        if (this.isReadable(fullPath)) {
          await this.searchFile(fullPath);
        } else {
          this.unreadableFile(fullPath);
        }
      }
    }

    if (this.recurse) {
      for (let file of files) {
        const fullPath = path.join(filePath, file);
        if (this.isDirectory(fullPath)) {
          await this.searchDirectory(fullPath);
        }
      }
    }
  }

  private async searchFile(filePath: string) {
    let currentMatchCount = 0;

    if (this.fileRegExp.test(filePath)) {
      try {
        const fileContent: string = await fs.promises.readFile(
          filePath,
          "utf-8"
        );
        const lines: string[] = fileContent.split(/\r?\n/);

        lines.forEach((line) => {
          if (this.searchRegExp.test(line)) {
            if (++currentMatchCount == 1) {
              console.log();
              console.log(`FILE: ${filePath}`);
            }

            console.log(line);
            this.totalMatches++;
          }
        });
      } catch (error) {
        this.unreadableFile(filePath);
      } finally {
        if (currentMatchCount > 0) {
          console.log(`MATCHES: ${currentMatchCount}`);
        }
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

  private nonDirectory(dirName: string): void {
    console.log(`${dirName} is not a directory`);
  }

  private unreadableDirectory(dirName: string): void {
    console.log(`Directory ${dirName} is unreadable`);
  }

  private unreadableFile(fileName: string): void {
    console.log(`File ${fileName} is unreadable`);
  }
}

FileSearch.main();
