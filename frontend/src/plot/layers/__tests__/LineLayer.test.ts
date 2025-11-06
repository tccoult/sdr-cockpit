import { describe, expect, it, vi } from "vitest";
import { createLineLayer } from "../../layers/LineLayer";
import { defaultTheme } from "../../theme";
import type { LayerCreateContext, LayerRenderContext, Viewport } from "../../types";

const dimensions = {
  width: 100,
  height: 50,
  devicePixelRatio: 1,
} as const;

function createViewportStub() {
  const projectedX: number[] = [];
  const projectedY: number[] = [];
  const viewport: Viewport = {
    projectX: (value: number) => {
      projectedX.push(value);
      return value;
    },
    projectY: (value: number) => {
      projectedY.push(value);
      return value;
    },
    invertX: (pixel: number) => pixel,
    invertY: (pixel: number) => pixel,
    rect: new DOMRect(0, 0, dimensions.width, dimensions.height),
    xRange: { min: 0, max: 10 },
    yRange: { min: 0, max: 10 },
    updateDimensions: vi.fn(),
    setXRange: vi.fn(),
    setYRange: vi.fn(),
  };
  return { viewport, projectedX, projectedY };
}

function createContext() {
  const requestDraw = vi.fn();
  const invalidateLayer = vi.fn();
  const invalidateSurface = vi.fn();
  const destroyCallbacks: Array<() => void> = [];
  const { viewport, projectedX, projectedY } = createViewportStub();
  const notifyLayerOrderChange = vi.fn();
  const layerContext: LayerCreateContext = {
    viewport,
    theme: defaultTheme,
    requestDraw,
    invalidateLayer,
    invalidateSurface,
    addDestroyCallback: (fn) => destroyCallbacks.push(fn),
    formatAxisValue: (_axis, value) => value.toString(),
    notifyLayerOrderChange,
  };
  const renderContext: LayerRenderContext = {
    viewport,
    dimensions,
    now: 0,
  };
  return {
    layerContext,
    renderContext,
    requestDraw,
    invalidateLayer,
    invalidateSurface,
    destroyCallbacks,
    projectedX,
    projectedY,
  };
}

function createCanvasContext() {
  const moveToCalls: Array<[number, number]> = [];
  const lineToCalls: Array<[number, number]> = [];
  const arcCalls: Array<[number, number, number, number, number]> = [];
  const fillCalls: number[] = [];
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn((x: number, y: number) => {
      moveToCalls.push([x, y]);
    }),
    lineTo: vi.fn((x: number, y: number) => {
      lineToCalls.push([x, y]);
    }),
    stroke: vi.fn(),
    fill: vi.fn(() => {
      fillCalls.push(1);
    }),
    arc: vi.fn((x: number, y: number, r: number, sa: number, ea: number) => {
      arcCalls.push([x, y, r, sa, ea]);
    }),
    setLineDash: vi.fn(),
    closePath: vi.fn(),
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: "",
    fillStyle: "",
  };
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    moveToCalls,
    lineToCalls,
    arcCalls,
    fillCalls,
  };
}

describe("LineLayer", () => {
  it("clones incoming data and schedules renders", () => {
    const { layerContext, renderContext, invalidateLayer, projectedX } = createContext();
    const layer = createLineLayer(layerContext, {});
    const x = new Float32Array([0, 1]);
    const y = new Float32Array([0, 2]);

    layer.setXY(x, y);
    expect(invalidateLayer).toHaveBeenCalledWith(layer.id);

    x[1] = 5;
    y[1] = 7;
    const { ctx } = createCanvasContext();
    layer.draw(ctx, renderContext);

    expect(projectedX).toContain(1);
    expect(projectedX).not.toContain(5);
  });

  it("updates domains after append and exposes extents", () => {
    const { layerContext } = createContext();
    const layer = createLineLayer(layerContext, {});
    layer.setXY(new Float32Array([0, 1]), new Float32Array([1, 2]));
    layer.appendXY(new Float32Array([2]), new Float32Array([3]));
    const extents = layer.getExtents?.();
    expect(extents?.x).toEqual({ min: 0, max: 2 });
    expect(extents?.y).toEqual({ min: 1, max: 3 });
  });

  it("renders points mode using arc calls", () => {
    const { layerContext, renderContext } = createContext();
    const layer = createLineLayer(layerContext, { mode: "points", pointSize: 4 });
    layer.setXY(
      new Float32Array([0, 1, 2]),
      new Float32Array([0, 1, 0])
    );
    const { ctx, arcCalls } = createCanvasContext();
    layer.draw(ctx, renderContext);
    expect(arcCalls.length).toBe(3);
    expect(arcCalls[0][2]).toBeCloseTo(2); // radius = pointSize/2
  });

  it("fills area to baseline when enabled", () => {
    const { layerContext, renderContext } = createContext();
    const layer = createLineLayer(layerContext, {
      fill: { enabled: true, opacity: 0.5 },
      baseline: 0,
    });
    layer.setXY(new Float32Array([0, 1]), new Float32Array([0, 1]));
    const { ctx, lineToCalls, fillCalls } = createCanvasContext();
    layer.draw(ctx, renderContext);
    expect(fillCalls.length).toBe(1);
    const baselineSegments = lineToCalls.filter(([, y]) => y === 0);
    expect(baselineSegments.length).toBeGreaterThanOrEqual(1);
  });

  it("skips drawing when invisible", () => {
    const { layerContext, renderContext, projectedX } = createContext();
    const layer = createLineLayer(layerContext, {});
    layer.setXY(new Float32Array([0, 1]), new Float32Array([0, 1]));
    layer.setVisible(false);
    const { ctx } = createCanvasContext();
    layer.draw(ctx, renderContext);
    expect(projectedX.length).toBe(0);
  });
});
