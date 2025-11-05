import { describe, expect, it } from "vitest";
import {
  beginPan,
  createPanState,
  endPan,
  updatePan,
} from "../../input/pointer";

const viewportStub = {
  projectX: (value: number) => value,
  projectY: (value: number) => value,
  invertX: (pixel: number) => pixel,
  invertY: (pixel: number) => pixel,
  rect: new DOMRect(0, 0, 200, 100),
  xRange: { min: 0, max: 10 },
  yRange: { min: 0, max: 5 },
  updateDimensions: () => {},
  setXRange: () => {},
  setYRange: () => {},
};

describe("pointer pan helpers", () => {
  it("computes new ranges when panning in X", () => {
    const state = createPanState();
    beginPan(
      state,
      1,
      50,
      20,
      viewportStub,
      { x: { min: 0, max: 10 }, y: { min: 0, max: 5 } }
    );
    const result = updatePan(state, 70, 20, { allowX: true, allowY: false });
    expect(result.x).toBeDefined();
    expect(result?.x?.min).toBeCloseTo(-1);
    expect(result?.x?.max).toBeCloseTo(9);
    expect(result.y).toBeUndefined();
    endPan(state);
    expect(state.active).toBe(false);
  });

  it("computes new ranges when panning in Y", () => {
    const state = createPanState();
    beginPan(
      state,
      1,
      10,
      20,
      viewportStub,
      { x: { min: 0, max: 10 }, y: { min: 0, max: 5 } }
    );
    const result = updatePan(state, 10, 40, { allowX: false, allowY: true });
    expect(result.x).toBeUndefined();
    expect(result.y).toBeDefined();
    expect(result?.y?.min).toBeCloseTo(1);
    expect(result?.y?.max).toBeCloseTo(6);
  });

  it("returns empty object when pan inactive", () => {
    const state = createPanState();
    const result = updatePan(state, 10, 10, { allowX: true, allowY: true });
    expect(result).toEqual({});
  });
});
