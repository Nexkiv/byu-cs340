import { describe, test, expect } from '@jest/globals';
import { Image, Color } from '../image.js';
import {
  ParameterError,
  grayscale,
  invert,
  emboss,
  motionblur,
} from '../image-editor.js';

describe('ParameterError', () => {
  test('is instance of Error', () => {
    const error = new ParameterError('test message');

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('test message');
  });

  test('has correct name property', () => {
    const error = new ParameterError('test');

    expect(error.name).toBe('ParameterError');
  });
});

describe('grayscale', () => {
  test('converts pure red to gray', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(255, 0, 0));

    grayscale(image);

    const color = image.get(0, 0);
    expect(color.red).toBe(85); // Math.trunc(255/3) = 85
    expect(color.green).toBe(85);
    expect(color.blue).toBe(85);
  });

  test('converts pure green to gray', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(0, 255, 0));

    grayscale(image);

    const color = image.get(0, 0);
    expect(color.red).toBe(85);
    expect(color.green).toBe(85);
    expect(color.blue).toBe(85);
  });

  test('converts pure blue to gray', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(0, 0, 255));

    grayscale(image);

    const color = image.get(0, 0);
    expect(color.red).toBe(85);
    expect(color.green).toBe(85);
    expect(color.blue).toBe(85);
  });

  test('correctly truncates when averaging', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(100, 100, 101)); // (100+100+101)/3 = 100.33...

    grayscale(image);

    const color = image.get(0, 0);
    expect(color.red).toBe(100); // Truncated to 100
    expect(color.green).toBe(100);
    expect(color.blue).toBe(100);
  });

  test('handles black (0, 0, 0)', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(0, 0, 0));

    grayscale(image);

    const color = image.get(0, 0);
    expect(color.red).toBe(0);
    expect(color.green).toBe(0);
    expect(color.blue).toBe(0);
  });

  test('handles white (255, 255, 255)', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(255, 255, 255));

    grayscale(image);

    const color = image.get(0, 0);
    expect(color.red).toBe(255);
    expect(color.green).toBe(255);
    expect(color.blue).toBe(255);
  });

  test('modifies image in-place', () => {
    const image = new Image(2, 2);
    image.set(0, 0, new Color(100, 150, 200));
    image.set(1, 1, new Color(50, 75, 100));

    grayscale(image);

    // First pixel
    const color1 = image.get(0, 0);
    expect(color1.red).toBe(150); // Math.trunc((100+150+200)/3) = 150
    expect(color1.green).toBe(150);
    expect(color1.blue).toBe(150);

    // Second pixel
    const color2 = image.get(1, 1);
    expect(color2.red).toBe(75); // Math.trunc((50+75+100)/3) = 75
    expect(color2.green).toBe(75);
    expect(color2.blue).toBe(75);
  });

  test('throws ParameterError when given extra parameters', () => {
    const image = new Image(1, 1);

    expect(() => grayscale(image, ['extra'])).toThrow(ParameterError);
    expect(() => grayscale(image, ['extra'])).toThrow(
      'grayscale filter takes no additional parameters'
    );
  });

  test('accepts undefined args parameter', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(100, 100, 100));

    expect(() => grayscale(image)).not.toThrow();
  });

  test('accepts empty args array', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(100, 100, 100));

    expect(() => grayscale(image, [])).not.toThrow();
  });
});

