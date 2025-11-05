import { describe, expect, it } from "vitest";
import { createViewport } from "../../engine/Viewport";

describe("createViewport", () => {
  it("provides a non-zero span when min equals max", () => {
    const viewport = createViewport({
      initialXRange: { min: 5, max: 5 },
      initialYRange: { min: 0, max: 0 },
    });

    expect(viewport.xRange.max).toBeGreaterThan(viewport.xRange.min);
    expect(viewport.yRange.max).toBeGreaterThan(viewport.yRange.min);
  });

  it("uses canvas dimensions when getBoundingClientRect is empty", () => {
    const viewport = createViewport({});
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;

    viewport.updateDimensions(canvas, 1);

    expect(viewport.rect.width).toBeCloseTo(320);
    expect(viewport.rect.height).toBeCloseTo(180);
  });
});
