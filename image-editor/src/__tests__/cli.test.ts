import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CLI_PATH = 'node dist/index.js';
const SOURCE_DIR = 'source_images';
const TEST_OUTPUT_DIR = 'test_output_cli';

describe('CLI End-to-End Tests', () => {
  beforeAll(() => {
    // Ensure dist is built
    execSync('npm run build', { stdio: 'pipe' });

    // Clean up and create test output directory
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(() => {
    // Clean up test output directory
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  describe('usage and help', () => {
    test('shows usage when no arguments provided', () => {
      try {
        execSync(CLI_PATH, { encoding: 'utf-8', stdio: 'pipe' });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toContain('USAGE:');
      }
    });

    test('shows usage when insufficient arguments provided', () => {
      try {
        execSync(`${CLI_PATH} input.ppm output.ppm`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toContain('USAGE:');
      }
    });

    test('shows usage for invalid filter name', () => {
      const inputPath = join(SOURCE_DIR, 'tiny.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'output.ppm');

      try {
        execSync(`${CLI_PATH} ${inputPath} ${outputPath} invalidfilter`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toContain('USAGE:');
      }
    });
  });

  describe('grayscale filter', () => {
    test('successfully processes tiny.ppm', () => {
      const inputPath = join(SOURCE_DIR, 'tiny.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'grayscale-tiny.ppm');

      const result = execSync(`${CLI_PATH} ${inputPath} ${outputPath} grayscale`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });

      expect(existsSync(outputPath)).toBe(true);

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('P3');
      expect(content).toContain('150 150 150'); // Expected grayscale value
    });

    test('successfully processes feep.ppm', () => {
      const inputPath = join(SOURCE_DIR, 'feep.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'grayscale-feep.ppm');

      execSync(`${CLI_PATH} ${inputPath} ${outputPath} grayscale`, {
        stdio: 'pipe'
      });

      expect(existsSync(outputPath)).toBe(true);
    });

    test('rejects extra parameters', () => {
      const inputPath = join(SOURCE_DIR, 'tiny.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'output.ppm');

      try {
        execSync(`${CLI_PATH} ${inputPath} ${outputPath} grayscale extra`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toContain('grayscale filter takes no additional parameters');
        expect(error.stderr.toString()).toContain('USAGE:');
      }
    });

    test('accepts alternative spelling "greyscale"', () => {
      const inputPath = join(SOURCE_DIR, 'tiny.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'greyscale-tiny.ppm');

      execSync(`${CLI_PATH} ${inputPath} ${outputPath} greyscale`, {
        stdio: 'pipe'
      });

      expect(existsSync(outputPath)).toBe(true);
    });
  });

  describe('invert filter', () => {
    test('successfully processes tiny.ppm', () => {
      const inputPath = join(SOURCE_DIR, 'tiny.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'invert-tiny.ppm');

      execSync(`${CLI_PATH} ${inputPath} ${outputPath} invert`, {
        stdio: 'pipe'
      });

      expect(existsSync(outputPath)).toBe(true);

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('P3');
      // Original: 123 234 95, Inverted: 132 21 160
      expect(content).toContain('132 21 160');
    });

    test('rejects extra parameters', () => {
      const inputPath = join(SOURCE_DIR, 'tiny.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'output.ppm');

      try {
        execSync(`${CLI_PATH} ${inputPath} ${outputPath} invert extra`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toContain('invert filter takes no additional parameters');
      }
    });
  });

  describe('emboss filter', () => {
    test('successfully processes feep.ppm', () => {
      const inputPath = join(SOURCE_DIR, 'feep.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'emboss-feep.ppm');

      execSync(`${CLI_PATH} ${inputPath} ${outputPath} emboss`, {
        stdio: 'pipe'
      });

      expect(existsSync(outputPath)).toBe(true);
    });

    test('rejects extra parameters', () => {
      const inputPath = join(SOURCE_DIR, 'tiny.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'output.ppm');

      try {
        execSync(`${CLI_PATH} ${inputPath} ${outputPath} emboss extra`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toContain('emboss filter takes no additional parameters');
      }
    });
  });

  describe('motionblur filter', () => {
    test('successfully processes tiny.ppm with valid length', () => {
      const inputPath = join(SOURCE_DIR, 'tiny.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'motionblur-tiny.ppm');

      execSync(`${CLI_PATH} ${inputPath} ${outputPath} motionblur 2`, {
        stdio: 'pipe'
      });

      expect(existsSync(outputPath)).toBe(true);
    });

    test('successfully processes feep.ppm with valid length', () => {
      const inputPath = join(SOURCE_DIR, 'feep.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'motionblur-feep.ppm');

      execSync(`${CLI_PATH} ${inputPath} ${outputPath} motionblur 3`, {
        stdio: 'pipe'
      });

      expect(existsSync(outputPath)).toBe(true);
    });

    test('rejects missing length parameter', () => {
      const inputPath = join(SOURCE_DIR, 'tiny.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'output.ppm');

      try {
        execSync(`${CLI_PATH} ${inputPath} ${outputPath} motionblur`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toContain('motionblur requires exactly one parameter');
        expect(error.stderr.toString()).toContain('USAGE:');
      }
    });

    test('rejects non-integer length', () => {
      const inputPath = join(SOURCE_DIR, 'tiny.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'output.ppm');

      try {
        execSync(`${CLI_PATH} ${inputPath} ${outputPath} motionblur abc`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toContain('motionblur length must be a positive integer');
      }
    });

    test('rejects negative length', () => {
      const inputPath = join(SOURCE_DIR, 'tiny.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'output.ppm');

      try {
        execSync(`${CLI_PATH} ${inputPath} ${outputPath} motionblur -5`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toContain('motionblur length must be a positive integer');
      }
    });

    test('rejects zero length', () => {
      const inputPath = join(SOURCE_DIR, 'tiny.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'output.ppm');

      try {
        execSync(`${CLI_PATH} ${inputPath} ${outputPath} motionblur 0`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toContain('motionblur length must be a positive integer');
      }
    });

    test('rejects float length', () => {
      const inputPath = join(SOURCE_DIR, 'tiny.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'output.ppm');

      try {
        execSync(`${CLI_PATH} ${inputPath} ${outputPath} motionblur 3.5`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toContain('motionblur length must be a positive integer');
      }
    });
  });

  describe('error handling', () => {
    test('handles missing input file', () => {
      const inputPath = 'nonexistent.ppm';
      const outputPath = join(TEST_OUTPUT_DIR, 'output.ppm');

      try {
        execSync(`${CLI_PATH} ${inputPath} ${outputPath} grayscale`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toContain('Error processing image');
      }
    });

    test('handles invalid PPM format', () => {
      const inputPath = join(TEST_OUTPUT_DIR, 'invalid.ppm');
      const outputPath = join(TEST_OUTPUT_DIR, 'output.ppm');

      // Create invalid PPM file
      writeFileSync(inputPath, 'INVALID\n1 1\n255\n0 0 0\n');

      try {
        execSync(`${CLI_PATH} ${inputPath} ${outputPath} grayscale`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.status).toBe(1);
        expect(error.stderr.toString()).toContain('Error processing image');
      }
    });
  });
});
