import { describe, expect, it } from "vitest";
import {
  createDecimationScratch,
  minMaxDecimateIndices,
} from "./decimate";

const range = { min: 0, max: 10 };

describe("minMaxDecimateIndices", () => {
  it("returns original data when series is short", () => {
    const x = new Float32Array([0, 1, 2]);
    const y = new Float32Array([0, 1, 0]);
    const scratch = createDecimationScratch();
    const result = minMaxDecimateIndices(x, y, range, 100, scratch);
    const indices = Array.from(result.indices.slice(0, result.count));
    expect(indices).toEqual([0, 1, 2]);
    expect(indices.map((idx) => y[idx])).toEqual([0, 1, 0]);
  });

  it("reduces data while preserving important extrema", () => {
    const x = new Float32Array([0, 1, 2, 3, 4, 5]);
    const y = new Float32Array([0, 2, -2, 3, -3, 1]);
    const scratch = createDecimationScratch();
    const result = minMaxDecimateIndices(x, y, range, 3, scratch);
    expect(result.count).toBeGreaterThan(0);
    expect(result.count).toBeLessThanOrEqual(6);
    const sampled = Array.from(result.indices.slice(0, result.count)).map(
      (idx) => y[idx]
    );
    expect(Math.min(...sampled)).toBeCloseTo(-3);
    expect(Math.max(...sampled)).toBeCloseTo(3);
  });

  it("ignores points outside the range", () => {
    const x = new Float32Array([-5, 0, 5, 15]);
    const y = new Float32Array([0, 1, -1, 0]);
    const scratch = createDecimationScratch();
    const result = minMaxDecimateIndices(x, y, range, 4, scratch);
    const indices = Array.from(result.indices.slice(0, result.count));
    expect(indices).toEqual([1, 2]);
    expect(indices.map((idx) => x[idx])).toEqual([0, 5]);
    expect(indices.map((idx) => y[idx])).toEqual([1, -1]);
  });

  it("reuses the same output array across invocations", () => {
    const x = new Float32Array([0, 1, 2, 3]);
    const y = new Float32Array([0, 1, 0, 1]);
    const scratch = createDecimationScratch();
    const first = minMaxDecimateIndices(x, y, range, 3, scratch);
    const second = minMaxDecimateIndices(x, y, range, 3, scratch);
    expect(first.indices).toBe(second.indices);
  });
});
