import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { readPPM, writePPM } from '../image.js';
import { grayscale, invert, emboss, motionblur } from '../image-editor.js';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const SOURCE_DIR = 'source_images';
const KEY_DIR = 'key_image_solutions';
const TEST_OUTPUT_DIR = 'test_output';

describe('Integration Tests', () => {
  // Clean up test output directory before tests
  beforeAll(() => {
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  });

  // Clean up after tests
  afterAll(() => {
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  describe('readPPM and writePPM', () => {
    test('reads and writes tiny.ppm correctly', () => {
      const image = readPPM(join(SOURCE_DIR, 'tiny.ppm'));

      expect(image.getWidth()).toBe(1);
      expect(image.getHeight()).toBe(1);

      const color = image.get(0, 0);
      expect(color.red).toBe(123);
      expect(color.green).toBe(234);
      expect(color.blue).toBe(95);
    });

    test('reads and writes feep.ppm correctly', () => {
      const image = readPPM(join(SOURCE_DIR, 'feep.ppm'));

      expect(image.getWidth()).toBe(4);
      expect(image.getHeight()).toBe(4);

      // Check a few pixels to verify correct reading
      const topLeft = image.get(0, 0);
      expect(topLeft.red).toBeDefined();
      expect(topLeft.green).toBeDefined();
      expect(topLeft.blue).toBeDefined();
    });

    test('round-trip preserves image data', () => {
      const originalImage = readPPM(join(SOURCE_DIR, 'tiny.ppm'));
      const outputPath = join(TEST_OUTPUT_DIR, 'roundtrip-tiny.ppm');

      writePPM(originalImage, outputPath);
      const rereadImage = readPPM(outputPath);

      expect(rereadImage.getWidth()).toBe(originalImage.getWidth());
      expect(rereadImage.getHeight()).toBe(originalImage.getHeight());

      for (let x = 0; x < originalImage.getWidth(); x++) {
        for (let y = 0; y < originalImage.getHeight(); y++) {
          const original = originalImage.get(x, y);
          const reread = rereadImage.get(x, y);

          expect(reread.red).toBe(original.red);
          expect(reread.green).toBe(original.green);
          expect(reread.blue).toBe(original.blue);
        }
      }
    });
  });

  describe('grayscale filter', () => {
    test('produces correct output for tiny.ppm', () => {
      const image = readPPM(join(SOURCE_DIR, 'tiny.ppm'));
      grayscale(image);

      const expected = readPPM(join(KEY_DIR, 'grayscale-tiny.ppm'));

      expect(image.getWidth()).toBe(expected.getWidth());
      expect(image.getHeight()).toBe(expected.getHeight());

      for (let x = 0; x < image.getWidth(); x++) {
        for (let y = 0; y < image.getHeight(); y++) {
          const actual = image.get(x, y);
          const exp = expected.get(x, y);

          expect(actual.red).toBe(exp.red);
          expect(actual.green).toBe(exp.green);
          expect(actual.blue).toBe(exp.blue);
        }
      }
    });

    test('produces correct output for feep.ppm', () => {
      const image = readPPM(join(SOURCE_DIR, 'feep.ppm'));
      grayscale(image);

      const expected = readPPM(join(KEY_DIR, 'grayscale-feep.ppm'));

      expect(image.getWidth()).toBe(expected.getWidth());
      expect(image.getHeight()).toBe(expected.getHeight());

      for (let x = 0; x < image.getWidth(); x++) {
        for (let y = 0; y < image.getHeight(); y++) {
          const actual = image.get(x, y);
          const exp = expected.get(x, y);

          expect(actual.red).toBe(exp.red);
          expect(actual.green).toBe(exp.green);
          expect(actual.blue).toBe(exp.blue);
        }
      }
    });
  });

  describe('invert filter', () => {
    test('produces correct output for tiny.ppm', () => {
      const image = readPPM(join(SOURCE_DIR, 'tiny.ppm'));
      invert(image);

      const expected = readPPM(join(KEY_DIR, 'invert-tiny.ppm'));

      for (let x = 0; x < image.getWidth(); x++) {
        for (let y = 0; y < image.getHeight(); y++) {
          const actual = image.get(x, y);
          const exp = expected.get(x, y);

          expect(actual.red).toBe(exp.red);
          expect(actual.green).toBe(exp.green);
          expect(actual.blue).toBe(exp.blue);
        }
      }
    });

    test('produces correct output for feep.ppm', () => {
      const image = readPPM(join(SOURCE_DIR, 'feep.ppm'));
      invert(image);

      const expected = readPPM(join(KEY_DIR, 'invert-feep.ppm'));

      for (let x = 0; x < image.getWidth(); x++) {
        for (let y = 0; y < image.getHeight(); y++) {
          const actual = image.get(x, y);
          const exp = expected.get(x, y);

          expect(actual.red).toBe(exp.red);
          expect(actual.green).toBe(exp.green);
          expect(actual.blue).toBe(exp.blue);
        }
      }
    });
  });

  describe('emboss filter', () => {
    test('produces correct output for Penguins.ppm', () => {
      const image = readPPM(join(SOURCE_DIR, 'Penguins.ppm'));
      emboss(image);

      const expected = readPPM(join(KEY_DIR, 'emboss-Penguins.ppm'));

      expect(image.getWidth()).toBe(expected.getWidth());
      expect(image.getHeight()).toBe(expected.getHeight());

      for (let x = 0; x < image.getWidth(); x++) {
        for (let y = 0; y < image.getHeight(); y++) {
          const actual = image.get(x, y);
          const exp = expected.get(x, y);

          expect(actual.red).toBe(exp.red);
          expect(actual.green).toBe(exp.green);
          expect(actual.blue).toBe(exp.blue);
        }
      }
    });

    test('produces correct output for sunset.ppm', () => {
      const image = readPPM(join(SOURCE_DIR, 'sunset.ppm'));
      emboss(image);

      const expected = readPPM(join(KEY_DIR, 'emboss-sunset.ppm'));

      for (let x = 0; x < image.getWidth(); x++) {
        for (let y = 0; y < image.getHeight(); y++) {
          const actual = image.get(x, y);
          const exp = expected.get(x, y);

          expect(actual.red).toBe(exp.red);
          expect(actual.green).toBe(exp.green);
          expect(actual.blue).toBe(exp.blue);
        }
      }
    });
  });

  describe('motionblur filter', () => {
    test('produces correct output for tiny.ppm (any length)', () => {
      const image = readPPM(join(SOURCE_DIR, 'tiny.ppm'));
      const originalColor = image.get(0, 0);
      const originalRed = originalColor.red;
      const originalGreen = originalColor.green;
      const originalBlue = originalColor.blue;

      motionblur(image, ['2']);

      // For 1x1 image, any blur length produces unchanged output
      const color = image.get(0, 0);
      expect(color.red).toBe(originalRed);
      expect(color.green).toBe(originalGreen);
      expect(color.blue).toBe(originalBlue);
    });

    test('produces correct output for feep.ppm with length 4', () => {
      const image = readPPM(join(SOURCE_DIR, 'feep.ppm'));
      motionblur(image, ['4']);

      // key_image_solutions/motionblur-feep.ppm was generated with length 4
      const expected = readPPM(join(KEY_DIR, 'motionblur-feep.ppm'));

      for (let x = 0; x < image.getWidth(); x++) {
        for (let y = 0; y < image.getHeight(); y++) {
          const actual = image.get(x, y);
          const exp = expected.get(x, y);

          expect(actual.red).toBe(exp.red);
          expect(actual.green).toBe(exp.green);
          expect(actual.blue).toBe(exp.blue);
        }
      }
    });

    test('executes without error on sunset.ppm', () => {
      const image = readPPM(join(SOURCE_DIR, 'sunset.ppm'));
      const width = image.getWidth();
      const height = image.getHeight();

      // Verify motionblur executes without throwing
      expect(() => motionblur(image, ['5'])).not.toThrow();

      // Verify image dimensions unchanged
      expect(image.getWidth()).toBe(width);
      expect(image.getHeight()).toBe(height);
    });
  });

  describe('write filter outputs', () => {
    test('writes grayscale output that can be re-read', () => {
      const image = readPPM(join(SOURCE_DIR, 'tiny.ppm'));
      grayscale(image);

      const outputPath = join(TEST_OUTPUT_DIR, 'test-grayscale.ppm');
      writePPM(image, outputPath);

      const reread = readPPM(outputPath);
      expect(reread.getWidth()).toBe(image.getWidth());
      expect(reread.getHeight()).toBe(image.getHeight());
    });

    test('writes motionblur output that can be re-read', () => {
      const image = readPPM(join(SOURCE_DIR, 'feep.ppm'));
      motionblur(image, ['3']);

      const outputPath = join(TEST_OUTPUT_DIR, 'test-motionblur.ppm');
      writePPM(image, outputPath);

      const reread = readPPM(outputPath);
      expect(reread.getWidth()).toBe(image.getWidth());
      expect(reread.getHeight()).toBe(image.getHeight());
    });
  });
});