describe('invert', () => {
  test('inverts pure red', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(255, 0, 0));

    invert(image);

    const color = image.get(0, 0);
    expect(color.red).toBe(0);
    expect(color.green).toBe(255);
    expect(color.blue).toBe(255);
  });

  test('inverts pure green', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(0, 255, 0));

    invert(image);

    const color = image.get(0, 0);
    expect(color.red).toBe(255);
    expect(color.green).toBe(0);
    expect(color.blue).toBe(255);
  });

  test('inverts pure blue', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(0, 0, 255));

    invert(image);

    const color = image.get(0, 0);
    expect(color.red).toBe(255);
    expect(color.green).toBe(255);
    expect(color.blue).toBe(0);
  });

  test('inverts black to white', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(0, 0, 0));

    invert(image);

    const color = image.get(0, 0);
    expect(color.red).toBe(255);
    expect(color.green).toBe(255);
    expect(color.blue).toBe(255);
  });

  test('inverts white to black', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(255, 255, 255));

    invert(image);

    const color = image.get(0, 0);
    expect(color.red).toBe(0);
    expect(color.green).toBe(0);
    expect(color.blue).toBe(0);
  });

  test('inverts mid-range values', () => {
    const image = new Image(1, 1);
    image.set(0, 0, new Color(100, 150, 200));

    invert(image);

    const color = image.get(0, 0);
    expect(color.red).toBe(155); // 255 - 100
    expect(color.green).toBe(105); // 255 - 150
    expect(color.blue).toBe(55); // 255 - 200
  });

  test('modifies image in-place', () => {
    const image = new Image(2, 2);
    image.set(0, 0, new Color(100, 150, 200));
    image.set(1, 1, new Color(50, 75, 100));

    invert(image);

    const color1 = image.get(0, 0);
    expect(color1.red).toBe(155);
    expect(color1.green).toBe(105);
    expect(color1.blue).toBe(55);

    const color2 = image.get(1, 1);
    expect(color2.red).toBe(205);
    expect(color2.green).toBe(180);
    expect(color2.blue).toBe(155);
  });

  test('throws ParameterError when given extra parameters', () => {
    const image = new Image(1, 1);

    expect(() => invert(image, ['extra'])).toThrow(ParameterError);
    expect(() => invert(image, ['extra'])).toThrow(
      'invert filter takes no additional parameters'
    );
  });

  test('accepts undefined args parameter', () => {
    const image = new Image(1, 1);

    expect(() => invert(image)).not.toThrow();
  });

  test('accepts empty args array', () => {
    const image = new Image(1, 1);

    expect(() => invert(image, [])).not.toThrow();
  });
});

