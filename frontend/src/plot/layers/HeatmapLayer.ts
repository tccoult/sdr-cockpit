import { resolveColormap } from "../color/colormap";
import type {
  CursorState,
  HeatmapLayerHandle,
  HeatmapLayerOptions,
  Layer,
  LayerCreateContext,
  LayerRenderContext,
} from "../types";

export interface HeatmapLayer extends Layer, HeatmapLayerHandle {}

const DEFAULT_CLIP = { min: -120, max: 0 };
const MIN_CLIP_SPAN = 1e-6;
const CLIP_EPSILON = 1e-6;

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
          typeof options.colormap === "string" ? options.colormap : undefined
        );

  let clip = normalizeClip(options.clip ?? DEFAULT_CLIP);
  let autoClip = false;

  const bufferCanvas = createBufferCanvas(width, height);
  const bufferCtx = bufferCanvas.getContext("2d");
  if (!bufferCtx) {
    throw new Error("HeatmapLayer requires a 2D rendering context");
  }

  const fullImageData = new ImageData(width, height);
  const rgba = fullImageData.data;
  const valueBuffer = new Float32Array(width * height).fill(Number.NaN);

  let head = 0; // Next column to overwrite
  let filled = 0; // Number of columns containing data
  let dirty = true;

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

  const applyClipToBuffer = () => {
    for (let i = 0; i < valueBuffer.length; i += 1) {
      const value = valueBuffer[i];
      const base = i * 4;
      if (Number.isFinite(value)) {
        const lutIndex = valueToIndex(value) * 4;
        rgba[base] = colormap[lutIndex];
        rgba[base + 1] = colormap[lutIndex + 1];
        rgba[base + 2] = colormap[lutIndex + 2];
        rgba[base + 3] = 255;
      } else {
        rgba[base] = 0;
        rgba[base + 1] = 0;
        rgba[base + 2] = 0;
        rgba[base + 3] = 0;
      }
    }
    dirty = true;
  };

  const recomputeAutoClip = () => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < valueBuffer.length; i += 1) {
      const value = valueBuffer[i];
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (!(min < max && Number.isFinite(min) && Number.isFinite(max))) {
      return false;
    }
    const next = normalizeClip({ min, max });
    const changed =
      Math.abs(next.min - clip.min) > CLIP_EPSILON ||
      Math.abs(next.max - clip.max) > CLIP_EPSILON;
    clip = next;
    return changed;
  };

  const toFloat32 = (values: Float32Array | number[]): Float32Array => {
    return values instanceof Float32Array ? values : Float32Array.from(values);
  };

  const writeColumn = (columnIndex: number, values: Float32Array) => {
    const column = values;
    if (column.length !== height) {
      throw new Error(
        `HeatmapLayer "${id}" expected column of length ${height}, received ${column.length}`
      );
    }

    for (let y = 0; y < height; y += 1) {
      const value = column[y];
      const lutIndex = valueToIndex(value) * 4;
      const targetRow = height - 1 - y;
      const fullIndex = (targetRow * width + columnIndex) * 4;
      if (Number.isFinite(value)) {
        rgba[fullIndex] = colormap[lutIndex];
        rgba[fullIndex + 1] = colormap[lutIndex + 1];
        rgba[fullIndex + 2] = colormap[lutIndex + 2];
        rgba[fullIndex + 3] = 255;
      } else {
        rgba[fullIndex] = 0;
        rgba[fullIndex + 1] = 0;
        rgba[fullIndex + 2] = 0;
        rgba[fullIndex + 3] = 0;
      }
      valueBuffer[targetRow * width + columnIndex] = value;
    }
    dirty = true;
  };

  const pushColumn = (values: Float32Array | number[]) => {
    const targetColumn = head;
    head = (head + 1) % width;
    filled = Math.min(width, filled + 1);
    writeColumn(targetColumn, toFloat32(values));
    if (autoClip && recomputeAutoClip()) {
      applyClipToBuffer();
    }
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
      source = data;
    }

    autoClip = Boolean(normalize);
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
      for (let row = 0; row < height; row += 1) {
        const value = source[row * width + col];
        const lutIndex = valueToIndex(value) * 4;
        const targetRow = height - 1 - row;
        const index = (targetRow * width + col) * 4;
        if (Number.isFinite(value)) {
          rgba[index] = colormap[lutIndex];
          rgba[index + 1] = colormap[lutIndex + 1];
          rgba[index + 2] = colormap[lutIndex + 2];
          rgba[index + 3] = 255;
        } else {
          rgba[index] = 0;
          rgba[index + 1] = 0;
          rgba[index + 2] = 0;
          rgba[index + 3] = 0;
        }
        valueBuffer[targetRow * width + col] = value;
      }
    }
    filled = width;
    head = 0;
    dirty = true;
    requestDraw();
  };

  const setClipMode = (value: { min: number; max: number } | "auto") => {
    if (value === "auto") {
      autoClip = true;
      recomputeAutoClip();
      applyClipToBuffer();
      requestDraw();
      return;
    }
    autoClip = false;
    clip = normalizeClip(value);
    applyClipToBuffer();
    requestDraw();
  };

  const draw = (
    ctx: CanvasRenderingContext2D,
    renderContext: LayerRenderContext
  ) => {
    if (!visible || filled === 0) return;
    const { viewport } = renderContext;
    const rect = viewport.rect;
    if (rect.width <= 0 || rect.height <= 0) return;

    if (dirty) {
      bufferCtx.putImageData(fullImageData, 0, 0);
      dirty = false;
    }

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
      context.notifyLayerOrderChange();
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
    setClip(value: { min: number; max: number } | "auto") {
      setClipMode(value);
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
    getReadout(cursor: CursorState, renderContext: LayerRenderContext) {
      if (filled === 0) {
        return null;
      }
      const rect = renderContext.viewport.rect;
      const relativeX = (cursor.canvasX - rect.left) / rect.width;
      const relativeY = (cursor.canvasY - rect.top) / rect.height;
      if (Number.isNaN(relativeX) || Number.isNaN(relativeY)) {
        return null;
      }
      if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) {
        return null;
      }
      const displayColumn = Math.min(
        width - 1,
        Math.max(0, Math.floor(relativeX * width))
      );
      const startIndex = (head + width - filled) % width;
      const bufferColumn = (startIndex + displayColumn) % width;
      const displayRow = Math.min(
        height - 1,
        Math.max(0, Math.floor(relativeY * height))
      );
      const bufferRow = height - 1 - displayRow;
      const value = valueBuffer[bufferRow * width + bufferColumn];
      if (!Number.isFinite(value)) {
        return null;
      }
      return [`value: ${value.toFixed(2)}`];
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
