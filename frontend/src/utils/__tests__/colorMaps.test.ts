/**
 * Tests for color map utilities
 *
 * Incorrect interpolation causes visible banding artifacts in spectrograms.
 */

import { describe, expect, it } from 'vitest';
import { buildColorLUT, PLASMA } from '../colorMaps';

describe('buildColorLUT', () => {
  it('produces smooth transitions without banding', () => {
    const lut = buildColorLUT(PLASMA);
    const maxJump = 50;

    expect(lut.length).toBe(256 * 4);

    for (let i = 1; i < 256; i++) {
      const prevIdx = (i - 1) * 4;
      const currIdx = i * 4;

      expect(Math.abs(lut[currIdx] - lut[prevIdx])).toBeLessThan(maxJump);
      expect(Math.abs(lut[currIdx + 1] - lut[prevIdx + 1])).toBeLessThan(maxJump);
      expect(Math.abs(lut[currIdx + 2] - lut[prevIdx + 2])).toBeLessThan(maxJump);
    }
  });
});