describe('emboss', () => {
  test('sets edge pixels to gray (128)', () => {
    const image = new Image(3, 3);
    // Fill with white
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        image.set(x, y, new Color(255, 255, 255));
      }
    }

    emboss(image);

    // Top-left corner (x=0, y=0) should be gray
    const topLeft = image.get(0, 0);
    expect(topLeft.red).toBe(128);
    expect(topLeft.green).toBe(128);
    expect(topLeft.blue).toBe(128);

    // Top edge (x>0, y=0) should be gray
    const topEdge = image.get(1, 0);
    expect(topEdge.red).toBe(128);
    expect(topEdge.green).toBe(128);
    expect(topEdge.blue).toBe(128);

    // Left edge (x=0, y>0) should be gray
    const leftEdge = image.get(0, 1);
    expect(leftEdge.red).toBe(128);
    expect(leftEdge.green).toBe(128);
    expect(leftEdge.blue).toBe(128);
  });

  test('calculates difference from upper-left neighbor', () => {
    const image = new Image(2, 2);
    image.set(0, 0, new Color(100, 100, 100)); // Upper-left
    image.set(1, 1, new Color(150, 150, 150)); // Lower-right

    emboss(image);

    // Lower-right pixel (1,1) compares with upper-left (0,0)
    // diff = 150 - 100 = 50
    // grayLevel = 128 + 50 = 178
    const lowerRight = image.get(1, 1);
    expect(lowerRight.red).toBe(178);
    expect(lowerRight.green).toBe(178);
    expect(lowerRight.blue).toBe(178);
  });

  test('uses channel with maximum absolute difference', () => {
    const image = new Image(2, 2);
    image.set(0, 0, new Color(100, 120, 130)); // Upper-left
    image.set(1, 1, new Color(110, 140, 160)); // Lower-right
    // Differences: red=10, green=20, blue=30 (blue has max)

    emboss(image);

    // Should use blue difference (30)
    // grayLevel = 128 + 30 = 158
    const lowerRight = image.get(1, 1);
    expect(lowerRight.red).toBe(158);
    expect(lowerRight.green).toBe(158);
    expect(lowerRight.blue).toBe(158);
  });

  test('handles negative differences correctly', () => {
    const image = new Image(2, 2);
    image.set(0, 0, new Color(200, 200, 200)); // Upper-left (brighter)
    image.set(1, 1, new Color(100, 100, 100)); // Lower-right (darker)

    emboss(image);

    // diff = 100 - 200 = -100
    // grayLevel = 128 + (-100) = 28
    const lowerRight = image.get(1, 1);
    expect(lowerRight.red).toBe(28);
    expect(lowerRight.green).toBe(28);
    expect(lowerRight.blue).toBe(28);
  });

  test('clamps values to valid range', () => {
    const image = new Image(2, 2);
    image.set(0, 0, new Color(0, 0, 0)); // Upper-left (black)
    image.set(1, 1, new Color(255, 255, 255)); // Lower-right (white)

    emboss(image);

    // diff = 255 - 0 = 255
    // grayLevel = 128 + 255 = 383 (should be clamped to 255)
    const lowerRight = image.get(1, 1);
    expect(lowerRight.red).toBe(255);
    expect(lowerRight.green).toBe(255);
    expect(lowerRight.blue).toBe(255);
  });

  test('modifies image in-place', () => {
    const image = new Image(3, 3);
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        image.set(x, y, new Color(128, 128, 128));
      }
    }

    emboss(image);

    // All non-edge pixels should be 128 (no difference)
    const center = image.get(1, 1);
    expect(center.red).toBe(128);
    expect(center.green).toBe(128);
    expect(center.blue).toBe(128);
  });

  test('throws ParameterError when given extra parameters', () => {
    const image = new Image(1, 1);

    expect(() => emboss(image, ['extra'])).toThrow(ParameterError);
    expect(() => emboss(image, ['extra'])).toThrow(
      'emboss filter takes no additional parameters'
    );
  });

  test('accepts undefined args parameter', () => {
    const image = new Image(2, 2);

    expect(() => emboss(image)).not.toThrow();
  });

  test('accepts empty args array', () => {
    const image = new Image(2, 2);

    expect(() => emboss(image, [])).not.toThrow();
  });
});

