/**
 * Tests for color map utilities
 *
 * Color LUT generation affects visual quality of spectrograms.
 * Incorrect interpolation causes banding artifacts.
 */

import { describe, expect, it } from 'vitest';
import { buildColorLUT, type ColorMap, PLASMA } from '../colorMaps';

describe('buildColorLUT', () => {
  const twoColorMap: ColorMap = {
    id: 'test-gradient',
    name: 'Test Gradient',
    colors: [
      [0, 0, 0],
      [255, 255, 255],
    ],
  };

  it('creates 256-entry RGBA LUT with alpha=255', () => {
    const lut = buildColorLUT(twoColorMap);
    expect(lut.length).toBe(256 * 4);
    expect(lut instanceof Uint8ClampedArray).toBe(true);

    // Check alpha on a few entries
    expect(lut[3]).toBe(255);
    expect(lut[127 * 4 + 3]).toBe(255);
    expect(lut[255 * 4 + 3]).toBe(255);
  });

  it('interpolates endpoints and midpoint correctly', () => {
    const lut = buildColorLUT(twoColorMap);

    // Start: black
    expect(lut[0]).toBe(0);
    expect(lut[1]).toBe(0);
    expect(lut[2]).toBe(0);

    // End: white
    expect(lut[255 * 4]).toBe(255);
    expect(lut[255 * 4 + 1]).toBe(255);
    expect(lut[255 * 4 + 2]).toBe(255);

    // Midpoint: gray (~127-128)
    expect(lut[127 * 4]).toBeGreaterThan(120);
    expect(lut[127 * 4]).toBeLessThan(135);
  });

  it('handles multi-segment PLASMA colormap', () => {
    const lut = buildColorLUT(PLASMA);

    // First color: [13, 8, 135]
    expect(lut[0]).toBe(13);
    expect(lut[1]).toBe(8);
    expect(lut[2]).toBe(135);

    // Last color: [240, 249, 33]
    expect(lut[255 * 4]).toBe(240);
    expect(lut[255 * 4 + 1]).toBe(249);
    expect(lut[255 * 4 + 2]).toBe(33);
  });

  it('produces smooth transitions without banding', () => {
    const lut = buildColorLUT(PLASMA);
    const maxJump = 50; // Reasonable color change threshold

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
