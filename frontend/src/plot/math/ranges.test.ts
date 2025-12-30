import { describe, expect, it } from "vitest";
import {
  MIN_SPAN,
  normalizeRange,
  normalizeRangeOrNull,
  rangesEqual,
} from "./ranges";

describe("normalizeRange", () => {
  it("returns default range for null/undefined input", () => {
    expect(normalizeRange(null)).toEqual({ min: 0, max: 1 });
    expect(normalizeRange(undefined)).toEqual({ min: 0, max: 1 });
  });

  it("returns custom default when provided", () => {
    expect(normalizeRange(null, { min: -100, max: -20 })).toEqual({
      min: -100,
      max: -20,
    });
  });

  it("passes through valid range unchanged", () => {
    const result = normalizeRange({ min: 10, max: 100 });
    expect(result.min).toBe(10);
    expect(result.max).toBe(100);
  });

  it("swaps inverted range (min > max)", () => {
    const result = normalizeRange({ min: 100, max: -50 });
    expect(result.min).toBe(-50);
    expect(result.max).toBe(100);
  });

  it("handles NaN and Infinity values", () => {
    expect(normalizeRange({ min: NaN, max: 100 })).toEqual({ min: 0, max: 1 });
    expect(normalizeRange({ min: 0, max: NaN })).toEqual({ min: 0, max: 1 });
    expect(normalizeRange({ min: -Infinity, max: 100 })).toEqual({
      min: 0,
      max: 1,
    });
  });

  describe("zero-span handling", () => {
    it("adds padding when min equals max at zero", () => {
      const result = normalizeRange({ min: 0, max: 0 });
      expect(result.max - result.min).toBeGreaterThanOrEqual(MIN_SPAN);
      expect(result.min).toBeLessThan(0);
      expect(result.max).toBeGreaterThan(0);
    });

    it("adds symmetric padding when min equals max", () => {
      const positiveResult = normalizeRange({ min: 100, max: 100 });
      expect(positiveResult.max - positiveResult.min).toBeGreaterThan(0);
      expect((positiveResult.min + positiveResult.max) / 2).toBeCloseTo(100, 5);

      const negativeResult = normalizeRange({ min: -60, max: -60 });
      expect(negativeResult.max - negativeResult.min).toBeGreaterThan(0);
      expect((negativeResult.min + negativeResult.max) / 2).toBeCloseTo(-60, 5);
    });

    it("handles very small positive span", () => {
      const result = normalizeRange({ min: 100, max: 100 + 1e-15 });
      expect(result.max - result.min).toBeGreaterThanOrEqual(MIN_SPAN);
    });
  });
});

describe("rangesEqual", () => {
  it("returns true for identical ranges", () => {
    expect(rangesEqual({ min: 0, max: 100 }, { min: 0, max: 100 })).toBe(true);
  });

  it("returns true for ranges within epsilon", () => {
    expect(
      rangesEqual({ min: 0, max: 100 }, { min: 1e-10, max: 100 + 1e-10 })
    ).toBe(true);
  });

  it("returns false for different ranges", () => {
    expect(rangesEqual({ min: 0, max: 100 }, { min: 0, max: 200 })).toBe(false);
  });

  it("respects custom epsilon", () => {
    expect(
      rangesEqual({ min: 0, max: 100 }, { min: 0.5, max: 100 }, 1)
    ).toBe(true);
    expect(
      rangesEqual({ min: 0, max: 100 }, { min: 0.5, max: 100 }, 0.1)
    ).toBe(false);
  });
});

describe("normalizeRangeOrNull", () => {
  it("returns null for null/undefined input", () => {
    expect(normalizeRangeOrNull(null)).toBeNull();
    expect(normalizeRangeOrNull(undefined)).toBeNull();
  });

  it("returns null for NaN and Infinity values", () => {
    expect(normalizeRangeOrNull({ min: NaN, max: 100 })).toBeNull();
    expect(normalizeRangeOrNull({ min: 0, max: NaN })).toBeNull();
    expect(normalizeRangeOrNull({ min: -Infinity, max: 100 })).toBeNull();
  });

  it("normalizes valid range", () => {
    const result = normalizeRangeOrNull({ min: 10, max: 100 });
    expect(result).not.toBeNull();
    expect(result!.min).toBe(10);
    expect(result!.max).toBe(100);
  });

  it("swaps inverted range", () => {
    const result = normalizeRangeOrNull({ min: 100, max: -50 });
    expect(result).not.toBeNull();
    expect(result!.min).toBe(-50);
    expect(result!.max).toBe(100);
  });

  it("adds padding for zero-span range", () => {
    const result = normalizeRangeOrNull({ min: 50, max: 50 });
    expect(result).not.toBeNull();
    expect(result!.max - result!.min).toBeGreaterThan(0);
  });
});
