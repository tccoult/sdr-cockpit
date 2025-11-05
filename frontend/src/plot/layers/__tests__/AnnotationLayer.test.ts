import { describe, expect, it } from "vitest";
import { createAnnotationLayer } from "../../layers/AnnotationLayer";
import { defaultTheme } from "../../theme/theme";

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

function createContext() {
  const requestDraw = () => {};
  return {
    viewport: viewportStub,
    theme: defaultTheme,
    requestDraw,
    addDestroyCallback: () => {},
    formatAxisValue: (_axis: "x" | "y", value: number) => value.toString(),
    notifyLayerOrderChange: () => {},
  };
}

describe("AnnotationLayer", () => {
  it("adds and draws line annotation", () => {
    const layer = createAnnotationLayer(createContext(), {});
    const ctx = {
      save: () => {},
      restore: () => {},
      setLineDash: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      lineWidth: 1,
      strokeStyle: "",
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;

    layer.addAnnotation({ id: "line-1", type: "line", x: 5 });
    expect(() => layer.draw(ctx, { viewport: viewportStub, dimensions: { width: 200, height: 100, devicePixelRatio: 1 }, now: 0 })).not.toThrow();
  });
});
