/**
 * Tests for color map utilities
 *
 * Color LUT generation affects visual quality of spectrograms.
 * Incorrect interpolation causes banding artifacts.
 */

import { describe, expect, it } from 'vitest';
import { buildColorLUT, type ColorMap, PLASMA } from '../colorMaps';

describe('buildColorLUT', () => {
  // Simple two-color gradient for testing
  const twoColorMap: ColorMap = {
    id: 'test-gradient',
    name: 'Test Gradient',
    colors: [
      [0, 0, 0], // Black
      [255, 255, 255], // White
    ],
  };

  // Three-color gradient
  const threeColorMap: ColorMap = {
    id: 'test-three',
    name: 'Test Three',
    colors: [
      [255, 0, 0], // Red
      [0, 255, 0], // Green
      [0, 0, 255], // Blue
    ],
  };

  describe('basic LUT generation', () => {
    it('creates 256-entry RGBA LUT', () => {
      const lut = buildColorLUT(twoColorMap);
      expect(lut.length).toBe(256 * 4);
      expect(lut instanceof Uint8ClampedArray).toBe(true);
    });

    it('sets alpha to 255 for all entries', () => {
      const lut = buildColorLUT(twoColorMap);
      for (let i = 0; i < 256; i++) {
        expect(lut[i * 4 + 3]).toBe(255);
      }
    });
  });

  describe('two-color interpolation', () => {
    it('starts with first color at index 0', () => {
      const lut = buildColorLUT(twoColorMap);
      expect(lut[0]).toBe(0); // R
      expect(lut[1]).toBe(0); // G
      expect(lut[2]).toBe(0); // B
    });

    it('ends with second color at index 255', () => {
      const lut = buildColorLUT(twoColorMap);
      expect(lut[255 * 4 + 0]).toBe(255); // R
      expect(lut[255 * 4 + 1]).toBe(255); // G
      expect(lut[255 * 4 + 2]).toBe(255); // B
    });

    it('interpolates midpoint correctly', () => {
      const lut = buildColorLUT(twoColorMap);
      // Index 127 or 128 should be near gray (127-128)
      const mid = 127;
      expect(lut[mid * 4 + 0]).toBeGreaterThan(120);
      expect(lut[mid * 4 + 0]).toBeLessThan(135);
    });

    it('produces monotonic gradient (no banding)', () => {
      const lut = buildColorLUT(twoColorMap);
      for (let i = 1; i < 256; i++) {
        const prevR = lut[(i - 1) * 4];
        const currR = lut[i * 4];
        // Each value should be >= previous (monotonically increasing)
        expect(currR).toBeGreaterThanOrEqual(prevR);
      }
    });
  });

  describe('three-color interpolation', () => {
    it('starts with first color', () => {
      const lut = buildColorLUT(threeColorMap);
      expect(lut[0]).toBe(255); // R
      expect(lut[1]).toBe(0); // G
      expect(lut[2]).toBe(0); // B
    });

    it('ends with last color', () => {
      const lut = buildColorLUT(threeColorMap);
      expect(lut[255 * 4 + 0]).toBe(0); // R
      expect(lut[255 * 4 + 1]).toBe(0); // G
      expect(lut[255 * 4 + 2]).toBe(255); // B
    });

    it('reaches middle color at segment boundary', () => {
      const lut = buildColorLUT(threeColorMap);
      // With 3 colors, segment boundary is at t=0.5, index ≈ 127-128
      // Should be close to pure green
      const mid = 127;
      // Red should be decreasing, Green should be high
      expect(lut[mid * 4 + 0]).toBeLessThan(10); // R near 0
      expect(lut[mid * 4 + 1]).toBeGreaterThan(245); // G near 255
      expect(lut[mid * 4 + 2]).toBeLessThan(10); // B near 0
    });
  });

  describe('multi-segment interpolation', () => {
    it('handles 8-color PLASMA colormap', () => {
      const lut = buildColorLUT(PLASMA);
      expect(lut.length).toBe(256 * 4);

      // First color: [13, 8, 135]
      expect(lut[0]).toBe(13);
      expect(lut[1]).toBe(8);
      expect(lut[2]).toBe(135);

      // Last color: [240, 249, 33]
      expect(lut[255 * 4 + 0]).toBe(240);
      expect(lut[255 * 4 + 1]).toBe(249);
      expect(lut[255 * 4 + 2]).toBe(33);
    });

    it('produces smooth transitions (no discontinuities)', () => {
      const lut = buildColorLUT(PLASMA);
      const maxJump = 50; // Allow some color change but not huge jumps

      for (let i = 1; i < 256; i++) {
        const prevIdx = (i - 1) * 4;
        const currIdx = i * 4;

        const dR = Math.abs(lut[currIdx] - lut[prevIdx]);
        const dG = Math.abs(lut[currIdx + 1] - lut[prevIdx + 1]);
        const dB = Math.abs(lut[currIdx + 2] - lut[prevIdx + 2]);

        expect(dR).toBeLessThan(maxJump);
        expect(dG).toBeLessThan(maxJump);
        expect(dB).toBeLessThan(maxJump);
      }
    });
  });

  describe('edge cases', () => {
    it('handles two identical colors (solid fill)', () => {
      const solidMap: ColorMap = {
        id: 'solid',
        name: 'Solid',
        colors: [
          [128, 128, 128],
          [128, 128, 128],
        ],
      };

      const lut = buildColorLUT(solidMap);

      for (let i = 0; i < 256; i++) {
        expect(lut[i * 4 + 0]).toBe(128);
        expect(lut[i * 4 + 1]).toBe(128);
        expect(lut[i * 4 + 2]).toBe(128);
      }
    });

    it('clamps RGB values to 0-255 via Uint8ClampedArray', () => {
      // Even if interpolation produced out-of-range values,
      // Uint8ClampedArray would clamp them
      const lut = buildColorLUT(twoColorMap);

      for (let i = 0; i < 256; i++) {
        expect(lut[i * 4 + 0]).toBeGreaterThanOrEqual(0);
        expect(lut[i * 4 + 0]).toBeLessThanOrEqual(255);
        expect(lut[i * 4 + 1]).toBeGreaterThanOrEqual(0);
        expect(lut[i * 4 + 1]).toBeLessThanOrEqual(255);
        expect(lut[i * 4 + 2]).toBeGreaterThanOrEqual(0);
        expect(lut[i * 4 + 2]).toBeLessThanOrEqual(255);
      }
    });

    it('handles segment boundary precision', () => {
      // With many colors, floating point precision at boundaries matters
      const manyColors: ColorMap = {
        id: 'many',
        name: 'Many',
        colors: [
          [0, 0, 0],
          [50, 50, 50],
          [100, 100, 100],
          [150, 150, 150],
          [200, 200, 200],
          [255, 255, 255],
        ],
      };

      const lut = buildColorLUT(manyColors);

      // Should still produce valid output without NaN or undefined
      for (let i = 0; i < 256; i++) {
        expect(Number.isFinite(lut[i * 4 + 0])).toBe(true);
        expect(Number.isFinite(lut[i * 4 + 1])).toBe(true);
        expect(Number.isFinite(lut[i * 4 + 2])).toBe(true);
      }
    });
  });
});