describe('motionblur', () => {
  test('averages with pixels to the right', () => {
    const image = new Image(3, 1);
    image.set(0, 0, new Color(0, 0, 0)); // Black
    image.set(1, 0, new Color(100, 100, 100)); // Gray
    image.set(2, 0, new Color(200, 200, 200)); // Light gray

    motionblur(image, ['2']); // Blur length 2

    // Pixel at (0,0) averages itself and (1,0): (0 + 100) / 2 = 50
    const pixel0 = image.get(0, 0);
    expect(pixel0.red).toBe(50);
    expect(pixel0.green).toBe(50);
    expect(pixel0.blue).toBe(50);

    // Pixel at (1,0) averages itself and (2,0): (100 + 200) / 2 = 150
    const pixel1 = image.get(1, 0);
    expect(pixel1.red).toBe(150);
    expect(pixel1.green).toBe(150);
    expect(pixel1.blue).toBe(150);

    // Pixel at (2,0) only averages itself: 200 / 1 = 200
    const pixel2 = image.get(2, 0);
    expect(pixel2.red).toBe(200);
    expect(pixel2.green).toBe(200);
    expect(pixel2.blue).toBe(200);
  });

  test('handles blur length of 1', () => {
    const image = new Image(2, 1);
    image.set(0, 0, new Color(100, 150, 200));
    image.set(1, 0, new Color(50, 75, 100));

    motionblur(image, ['1']); // Length 1 = no blur

    // Each pixel only averages itself
    const pixel0 = image.get(0, 0);
    expect(pixel0.red).toBe(100);
    expect(pixel0.green).toBe(150);
    expect(pixel0.blue).toBe(200);

    const pixel1 = image.get(1, 0);
    expect(pixel1.red).toBe(50);
    expect(pixel1.green).toBe(75);
    expect(pixel1.blue).toBe(100);
  });

  test('handles blur length greater than image width', () => {
    const image = new Image(2, 1);
    image.set(0, 0, new Color(100, 100, 100));
    image.set(1, 0, new Color(200, 200, 200));

    motionblur(image, ['10']); // Length 10 > width 2

    // Pixel at (0,0) averages both pixels: (100 + 200) / 2 = 150
    const pixel0 = image.get(0, 0);
    expect(pixel0.red).toBe(150);
    expect(pixel0.green).toBe(150);
    expect(pixel0.blue).toBe(150);

    // Pixel at (1,0) only averages itself
    const pixel1 = image.get(1, 0);
    expect(pixel1.red).toBe(200);
    expect(pixel1.green).toBe(200);
    expect(pixel1.blue).toBe(200);
  });

  test('correctly truncates averaging result', () => {
    const image = new Image(2, 1);
    image.set(0, 0, new Color(100, 100, 100));
    image.set(1, 0, new Color(101, 101, 101));

    motionblur(image, ['2']);

    // (100 + 101) / 2 = 100.5, should truncate to 100
    const pixel0 = image.get(0, 0);
    expect(pixel0.red).toBe(100);
    expect(pixel0.green).toBe(100);
    expect(pixel0.blue).toBe(100);
  });

  test('modifies image in-place', () => {
    const image = new Image(2, 2);
    image.set(0, 0, new Color(0, 0, 0));
    image.set(1, 0, new Color(100, 100, 100));
    image.set(0, 1, new Color(150, 150, 150));
    image.set(1, 1, new Color(200, 200, 200));

    motionblur(image, ['2']);

    // Row 0: pixel (0,0) averages (0,0) and (1,0)
    const pixel00 = image.get(0, 0);
    expect(pixel00.red).toBe(50); // (0 + 100) / 2

    // Row 1: pixel (0,1) averages (0,1) and (1,1)
    const pixel01 = image.get(0, 1);
    expect(pixel01.red).toBe(175); // (150 + 200) / 2
  });

  test('throws ParameterError for missing parameter', () => {
    const image = new Image(1, 1);

    expect(() => motionblur(image)).toThrow(ParameterError);
    expect(() => motionblur(image)).toThrow(
      'motionblur requires exactly one parameter: length'
    );
  });

  test('throws ParameterError for empty args array', () => {
    const image = new Image(1, 1);

    expect(() => motionblur(image, [])).toThrow(ParameterError);
    expect(() => motionblur(image, [])).toThrow(
      'motionblur requires exactly one parameter: length'
    );
  });

  test('throws ParameterError for multiple parameters', () => {
    const image = new Image(1, 1);

    expect(() => motionblur(image, ['5', 'extra'])).toThrow(ParameterError);
    expect(() => motionblur(image, ['5', 'extra'])).toThrow(
      'motionblur requires exactly one parameter: length'
    );
  });

  test('throws ParameterError for non-integer length', () => {
    const image = new Image(1, 1);

    expect(() => motionblur(image, ['abc'])).toThrow(ParameterError);
    expect(() => motionblur(image, ['abc'])).toThrow(
      'motionblur length must be a positive integer'
    );
  });

  test('throws ParameterError for zero length', () => {
    const image = new Image(1, 1);

    expect(() => motionblur(image, ['0'])).toThrow(ParameterError);
    expect(() => motionblur(image, ['0'])).toThrow(
      'motionblur length must be a positive integer'
    );
  });

  test('throws ParameterError for negative length', () => {
    const image = new Image(1, 1);

    expect(() => motionblur(image, ['-5'])).toThrow(ParameterError);
    expect(() => motionblur(image, ['-5'])).toThrow(
      'motionblur length must be a positive integer'
    );
  });

  test('throws ParameterError for float length', () => {
    const image = new Image(1, 1);

    expect(() => motionblur(image, ['3.5'])).toThrow(ParameterError);
    expect(() => motionblur(image, ['3.5'])).toThrow(
      'motionblur length must be a positive integer'
    );
  });
});
