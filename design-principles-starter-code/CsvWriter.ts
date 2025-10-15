// 1. Explain why/how this program violates the Single Responsibility Principle
/*
 *  The functions in this method both perform their functions and do printing.
 *  The methods in this method named CsvWritter is both reading and writting the Csv
 *  Perferibly, you would want to have thw writter stick to writting.
 */

// 2. Explain how you would refactor the program to improve its design.
/*
 *  Make it so the output is only done in one spot rather than throughout.
 *  Pass in the output method for this function so it isn't hard coded to the console log
 *  I would replace all of the for range based loops with for each loops.
 *  I would improve the consistency of the use of curly braces.
 *  When I saved this file with prettier it autocorrected come janky formatting choices
 */

export class CsvWriter {
  public write(lines: string[][]) {
    for (let i = 0; i < lines.length; i++) this.writeLine(lines[i]);
  }

  private writeLine(fields: string[]) {
    if (fields.length == 0) console.log();
    else {
      this.writeField(fields[0]);

      for (let i = 1; i < fields.length; i++) {
        console.log(",");
        this.writeField(fields[i]);
      }
      console.log();
    }
  }

  private writeField(field: string) {
    if (field.indexOf(",") != -1 || field.indexOf('"') != -1)
      this.writeQuoted(field);
    else console.log(field);
  }

  private writeQuoted(field: string) {
    console.log('"');
    for (let i = 0; i < field.length; i++) {
      let c: string = field.charAt(i);
      if (c == '"') console.log('""');
      else console.log(c);
    }
    console.log('"');
  }
}
