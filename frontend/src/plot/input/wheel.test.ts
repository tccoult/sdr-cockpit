import { describe, expect, it } from "vitest";
import { applyWheel } from "./wheel";

const xRange = { min: 0, max: 10 };
const yRange = { min: 0, max: 5 };
const rect = new DOMRect(0, 0, 200, 100);

const viewportStub = {
  projectX: (value: number) => value,
  projectY: (value: number) => value,
  invertX: (pixel: number) =>
    xRange.min + (pixel / rect.width) * (xRange.max - xRange.min),
  invertY: (pixel: number) =>
    yRange.max - (pixel / rect.height) * (yRange.max - yRange.min),
  rect,
  xRange,
  yRange,
  updateDimensions: () => {},
  setXRange: () => {},
  setYRange: () => {},
};

describe("wheel helper", () => {
  it("zooms in around anchor point", () => {
    const result = applyWheel(
      { px: 100, py: 50, deltaY: -100 },
      viewportStub,
      { x: { min: 0, max: 10 }, y: { min: 0, max: 5 } },
      { enableX: true, enableY: true, zoomFactor: 0.1 }
    );
    expect(result.x).toBeDefined();
    expect(result?.x?.max ?? 0 - (result?.x?.min ?? 0)).toBeLessThan(10);
    expect(result?.y?.max ?? 0 - (result?.y?.min ?? 0)).toBeLessThan(5);
  });

  it("returns empty when axes disabled", () => {
    const result = applyWheel(
      { px: 50, py: 50, deltaY: -30 },
      viewportStub,
      { x: { min: 0, max: 10 }, y: { min: 0, max: 5 } },
      { enableX: false, enableY: false }
    );
    expect(result).toEqual({});
  });
});
