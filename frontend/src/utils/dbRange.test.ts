import { describe, expect, it } from "vitest";
import {
  computeDbRangeWithPadding,
  DEFAULT_DB_RANGE,
  validateDbRange,
} from "./dbRange";

describe("computeDbRangeWithPadding", () => {
  describe("null/invalid input handling", () => {
    it("returns default range for null metrics", () => {
      expect(computeDbRangeWithPadding(null)).toEqual(DEFAULT_DB_RANGE);
    });

    it("returns default range for NaN minDb", () => {
      expect(computeDbRangeWithPadding({ minDb: NaN, maxDb: -40 })).toEqual(
        DEFAULT_DB_RANGE
      );
    });

    it("returns default range for NaN maxDb", () => {
      expect(computeDbRangeWithPadding({ minDb: -80, maxDb: NaN })).toEqual(
        DEFAULT_DB_RANGE
      );
    });

    it("returns default range for Infinity values", () => {
      expect(
        computeDbRangeWithPadding({ minDb: -Infinity, maxDb: -40 })
      ).toEqual(DEFAULT_DB_RANGE);
      expect(
        computeDbRangeWithPadding({ minDb: -80, maxDb: Infinity })
      ).toEqual(DEFAULT_DB_RANGE);
    });
  });

  describe("normal range with padding", () => {
    it("adds 10% padding by default", () => {
      // Range: -80 to -40 = 40 dB span, 10% = 4 dB padding
      const result = computeDbRangeWithPadding({ minDb: -80, maxDb: -40 });
      expect(result.minDb).toBe(-84); // floor(-80 - 4)
      expect(result.maxDb).toBe(-36); // ceil(-40 + 4)
    });

    it("respects custom padding factor", () => {
      // Range: -80 to -40 = 40 dB span, 20% = 8 dB padding
      const result = computeDbRangeWithPadding({ minDb: -80, maxDb: -40 }, 0.2);
      expect(result.minDb).toBe(-88); // floor(-80 - 8)
      expect(result.maxDb).toBe(-32); // ceil(-40 + 8)
    });

    it("floors minDb and ceils maxDb for clean values", () => {
      const result = computeDbRangeWithPadding({ minDb: -75.5, maxDb: -45.5 });
      expect(Number.isInteger(result.minDb)).toBe(true);
      expect(Number.isInteger(result.maxDb)).toBe(true);
    });
  });

  describe("equal min/max handling", () => {
    it("adds symmetric padding when min equals max", () => {
      const result = computeDbRangeWithPadding({ minDb: -60, maxDb: -60 });
      expect(result.maxDb).toBeGreaterThan(result.minDb);
      // Should use at least 5 dB padding
      expect(result.maxDb - result.minDb).toBeGreaterThanOrEqual(10);
    });

    it("uses minimum 5 dB padding for small values", () => {
      const result = computeDbRangeWithPadding({ minDb: -10, maxDb: -10 });
      // 10% of 10 = 1, but minimum is 5
      expect(result.maxDb - result.minDb).toBeGreaterThanOrEqual(10);
    });

    it("centers the range around the original value", () => {
      const result = computeDbRangeWithPadding({ minDb: -60, maxDb: -60 });
      const center = (result.minDb + result.maxDb) / 2;
      // Center should be close to -60 (within 1 due to floor/ceil)
      expect(Math.abs(center - (-60))).toBeLessThanOrEqual(1);
    });
  });

  describe("inverted range handling", () => {
    it("handles inverted range (max < min)", () => {
      const result = computeDbRangeWithPadding({ minDb: -40, maxDb: -80 });
      expect(result.maxDb).toBeGreaterThan(result.minDb);
    });

    it("centers around midpoint for inverted range", () => {
      const result = computeDbRangeWithPadding({ minDb: -40, maxDb: -80 });
      const center = (result.minDb + result.maxDb) / 2;
      // Center of -40 and -80 is -60
      expect(Math.abs(center - (-60))).toBeLessThanOrEqual(1);
    });
  });

  describe("edge cases", () => {
    it("handles zero dB values", () => {
      const result = computeDbRangeWithPadding({ minDb: 0, maxDb: 0 });
      expect(result.maxDb).toBeGreaterThan(result.minDb);
    });

    it("handles positive dB values", () => {
      const result = computeDbRangeWithPadding({ minDb: 10, maxDb: 20 });
      expect(result.minDb).toBeLessThan(10);
      expect(result.maxDb).toBeGreaterThan(20);
    });

    it("handles very small range", () => {
      const result = computeDbRangeWithPadding({
        minDb: -60.001,
        maxDb: -60,
      });
      expect(result.maxDb).toBeGreaterThan(result.minDb);
    });
  });
});

describe("validateDbRange", () => {
  it("returns valid range unchanged", () => {
    const range = { minDb: -80, maxDb: -40 };
    expect(validateDbRange(range)).toEqual(range);
  });

  it("returns default for NaN values", () => {
    expect(validateDbRange({ minDb: NaN, maxDb: -40 })).toEqual(
      DEFAULT_DB_RANGE
    );
    expect(validateDbRange({ minDb: -80, maxDb: NaN })).toEqual(
      DEFAULT_DB_RANGE
    );
  });

  it("returns default for inverted range", () => {
    expect(validateDbRange({ minDb: -40, maxDb: -80 })).toEqual(
      DEFAULT_DB_RANGE
    );
  });

  it("returns default for equal min/max", () => {
    expect(validateDbRange({ minDb: -60, maxDb: -60 })).toEqual(
      DEFAULT_DB_RANGE
    );
  });
});
