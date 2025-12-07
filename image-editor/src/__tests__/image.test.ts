import { describe, test, expect } from '@jest/globals';
import { Color, Image } from '../image.js';

describe('Color', () => {
  describe('construction', () => {
    test('creates color with valid RGB values', () => {
      const color = new Color(100, 150, 200);

      expect(color.red).toBe(100);
      expect(color.green).toBe(150);
      expect(color.blue).toBe(200);
    });

    test('clamps values above 255 to 255', () => {
      const color = new Color(300, 400, 500);

      expect(color.red).toBe(255);
      expect(color.green).toBe(255);
      expect(color.blue).toBe(255);
    });

    test('clamps negative values to 0', () => {
      const color = new Color(-10, -20, -30);

      expect(color.red).toBe(0);
      expect(color.green).toBe(0);
      expect(color.blue).toBe(0);
    });

    test('truncates float values to integers', () => {
      const color = new Color(100.7, 150.3, 200.9);

      expect(color.red).toBe(100);
      expect(color.green).toBe(150);
      expect(color.blue).toBe(200);
    });
  });

  describe('getters and setters', () => {
    test('getters return correct values', () => {
      const color = new Color(50, 100, 150);

      expect(color.red).toBe(50);
      expect(color.green).toBe(100);
      expect(color.blue).toBe(150);
    });

    test('setters update values', () => {
      const color = new Color(0, 0, 0);

      color.red = 255;
      color.green = 128;
      color.blue = 64;

      expect(color.red).toBe(255);
      expect(color.green).toBe(128);
      expect(color.blue).toBe(64);
    });

    test('setters clamp values above 255', () => {
      const color = new Color(0, 0, 0);

      color.red = 300;
      color.green = 400;
      color.blue = 500;

      expect(color.red).toBe(255);
      expect(color.green).toBe(255);
      expect(color.blue).toBe(255);
    });

    test('setters clamp negative values to 0', () => {
      const color = new Color(100, 100, 100);

      color.red = -10;
      color.green = -20;
      color.blue = -30;

      expect(color.red).toBe(0);
      expect(color.green).toBe(0);
      expect(color.blue).toBe(0);
    });
  });
});

describe('Image', () => {
  describe('construction', () => {
    test('creates image with correct dimensions', () => {
      const image = new Image(10, 20);

      expect(image.getWidth()).toBe(10);
      expect(image.getHeight()).toBe(20);
    });

    test('initializes all pixels to black', () => {
      const image = new Image(3, 3);

      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          const color = image.get(x, y);
          expect(color.red).toBe(0);
          expect(color.green).toBe(0);
          expect(color.blue).toBe(0);
        }
      }
    });
  });

  describe('get and set', () => {
    test('sets and gets pixel colors', () => {
      const image = new Image(5, 5);
      const testColor = new Color(123, 234, 95);

      image.set(2, 3, testColor);
      const retrieved = image.get(2, 3);

      expect(retrieved.red).toBe(123);
      expect(retrieved.green).toBe(234);
      expect(retrieved.blue).toBe(95);
    });

    test('get returns reference to same color object (mutation)', () => {
      const image = new Image(2, 2);
      const color1 = image.get(0, 0);
      const color2 = image.get(0, 0);

      // Mutating one reference should affect the other
      color1.red = 100;

      expect(color2.red).toBe(100);
      expect(color1).toBe(color2); // Same object reference
    });

    test('different pixels have different color objects', () => {
      const image = new Image(2, 2);
      const color1 = image.get(0, 0);
      const color2 = image.get(1, 1);

      color1.red = 100;
      color2.red = 200;

      expect(color1.red).toBe(100);
      expect(color2.red).toBe(200);
      expect(color1).not.toBe(color2); // Different objects
    });
  });

  describe('bounds checking', () => {
    test('throws error for out-of-bounds x coordinate in get', () => {
      const image = new Image(5, 5);

      expect(() => image.get(10, 0)).toThrow('Column 10 out of bounds');
      expect(() => image.get(-1, 0)).toThrow();
    });

    test('throws error for out-of-bounds y coordinate in get', () => {
      const image = new Image(5, 5);

      expect(() => image.get(0, 10)).toThrow('Row 10 out of bounds');
      expect(() => image.get(0, -1)).toThrow();
    });

    test('throws error for out-of-bounds coordinates in set', () => {
      const image = new Image(5, 5);
      const color = new Color(100, 100, 100);

      expect(() => image.set(10, 0, color)).toThrow('Column 10 out of bounds');
      expect(() => image.set(0, 10, color)).toThrow();
    });

    test('allows access to boundary pixels', () => {
      const image = new Image(5, 5);
      const color = new Color(255, 255, 255);

      // Should not throw - these are valid boundary pixels
      expect(() => image.set(0, 0, color)).not.toThrow();
      expect(() => image.set(4, 4, color)).not.toThrow();
      expect(() => image.get(0, 0)).not.toThrow();
      expect(() => image.get(4, 4)).not.toThrow();
    });
  });
});
