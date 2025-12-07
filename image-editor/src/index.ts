import { readPPM, writePPM } from "./image.js";
import {
  grayscale,
  invert,
  emboss,
  motionblur,
  ParameterError,
} from "./image-editor.js";

/**
 * Displays usage message and exits with error code.
 */
function usage(): never {
  console.error(
    "USAGE: node dist/index.js <in-file> <out-file> <grayscale|invert|emboss|motionblur> [motion-blur-length]"
  );
  process.exit(1);
}

/**
 * Main entry point - intentionally decoupled from filter-specific requirements.
 * Filters validate their own parameters, not main().
 *
 * Key TypeScript vs Java differences:
 * - process.argv includes node path and script path, so slice(2)
 * - Array indexing returns T | undefined due to strict config
 * - Custom error types allow different handling (ParameterError shows usage)
 */
function main(): void {
  // process.argv[0] is node, process.argv[1] is script path
  // Actual arguments start at index 2
  const args = process.argv.slice(2);

  if (args.length < 3) {
    usage();
  }

  const inputFile = args[0];
  const outputFile = args[1];
  const filter = args[2];

  // TypeScript strict config requires undefined checks
  if (!inputFile || !outputFile || !filter) {
    usage();
  }

  // Extract any additional filter-specific arguments
  // Filters will validate these themselves
  const filterArgs = args.slice(3);

  // Process image with error handling
  try {
    const image = readPPM(inputFile);

    // Apply requested filter - filters handle their own parameter validation
    switch (filter) {
      case "grayscale":
      case "greyscale": // Support both spellings
        grayscale(image, filterArgs);
        break;
      case "invert":
        invert(image, filterArgs);
        break;
      case "emboss":
        emboss(image, filterArgs);
        break;
      case "motionblur":
        motionblur(image, filterArgs);
        break;
      default:
        usage();
    }

    writePPM(image, outputFile);
  } catch (error) {
    // Handle parameter errors differently from processing errors
    if (error instanceof ParameterError) {
      // Parameter errors: show error + usage
      console.error("Error:", error.message);
      console.error(); // Blank line for readability
      usage();
    } else {
      // Processing errors: just show error
      console.error("Error processing image:", error);
      process.exit(1);
    }
  }
}

main();
