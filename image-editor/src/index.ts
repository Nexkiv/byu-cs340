const {readFileSync, openSync, writeSync, closeSync} = require('fs');

const args: readonly string[] = process.argv.slice(2);

if (args.length < 2) {
    // The function call does not contain enough arguments
}

const inputFile: string | undefined = args[0];
const outputFile: string | undefined = args[1];