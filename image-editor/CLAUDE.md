# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an image editor project that implements various image filters (grayscale, invert, emboss, motionblur) on PPM (P3 format) images. The project has two implementations:

- **Java reference implementation**: Located in `ImageEditorFiles/java/ImageEditor.java`
- **TypeScript implementation**: Active development in `src/` directory

## Build and Development Commands

### TypeScript Version (Primary Development)

```bash
# Build the TypeScript project
npm run build

# Run the compiled program
npm start

# Run with arguments (after building)
node dist/index.js <input-file> <output-file> <filter> [motion-blur-length]
```

### Java Version (Reference Implementation)

```bash
# Compile
cd ImageEditorFiles/java
javac ImageEditor.java

# Run
java ImageEditor <input-file> <output-file> <filter> [motion-blur-length]
```

## Architecture

### Core Classes (`src/image.ts`)

- **Color**: RGB values with getters/setters, automatic clamping to 0-255, uses `Math.trunc()` for integer behavior
- **Image**: 2D Color array, bounds checking on get/set operations
- **readPPM/writePPM**: File I/O for PPM P3 format

### Filters (`src/image-editor.ts`)

All filters mutate images in-place:

- **grayscale**: Averages RGB channels `(r+g+b)/3`
- **invert**: Negates each channel `255 - value`
- **emboss**: Calculates difference from upper-left neighbor, iterates backwards
- **motionblur**: Averages with N pixels to the right, requires length parameter
- **ParameterError**: Custom error distinguishing parameter errors (shows usage) from processing errors

### CLI (`src/index.ts`)

Decoupled architecture where filters validate their own parameters:

```bash
node dist/index.js <input> <output> <grayscale|greyscale|invert|emboss|motionblur> [length]
```

- Only `motionblur` requires additional parameter (positive integer)
- Usage displayed for invalid arguments or parameter errors
- Exits with code 1 on error

### PPM P3 Format

```text
P3
width height
255
r g b r g b ... (RGB triplets, space/newline separated)
```

## Project Structure

```text
src/
├── __tests__/              # Test files (Jest convention)
│   ├── image.test.ts       # Color/Image unit tests
│   ├── image-editor.test.ts # Filter unit tests
│   ├── integration.test.ts # Real image processing tests
│   └── cli.test.ts         # CLI end-to-end tests
├── index.ts                # CLI entry point
├── image-editor.ts         # Filter implementations
└── image.ts                # Core data structures
dist/                       # Compiled JavaScript (generated)
ImageEditorFiles/
├── java/                   # Reference implementation
└── specification/          # Project spec (PDF)
source_images/              # Test images (PPM format)
key_image_solutions/        # Expected filter outputs
```

## Testing Suite (94 tests, 4 suites)

### Unit Tests (60 tests)

- **image.test.ts** (17): Color/Image validation, bounds checking, mutation behavior
- **image-editor.test.ts** (43): Filter correctness, parameter validation, edge cases

### Integration & E2E (34 tests)

- **integration.test.ts** (14): Real PPM files, output verification, I/O round-trips
- **cli.test.ts** (20): Argument parsing, error handling, full CLI workflows

### Running Tests

```bash
npm test                    # All tests (~143s, includes large images)
npm test -- image.test.ts   # Specific suite
npm run test:coverage       # Coverage report
```

### Performance Notes

- **Direct CLI**: ~1s for large images (faster than Java)
- **Jest tests**: 117x slower due to framework overhead (normal)
- Integration tests with Penguins.ppm take ~2min in Jest, <2s direct

## Implementation Details

### Key Choices

- **Math.trunc()**: Matches Java integer truncation (toward zero, not floor)
- **Number.isInteger()**: Readable validation vs regex patterns
- **ES Modules**: ES2022 with Jest experimental VM support
- **Type guards**: `args && args.length > 0` for optional parameter checking
- **Decoupling**: Filters own parameter validation instead of CLI knowing filter requirements

### TypeScript Configuration

- **Module system**: ES2022 modules (not CommonJS)
- **Strict mode**: Enabled with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `esModuleInterop`
- **Output**: Source maps and declaration files generated
- **Test exclusions**: `tests/`, `node_modules/`, `dist/` excluded from compilation
