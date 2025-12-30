import { describe, expect, it } from "vitest";
import {
  computeDbRangeWithPadding,
  DEFAULT_DB_RANGE,
  validateDbRange,
} from "./dbRange";

describe("computeDbRangeWithPadding", () => {
  it("returns default range for null/invalid metrics", () => {
    expect(computeDbRangeWithPadding(null)).toEqual(DEFAULT_DB_RANGE);
    expect(computeDbRangeWithPadding({ minDb: NaN, maxDb: -40 })).toEqual(
      DEFAULT_DB_RANGE
    );
    expect(computeDbRangeWithPadding({ minDb: -80, maxDb: Infinity })).toEqual(
      DEFAULT_DB_RANGE
    );
  });

  it("expands range with padding", () => {
    const result = computeDbRangeWithPadding({ minDb: -80, maxDb: -40 });
    // Padding should expand the range beyond the input
    expect(result.minDb).toBeLessThan(-80);
    expect(result.maxDb).toBeGreaterThan(-40);
    // Results should be integers (floor/ceil)
    expect(Number.isInteger(result.minDb)).toBe(true);
    expect(Number.isInteger(result.maxDb)).toBe(true);
  });

  it("larger padding factor expands range more", () => {
    const small = computeDbRangeWithPadding({ minDb: -80, maxDb: -40 }, 0.1);
    const large = computeDbRangeWithPadding({ minDb: -80, maxDb: -40 }, 0.2);
    expect(large.maxDb - large.minDb).toBeGreaterThan(
      small.maxDb - small.minDb
    );
  });

  it("adds symmetric padding when min equals max", () => {
    const result = computeDbRangeWithPadding({ minDb: -60, maxDb: -60 });
    expect(result.maxDb).toBeGreaterThan(result.minDb);
    expect(result.maxDb - result.minDb).toBeGreaterThanOrEqual(10);
    // Center should be close to original value
    const center = (result.minDb + result.maxDb) / 2;
    expect(Math.abs(center - (-60))).toBeLessThanOrEqual(1);
  });

  it("handles inverted range (max < min)", () => {
    const result = computeDbRangeWithPadding({ minDb: -40, maxDb: -80 });
    expect(result.maxDb).toBeGreaterThan(result.minDb);
  });
});

describe("validateDbRange", () => {
  it("returns valid range unchanged", () => {
    const range = { minDb: -80, maxDb: -40 };
    expect(validateDbRange(range)).toEqual(range);
  });

  it("returns default for invalid ranges", () => {
    expect(validateDbRange({ minDb: NaN, maxDb: -40 })).toEqual(
      DEFAULT_DB_RANGE
    );
    expect(validateDbRange({ minDb: -40, maxDb: -80 })).toEqual(
      DEFAULT_DB_RANGE
    );
    expect(validateDbRange({ minDb: -60, maxDb: -60 })).toEqual(
      DEFAULT_DB_RANGE
    );
  });
});
