import { describe, expect, it } from "vitest";
import { minMaxDecimate } from "../../math/decimate";

const range = { min: 0, max: 10 };

describe("minMaxDecimate", () => {
  it("returns original data when series is short", () => {
    const x = new Float32Array([0, 1, 2]);
    const y = new Float32Array([0, 1, 0]);
    const result = minMaxDecimate(x, y, range, 100);
    expect(Array.from(result.x)).toEqual([0, 1, 2]);
    expect(Array.from(result.y)).toEqual([0, 1, 0]);
  });

  it("reduces data while preserving important extrema", () => {
    const x = new Float32Array([0, 1, 2, 3, 4, 5]);
    const y = new Float32Array([0, 2, -2, 3, -3, 1]);
    const result = minMaxDecimate(x, y, range, 3);
    expect(result.x.length).toBeLessThanOrEqual(6);
    expect(result.x.length).toBeGreaterThan(0);
    // Ensure min and max retained
    expect(Math.min(...Array.from(result.y))).toBeCloseTo(-3);
    expect(Math.max(...Array.from(result.y))).toBeCloseTo(3);
  });

  it("ignores points outside the range", () => {
    const x = new Float32Array([-5, 0, 5, 15]);
    const y = new Float32Array([0, 1, -1, 0]);
    const result = minMaxDecimate(x, y, range, 4);
    expect(Array.from(result.x)).toEqual([0, 5]);
    expect(Array.from(result.y)).toEqual([1, -1]);
  });
});
