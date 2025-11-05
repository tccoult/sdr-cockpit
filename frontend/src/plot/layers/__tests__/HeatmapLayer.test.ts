import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHeatmapLayer } from "../../layers/HeatmapLayer";
import { defaultTheme } from "../../theme/theme";
import type {
  LayerCreateContext,
  LayerRenderContext,
  Viewport,
} from "../../types";

const dimensions = {
  width: 200,
  height: 100,
  devicePixelRatio: 1,
} as const;

type BufferCall = { imageData: ImageData; x: number; y: number };

class FakeBufferContext {
  putImageDataCalls: BufferCall[] = [];

  putImageData(imageData: ImageData, x: number, y: number) {
    this.putImageDataCalls.push({ imageData, x, y });
  }
}

const nativeOffscreen = Reflect.get(
  globalThis,
  "OffscreenCanvas"
) as typeof OffscreenCanvas | undefined;
const nativeImageData = Reflect.get(
  globalThis,
  "ImageData"
) as typeof ImageData | undefined;
let bufferContexts: FakeBufferContext[] = [];

class FakeOffscreenCanvas {
  private readonly ctx: FakeBufferContext;
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.ctx = new FakeBufferContext();
    bufferContexts.push(this.ctx);
  }

  getContext(type: string) {
    if (type === "2d") {
      return this.ctx as unknown as CanvasRenderingContext2D;
    }
    return null;
  }
}

class FakeImageData {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;

  constructor(dataOrWidth: Uint8ClampedArray | number, width?: number, height?: number) {
    if (typeof dataOrWidth === "number") {
      const w = dataOrWidth;
      const h = width ?? 0;
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    } else {
      this.data = dataOrWidth;
      this.width = width ?? 0;
      this.height = height ?? 0;
    }
  }
}

beforeEach(() => {
  bufferContexts = [];
  Reflect.set(globalThis, "OffscreenCanvas", FakeOffscreenCanvas);
  if (!nativeImageData) {
    Reflect.set(globalThis, "ImageData", FakeImageData);
  }
});

afterAll(() => {
  if (nativeOffscreen) {
    Reflect.set(globalThis, "OffscreenCanvas", nativeOffscreen);
  } else {
    Reflect.deleteProperty(globalThis, "OffscreenCanvas");
  }
  if (nativeImageData) {
    Reflect.set(globalThis, "ImageData", nativeImageData);
  } else {
    Reflect.deleteProperty(globalThis, "ImageData");
  }
});

function createViewportStub(): Viewport {
  return {
    projectX: (value: number) => value,
    projectY: (value: number) => value,
    invertX: (pixel: number) => pixel,
    invertY: (pixel: number) => pixel,
    rect: new DOMRect(0, 0, dimensions.width, dimensions.height),
    xRange: { min: 0, max: 10 },
    yRange: { min: 0, max: 10 },
    updateDimensions: vi.fn(),
    setXRange: vi.fn(),
    setYRange: vi.fn(),
  };
}

function createLayerContext(): {
  layerContext: LayerCreateContext;
  renderContext: LayerRenderContext;
  requestDraw: ReturnType<typeof vi.fn>;
} {
  const requestDraw = vi.fn();
  const layerContext: LayerCreateContext = {
    viewport: createViewportStub(),
    theme: defaultTheme,
    requestDraw,
    addDestroyCallback: vi.fn(),
    formatAxisValue: (_axis, value) => value.toString(),
    notifyLayerOrderChange: vi.fn(),
  };
  const renderContext: LayerRenderContext = {
    viewport: layerContext.viewport,
    dimensions,
    now: 0,
  };
  return { layerContext, renderContext, requestDraw };
}

function createDrawContext() {
  const drawImageCalls: Array<Parameters<CanvasRenderingContext2D["drawImage"]>> =
    [];
  const smoothingChanges: boolean[] = [];
  let smoothing = true;
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    drawImage: vi.fn((...args: Parameters<CanvasRenderingContext2D["drawImage"]>) => {
      drawImageCalls.push(args);
    }),
    get imageSmoothingEnabled() {
      return smoothing;
    },
    set imageSmoothingEnabled(value: boolean) {
      smoothing = value;
      smoothingChanges.push(value);
    },
    globalAlpha: 1,
  };
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    drawImageCalls,
    smoothingChanges,
  };
}

function createColormap() {
  const lut = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i += 1) {
    lut[i * 4 + 0] = i;
    lut[i * 4 + 1] = i;
    lut[i * 4 + 2] = i;
    lut[i * 4 + 3] = 255;
  }
  return lut;
}

describe("HeatmapLayer", () => {
  it("colorizes streamed columns and schedules redraws", () => {
    const { layerContext, renderContext, requestDraw } = createLayerContext();
    const layer = createHeatmapLayer(layerContext, {
      width: 2,
      height: 2,
      colormap: createColormap(),
    });

    layer.pushColumn(new Float32Array([-120, 0]));
    expect(requestDraw).toHaveBeenCalledTimes(1);
    expect(bufferContexts).toHaveLength(1);
    const calls = bufferContexts[0].putImageDataCalls;
    expect(calls).toHaveLength(0);

    layer.pushColumn(new Float32Array([-60, -60]));
    expect(requestDraw).toHaveBeenCalledTimes(2);

    const { ctx, drawImageCalls, smoothingChanges } = createDrawContext();
    layer.draw(ctx, renderContext);
    expect(smoothingChanges).toEqual([false, true]);
    expect(bufferContexts[0].putImageDataCalls.length).toBe(1);
    expect(drawImageCalls).toHaveLength(1);
    const [, , , , , , , destWidth, destHeight] = drawImageCalls[0];
    expect(destWidth).toBe(dimensions.width);
    expect(destHeight).toBe(dimensions.height);
  });

  it("draws wrapped buffers with two blits", () => {
    const { layerContext, renderContext } = createLayerContext();
    const layer = createHeatmapLayer(layerContext, {
      width: 2,
      height: 2,
      colormap: createColormap(),
    });
    layer.pushColumn(new Float32Array([-120, 0]));
    layer.pushColumn(new Float32Array([-60, 0]));
    layer.pushColumn(new Float32Array([-90, -90])); // wraps

    const { ctx, drawImageCalls } = createDrawContext();
    layer.draw(ctx, renderContext);
    expect(bufferContexts[0].putImageDataCalls.length).toBeGreaterThanOrEqual(1);
    expect(drawImageCalls.length).toBe(2);
  });

  it("throws when column size mismatches", () => {
    const { layerContext } = createLayerContext();
    const layer = createHeatmapLayer(layerContext, {
      width: 2,
      height: 2,
      colormap: createColormap(),
    });
    expect(() => layer.pushColumn(new Float32Array([0]))).toThrow(
      /expected column of length 2/i
    );
  });

  it("loads full images and redraws", () => {
    const { layerContext, renderContext, requestDraw } = createLayerContext();
    const layer = createHeatmapLayer(layerContext, {
      width: 2,
      height: 2,
      colormap: createColormap(),
    });
    layer.setFullImage(
      [
        [-120, -60],
        [0, 0],
      ],
      true
    );
    expect(requestDraw).toHaveBeenCalledTimes(1);
    const calls = bufferContexts[0].putImageDataCalls;
    expect(calls.length).toBe(0);

    const { ctx, drawImageCalls } = createDrawContext();
    layer.draw(ctx, renderContext);
    expect(bufferContexts[0].putImageDataCalls.length).toBe(1);
    expect(drawImageCalls.length).toBe(1);
  });
});
