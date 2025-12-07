import { Image } from "./image.js";

/**
 * Custom error for parameter validation failures.
 * Allows CLI to distinguish parameter errors (show usage) from processing errors (don't show usage).
 *
 * TypeScript/JavaScript custom errors require:
 * 1. Extend Error class
 * 2. Set name property for better error messages
 * 3. Call super() with message
 */
export class ParameterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParameterError";
  }
}

/**
 * Note: All filter functions use optional args for additional parameters.
 * This intentionally decouples the CLI from filter-specific parameter requirements.
 * Each filter validates its own parameters rather than having main() know the details.
 * This makes the system more extensible - new filters can be added without modifying main().
 */

/**
 * Converts image to grayscale by averaging RGB channels.
 * Algorithm: grayLevel = (r + g + b) / 3
 *
 * Math.trunc() is critical - Java's integer division truncates automatically,
 * but TypeScript division returns floats.
 *
 * @param image - The image to convert
 * @param args - Optional additional parameters (unused)
 */
export function grayscale(image: Image, args?: string[]): void {
  if (args && args.length > 0) {
    throw new ParameterError("grayscale filter takes no additional parameters");
  }
  for (let x = 0; x < image.getWidth(); x++) {
    for (let y = 0; y < image.getHeight(); y++) {
      const color = image.get(x, y);

      const grayLevel = Math.trunc((color.red + color.green + color.blue) / 3);
      const clampedGray = Math.max(0, Math.min(255, grayLevel));

      color.red = clampedGray;
      color.green = clampedGray;
      color.blue = clampedGray;
    }
  }
}

/**
 * Inverts image colors (creates negative).
 * Algorithm: newValue = 255 - oldValue
 *
 * Simplest filter - no clamping needed since result is always in valid range.
 *
 * @param image - The image to invert
 * @param args - Optional additional parameters (unused)
 */
export function invert(image: Image, args?: string[]): void {
  if (args && args.length > 0) {
    throw new ParameterError("invert filter takes no additional parameters");
  }
  for (let x = 0; x < image.getWidth(); x++) {
    for (let y = 0; y < image.getHeight(); y++) {
      const color = image.get(x, y);

      color.red = 255 - color.red;
      color.green = 255 - color.green;
      color.blue = 255 - color.blue;
    }
  }
}

/**
 * Creates embossed 3D effect using difference from upper-left neighbor.
 *
 * Key details:
 * - Iterates BACKWARDS (bottom-right to top-left) to avoid overwriting needed values
 * - Edge pixels (no upper-left neighbor) become neutral gray (128)
 * - Uses channel with maximum absolute difference
 *
 * @param image - The image to emboss
 * @param args - Optional additional parameters (unused)
 */
export function emboss(image: Image, args?: string[]): void {
  if (args && args.length > 0) {
    throw new ParameterError("emboss filter takes no additional parameters");
  }
  for (let x = image.getWidth() - 1; x >= 0; x--) {
    for (let y = image.getHeight() - 1; y >= 0; y--) {
      const color = image.get(x, y);

      let diff = 0;
      if (x > 0 && y > 0) {
        const upLeftColor = image.get(x - 1, y - 1);

        const redDiff = color.red - upLeftColor.red;
        const greenDiff = color.green - upLeftColor.green;
        const blueDiff = color.blue - upLeftColor.blue;

        // Find channel with maximum absolute difference
        if (Math.abs(redDiff) > Math.abs(diff)) {
          diff = redDiff;
        }
        if (Math.abs(greenDiff) > Math.abs(diff)) {
          diff = greenDiff;
        }
        if (Math.abs(blueDiff) > Math.abs(diff)) {
          diff = blueDiff;
        }
      }

      const grayLevel = 128 + diff;
      const clampedGray = Math.max(0, Math.min(255, grayLevel));

      color.red = clampedGray;
      color.green = clampedGray;
      color.blue = clampedGray;
    }
  }
}

/**
 * Applies horizontal motion blur by averaging with N pixels to the right.
 *
 * @param image - The image to blur
 * @param args - Additional parameters: [length] where length is number of pixels to average
 *
 * Handles boundary: Math.min() prevents going past image edge.
 */
export function motionblur(image: Image, args?: string[]): void {
  // Validate required parameter
  if (!args || args.length !== 1) {
    throw new ParameterError("motionblur requires exactly one parameter: length");
  }

  const lengthStr = args[0];
  if (!lengthStr) {
    throw new ParameterError("motionblur length parameter is missing");
  }

  const length = Number(lengthStr);
  if (!Number.isInteger(length) || length < 1) {
    throw new ParameterError("motionblur length must be a positive integer");
  }

  for (let x = 0; x < image.getWidth(); x++) {
    for (let y = 0; y < image.getHeight(); y++) {
      const color = image.get(x, y);

      let redSum = color.red;
      let greenSum = color.green;
      let blueSum = color.blue;

      // Average with up to (length-1) pixels to the right
      const maxX = Math.min(image.getWidth() - 1, x + length - 1);
      for (let i = x + 1; i <= maxX; i++) {
        const neighborColor = image.get(i, y);
        redSum += neighborColor.red;
        greenSum += neighborColor.green;
        blueSum += neighborColor.blue;
      }

      // Divide by actual number of pixels averaged
      const count = maxX - x + 1;
      color.red = Math.trunc(redSum / count);
      color.green = Math.trunc(greenSum / count);
      color.blue = Math.trunc(blueSum / count);
    }
  }
}
