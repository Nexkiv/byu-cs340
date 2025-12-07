import { readFileSync, writeFileSync } from "fs";

/**
 * Represents an RGB color with values in range 0-255.
 * Uses private fields with getters/setters for validation and encapsulation.
 */
export class Color {
  private _red: number;
  private _green: number;
  private _blue: number;

  constructor(red: number, green: number, blue: number) {
    this._red = this.clamp(red);
    this._green = this.clamp(green);
    this._blue = this.clamp(blue);
  }

  /**
   * Clamps value to [0, 255] and truncates to integer.
   * Math.trunc() matches Java's integer division behavior (truncates toward zero).
   */
  private clamp(value: number): number {
    return Math.trunc(Math.max(0, Math.min(255, value)));
  }

  // Getters and setters with automatic validation
  get red(): number {
    return this._red;
  }

  set red(value: number) {
    this._red = this.clamp(value);
  }

  get green(): number {
    return this._green;
  }

  set green(value: number) {
    this._green = this.clamp(value);
  }

  get blue(): number {
    return this._blue;
  }

  set blue(value: number) {
    this._blue = this.clamp(value);
  }
}

/**
 * Represents an image as a 2D array of Color objects.
 * Java uses `Color[][]` which is simpler to initialize.
 * TypeScript requires Array.from() for proper initialization.
 */
export class Image {
  private pixels: Color[][];

  constructor(width: number, height: number) {
    // TypeScript array initialization is more verbose than Java's `new Color[width][height]`
    // Array.from() creates arrays with proper dimensions and initializes each element
    this.pixels = Array.from({ length: width }, () =>
      Array.from({ length: height }, () => new Color(0, 0, 0))
    );
  }

  getWidth(): number {
    return this.pixels.length;
  }

  getHeight(): number {
    // With noUncheckedIndexedAccess, pixels[0] returns Color[] | undefined
    // Must explicitly check for undefined to satisfy TypeScript's strict null checking
    const firstColumn = this.pixels[0];
    if (!firstColumn) throw new Error("Image has no columns");
    return firstColumn.length;
  }

  /**
   * Gets the color at position (x, y).
   * Throws error if coordinates are out of bounds.
   * TypeScript's strict config forces us to handle undefined from array access.
   */
  get(x: number, y: number): Color {
    const column = this.pixels[x];
    if (!column) throw new Error(`Column ${x} out of bounds`);

    const pixel = column[y];
    if (!pixel) throw new Error(`Row ${y} out of bounds`);

    return pixel;
  }

  /**
   * Sets the color at position (x, y).
   * Throws error if coordinates are out of bounds.
   */
  set(x: number, y: number, color: Color): void {
    const column = this.pixels[x];
    if (!column) throw new Error(`Column ${x} out of bounds`);

    // Validate y bounds (arrays in JS don't throw on out-of-bounds assignment)
    if (y < 0 || y >= this.getHeight()) {
      throw new Error(`Row ${y} out of bounds`);
    }

    column[y] = color;
  }
}

/**
 * Reads a PPM P3 format image file.
 *
 * PPM P3 Format:
 * P3
 * width height
 * 255
 * r g b r g b ... (RGB triplets, space/newline separated)
 *
 * Key Differences from Java:
 * - Java uses Scanner.nextInt() to iterate tokens
 * - TypeScript splits entire file once into array (more efficient than repeated shift())
 */
export function readPPM(filePath: string): Image {
  const content = readFileSync(filePath, "utf-8");
  const tokens = content.trim().split(/\s+/); // Split on any whitespace

  let index = 0;

  // Validate format type (should be "P3")
  const formatType = tokens[index++];
  if (formatType !== "P3") {
    throw new Error("Invalid PPM format: Expected P3");
  }

  // Parse dimensions
  const widthStr = tokens[index++];
  const heightStr = tokens[index++];
  if (!widthStr || !heightStr) {
    throw new Error("Missing dimensions");
  }

  const width = parseInt(widthStr, 10);
  const height = parseInt(heightStr, 10);

  // Skip max color value (always 255 for our purposes)
  index++;

  // Read pixel data
  const image = new Image(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r = tokens[index++];
      const g = tokens[index++];
      const b = tokens[index++];

      if (!r || !g || !b) {
        throw new Error(`Missing RGB values at pixel (${x}, ${y})`);
      }

      image.set(
        x,
        y,
        new Color(parseInt(r, 10), parseInt(g, 10), parseInt(b, 10))
      );
    }
  }

  return image;
}

/**
 * Writes an Image to a PPM P3 format file.
 *
 * Java uses PrintWriter with printf formatting.
 * TypeScript uses template literals and array joining for cleaner code.
 */
export function writePPM(image: Image, filePath: string): void {
  const lines: string[] = [];

  // Write header
  lines.push("P3");
  lines.push(`${image.getWidth()} ${image.getHeight()}`);
  lines.push("255");

  // Write pixel data (one row per line)
  for (let y = 0; y < image.getHeight(); y++) {
    const rowPixels: string[] = [];
    for (let x = 0; x < image.getWidth(); x++) {
      const color = image.get(x, y);
      // Math.trunc() converts to integer (matches Java's behavior)
      rowPixels.push(
        `${Math.trunc(color.red)} ${Math.trunc(color.green)} ${Math.trunc(
          color.blue
        )}`
      );
    }
    lines.push(rowPixels.join(" "));
  }

  // Add final newline
  lines.push("");

  writeFileSync(filePath, lines.join("\n"), "utf-8");
}
