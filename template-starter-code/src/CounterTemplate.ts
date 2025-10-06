import * as fs from "fs";
import * as path from "path";

abstract class CounterTemplate {
  protected dirName: string;
  protected fileRegExp: RegExp;
  protected recurse: boolean;
  protected totalCount: number = 0;

  protected constructor(
    dirName: string,
    filePattern: string,
    recurse: boolean = false
  ) {
    this.dirName = dirName;
    this.fileRegExp = new RegExp(filePattern);
    this.recurse = recurse;
  }

  protected async run() {
    await this.searchDirectory(this.dirName);
    this.outputTotal();
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
    if (this.fileRegExp.test(filePath)) {
      let instancesFound = 0;
      try {
        const fileContent: string = await fs.promises.readFile(
          filePath,
          "utf-8"
        );
        const lines: string[] = fileContent.split(/\r?\n/);

        instancesFound = this.incrementCounter(lines, filePath);
        this.totalCount += instancesFound;
      } catch (error) {
        this.unreadableFile(filePath);
      } finally {
        this.endOfFile(instancesFound, filePath);
      }
    }
  }

  abstract incrementCounter(lines: string[], _filePath: string): number;
  abstract endOfFile(instancesFound: number, filepath: string): void;
  abstract outputTotal(): void;

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

export default CounterTemplate;
