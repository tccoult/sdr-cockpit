import { resolveColormap } from "../color/colormap";
import type {
  HeatmapLayerHandle,
  HeatmapLayerOptions,
  Layer,
  LayerCreateContext,
  LayerRenderContext,
} from "../types";

export interface HeatmapLayer extends Layer, HeatmapLayerHandle {}

const DEFAULT_CLIP = { min: -120, max: 0 };
const MIN_CLIP_SPAN = 1e-6;

let idCounter = 0;

type BufferCanvas = HTMLCanvasElement | OffscreenCanvas;

export function createHeatmapLayer(
  context: LayerCreateContext,
  options: HeatmapLayerOptions
): HeatmapLayer {
  if (options.width <= 0 || options.height <= 0) {
    throw new Error("HeatmapLayer requires positive width and height");
  }

  const id = options.id ?? `heatmap-${idCounter++}`;
  let visible = true;
  let zIndex = 0;
  const opacity = options.opacity ?? 1;
  const width = Math.floor(options.width);
  const height = Math.floor(options.height);

  const colormap =
    options.colormap instanceof Uint8ClampedArray
      ? options.colormap
      : resolveColormap(
          typeof options.colormap === "string"
            ? options.colormap
            : undefined
        );

  let clip = normalizeClip(options.clip ?? DEFAULT_CLIP);

  const bufferCanvas = createBufferCanvas(width, height);
  const bufferCtx = bufferCanvas.getContext("2d");
  if (!bufferCtx) {
    throw new Error("HeatmapLayer requires a 2D rendering context");
  }

  const columnBuffer = new Uint8ClampedArray(height * 4);
  const columnImageData = new ImageData(columnBuffer, 1, height);
  const fullBuffer = new Uint8ClampedArray(width * height * 4);
  const fullImageData = new ImageData(fullBuffer, width, height);

  let head = 0; // Next column to overwrite
  let filled = 0; // Number of columns containing data
  const requestDraw = context.requestDraw;

  const valueToIndex = (value: number) => {
    if (!Number.isFinite(value)) {
      return 0;
    }
    const span = clip.max - clip.min || MIN_CLIP_SPAN;
    const normalized = (value - clip.min) / span;
    const clamped = Math.max(0, Math.min(1, normalized));
    return Math.min(255, Math.max(0, Math.round(clamped * 255)));
  };

  const writeColumn = (
    columnIndex: number,
    values: Float32Array | number[]
  ) => {
    const column = values instanceof Float32Array ? values : Float32Array.from(values);
    if (column.length !== height) {
      throw new Error(
        `HeatmapLayer "${id}" expected column of length ${height}, received ${column.length}`
      );
    }

    for (let y = 0; y < height; y += 1) {
      const value = column[y];
      const lutIndex = valueToIndex(value) * 4;
      const targetRow = height - 1 - y;
      const bufferIndex = targetRow * 4;
      columnBuffer[bufferIndex] = colormap[lutIndex];
      columnBuffer[bufferIndex + 1] = colormap[lutIndex + 1];
      columnBuffer[bufferIndex + 2] = colormap[lutIndex + 2];
      columnBuffer[bufferIndex + 3] = 255;
      const fullIndex = (targetRow * width + columnIndex) * 4;
      fullBuffer[fullIndex] = colormap[lutIndex];
      fullBuffer[fullIndex + 1] = colormap[lutIndex + 1];
      fullBuffer[fullIndex + 2] = colormap[lutIndex + 2];
      fullBuffer[fullIndex + 3] = 255;
    }

    bufferCtx.putImageData(columnImageData, columnIndex, 0);
  };

  const redrawFullBuffer = () => {
    bufferCtx.putImageData(fullImageData, 0, 0);
  };

  const pushColumn = (values: Float32Array | number[]) => {
    const targetColumn = head;
    head = (head + 1) % width;
    filled = Math.min(width, filled + 1);
    writeColumn(targetColumn, values);
    requestDraw();
  };

  const setFullImage = (
    data: Float32Array | number[][],
    normalize?: boolean
  ) => {
    let source: Float32Array;
    if (Array.isArray(data)) {
      if (data.length !== height) {
        throw new Error(
          `HeatmapLayer "${id}" expected ${height} rows in setFullImage`
        );
      }
      source = new Float32Array(width * height);
      for (let row = 0; row < height; row += 1) {
        const rowValues = data[row];
        if (rowValues.length !== width) {
          throw new Error(
            `HeatmapLayer "${id}" expected row ${row} to have ${width} columns`
          );
        }
        for (let col = 0; col < width; col += 1) {
          source[row * width + col] = rowValues[col];
        }
      }
    } else {
      if (data.length !== width * height) {
        throw new Error(
          `HeatmapLayer "${id}" setFullImage expected Float32Array of length ${
            width * height
          }, received ${data.length}`
        );
      }
      source = data.slice();
    }

    if (normalize) {
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < source.length; i += 1) {
        const value = source[i];
        if (!Number.isFinite(value)) continue;
        if (value < min) min = value;
        if (value > max) max = value;
      }
      if (min < max && Number.isFinite(min) && Number.isFinite(max)) {
        clip = normalizeClip({ min, max });
      }
    }

    for (let col = 0; col < width; col += 1) {
      const columnValues = new Float32Array(height);
      for (let row = 0; row < height; row += 1) {
        columnValues[row] = source[row * width + col];
      }
      writeColumn(col, columnValues);
    }
    filled = width;
    head = 0;
    redrawFullBuffer();
    requestDraw();
  };

  const draw = (ctx: CanvasRenderingContext2D, renderContext: LayerRenderContext) => {
    if (!visible || filled === 0) return;
    const { viewport } = renderContext;
    const rect = viewport.rect;
    if (rect.width <= 0 || rect.height <= 0) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;

    const activeColumns = filled;
    const startIndex = (head + width - activeColumns) % width;
    const drawWidth = rect.width;
    const drawHeight = rect.height;
    const scalePerColumn = drawWidth / width;
    let destX = rect.left;

    const firstSpan = Math.min(width - startIndex, activeColumns);
    if (firstSpan > 0) {
      ctx.drawImage(
        bufferCanvas as CanvasImageSource,
        startIndex,
        0,
        firstSpan,
        height,
        destX,
        rect.top,
        firstSpan * scalePerColumn,
        drawHeight
      );
      destX += firstSpan * scalePerColumn;
    }

    const remaining = activeColumns - firstSpan;
    if (remaining > 0) {
      ctx.drawImage(
        bufferCanvas as CanvasImageSource,
        0,
        0,
        remaining,
        height,
        destX,
        rect.top,
        remaining * scalePerColumn,
        drawHeight
      );
    }

    ctx.imageSmoothingEnabled = prevSmoothing;
    ctx.restore();
  };

  return {
    id,
    phase: "content",
    get visible() {
      return visible;
    },
    set visible(value: boolean) {
      visible = value;
      requestDraw();
    },
    get zIndex() {
      return zIndex;
    },
    set zIndex(value: number) {
      zIndex = value;
      requestDraw();
    },
    getExtents() {
      return null;
    },
    draw,
    setVisible(value: boolean) {
      visible = value;
      requestDraw();
    },
    pushColumn(values: Float32Array | number[]) {
      pushColumn(values);
    },
    setFullImage(data: Float32Array | number[][], normalize?: boolean) {
      setFullImage(data, normalize);
    },
    remove() {
      visible = false;
      filled = 0;
      head = 0;
      requestDraw();
    },
    destroy() {
      visible = false;
    },
  };
}

function createBufferCanvas(width: number, height: number): BufferCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  throw new Error("HeatmapLayer requires canvas support");
}

function normalizeClip(clip: { min: number; max: number }): { min: number; max: number } {
  let { min, max } = clip;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = DEFAULT_CLIP.min;
    max = DEFAULT_CLIP.max;
  }
  if (min === max) {
    max = min + MIN_CLIP_SPAN;
  }
  if (min > max) {
    const temp = min;
    min = max;
    max = temp;
  }
  if (max - min < MIN_CLIP_SPAN) {
    max = min + MIN_CLIP_SPAN;
  }
  return { min, max };
}
