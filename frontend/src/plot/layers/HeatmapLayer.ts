import { resolveColormap } from "../color/colormap";
import type {
  AxisRange,
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
  const defaultDomainX = (): AxisRange => ({
    min: 0,
    max: Math.max(1, width),
  });
  const defaultDomainY = (): AxisRange => ({
    min: 0,
    max: Math.max(1, height),
  });
  let domainX =
    options.domain?.x !== undefined
      ? normalizeDomainRange(options.domain.x)
      : defaultDomainX();
  let domainY =
    options.domain?.y !== undefined
      ? normalizeDomainRange(options.domain.y)
      : defaultDomainY();

  const bufferCanvas = createBufferCanvas(width, height);
  const bufferCtx = bufferCanvas.getContext("2d");
  if (!bufferCtx) {
    throw new Error("HeatmapLayer requires a 2D rendering context");
  }

  const fullImageData = new ImageData(width, height);
  const rgba = fullImageData.data;
  const valueBuffer = new Float32Array(width * height).fill(Number.NaN);

  let top = 0; // Index of the newest row (rendered at the top)
  let filled = 0; // Number of rows containing data
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

  const toFloat32 = (values: Float32Array | number[]): Float32Array =>
    values instanceof Float32Array ? values : Float32Array.from(values);

  const writeRowValues = (rowIndex: number, values: Float32Array) => {
    if (values.length !== width) {
      throw new Error(
        `HeatmapLayer "${id}" expected row of length ${width}, received ${values.length}`
      );
    }
    const rowOffset = rowIndex * width;
    for (let x = 0; x < width; x += 1) {
      valueBuffer[rowOffset + x] = values[x];
    }
  };

  const colorizeRow = (rowIndex: number) => {
    const rowOffset = rowIndex * width;
    for (let x = 0; x < width; x += 1) {
      const value = valueBuffer[rowOffset + x];
      const base = (rowOffset + x) * 4;
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

  const pushRow = (values: Float32Array | number[]) => {
    top = (top - 1 + height) % height;
    writeRowValues(top, toFloat32(values));
    if (filled < height) {
      filled += 1;
    }
    const clipChanged = autoClip ? recomputeAutoClip() : false;
    if (clipChanged) {
      applyClipToBuffer();
    } else {
      colorizeRow(top);
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
      source = data.slice();
    }

    valueBuffer.fill(Number.NaN);
    for (let row = 0; row < height; row += 1) {
      const rowOffset = row * width;
      for (let col = 0; col < width; col += 1) {
        valueBuffer[rowOffset + col] = source[rowOffset + col];
      }
    }

    autoClip = Boolean(normalize);
    if (autoClip) {
      recomputeAutoClip();
    }
    applyClipToBuffer();

    filled = height;
    top = 0;
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

  const setDomainRanges = (ranges: { x?: AxisRange; y?: AxisRange }) => {
    let changed = false;
    if (ranges.x) {
      domainX = normalizeDomainRange(ranges.x);
      changed = true;
    }
    if (ranges.y) {
      domainY = normalizeDomainRange(ranges.y);
      changed = true;
    }
    if (changed) {
      requestDraw();
    }
  };

  const draw = (
    ctx: CanvasRenderingContext2D,
    renderContext: LayerRenderContext
  ) => {
    if (!visible || filled === 0) return;
    const { viewport } = renderContext;
    const rect = viewport.rect;
    if (rect.width <= 0 || rect.height <= 0) return;

    const totalRows = height;
    const domainXSpan = domainX.max - domainX.min || 1;
    const domainYSpan = domainY.max - domainY.min || 1;
    const viewX = viewport.xRange;
    const viewY = viewport.yRange;

    const visibleXMin = Math.max(viewX.min, domainX.min);
    const visibleXMax = Math.min(viewX.max, domainX.max);
    const visibleYMin = Math.max(viewY.min, domainY.min);
    const visibleYMax = Math.min(viewY.max, domainY.max);

    if (visibleXMin >= visibleXMax || visibleYMin >= visibleYMax) {
      return;
    }

    if (dirty) {
      bufferCtx.putImageData(fullImageData, 0, 0);
      dirty = false;
    }

    const destLeft = viewport.projectX(visibleXMin);
    const destRight = viewport.projectX(visibleXMax);
    const destTop = viewport.projectY(visibleYMax);
    const destBottom = viewport.projectY(visibleYMin);
    const destWidth = Math.abs(destRight - destLeft);
    const destHeight = Math.abs(destBottom - destTop);

    if (destWidth <= 0 || destHeight <= 0) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = opacity;
    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;

    let srcXStart = Math.floor(
      ((visibleXMin - domainX.min) / domainXSpan) * width
    );
    let srcXEnd = Math.ceil(
      ((visibleXMax - domainX.min) / domainXSpan) * width
    );
    srcXStart = clampInt(srcXStart, 0, Math.max(0, width - 1));
    srcXEnd = clampInt(srcXEnd, srcXStart + 1, width);
    let srcWidth = srcXEnd - srcXStart;
    if (srcWidth <= 0) {
      srcWidth = 1;
      srcXEnd = Math.min(width, srcXStart + srcWidth);
    }

    const topRowFloat =
      ((domainY.max - visibleYMax) / domainYSpan) * totalRows;
    const bottomRowFloat =
      ((domainY.max - visibleYMin) / domainYSpan) * totalRows;
    const srcRowStart = clampInt(Math.floor(topRowFloat), 0, totalRows - 1);
    let srcRowEnd = clampInt(
      Math.ceil(bottomRowFloat),
      srcRowStart + 1,
      totalRows
    );
    let srcRowCount = srcRowEnd - srcRowStart;
    if (srcRowCount <= 0) {
      srcRowCount = 1;
      srcRowEnd = Math.min(totalRows, srcRowStart + srcRowCount);
    }

    let remainingRows = srcRowCount;
    let bufferRow = (top + srcRowStart) % totalRows;
    const destX = Math.min(destLeft, destRight);
    let destY = Math.min(destTop, destBottom);

    while (remainingRows > 0) {
      const run = Math.min(remainingRows, totalRows - bufferRow);
      const destRunHeight = destHeight * (run / srcRowCount);
      ctx.drawImage(
        bufferCanvas as CanvasImageSource,
        srcXStart,
        bufferRow,
        srcWidth,
        run,
        destX,
        destY,
        destWidth,
        destRunHeight
      );
      destY += destRunHeight;
      remainingRows -= run;
      bufferRow = 0;
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
      return {
        x: { ...domainX },
        y: { ...domainY },
      };
    },
    draw,
    setVisible(value: boolean) {
      visible = value;
      requestDraw();
    },
    pushRow(values: Float32Array | number[]) {
      pushRow(values);
    },
    setFullImage(data: Float32Array | number[][], normalize?: boolean) {
      setFullImage(data, normalize);
    },
    setClip(value: { min: number; max: number } | "auto") {
      setClipMode(value);
    },
    setDomain(value: { x?: AxisRange; y?: AxisRange }) {
      setDomainRanges(value);
    },
    remove() {
      visible = false;
      filled = 0;
      top = 0;
      domainX = defaultDomainX();
      domainY = defaultDomainY();
      requestDraw();
    },
    destroy() {
      visible = false;
    },
    getReadout(cursor: CursorState, renderContext: LayerRenderContext) {
      if (filled === 0) {
        return null;
      }
      const { viewport } = renderContext;
      if (!viewport) {
        return null;
      }
      const dataX = viewport.invertX(cursor.canvasX);
      const dataY = viewport.invertY(cursor.canvasY);
      if (!Number.isFinite(dataX) || !Number.isFinite(dataY)) {
        return null;
      }
      const domainXSpan = domainX.max - domainX.min || 1;
      const domainYSpan = domainY.max - domainY.min || 1;
      const normalizedX = (dataX - domainX.min) / domainXSpan;
      const normalizedFromTop = (domainY.max - dataY) / domainYSpan;
      if (Number.isNaN(normalizedX) || Number.isNaN(normalizedFromTop)) {
        return null;
      }
      if (normalizedX < 0 || normalizedX > 1 || normalizedFromTop < 0 || normalizedFromTop > 1) {
        return null;
      }
      const clampedX = Math.min(Math.max(normalizedX, 0), 0.999999);
      const clampedY = Math.min(Math.max(normalizedFromTop, 0), 0.999999);
      const displayColumn = Math.min(
        width - 1,
        Math.max(0, Math.floor(clampedX * width))
      );
      const displayRow = Math.min(
        height - 1,
        Math.max(0, Math.floor(clampedY * height))
      );
      if (displayRow >= filled) {
        return null;
      }
      const bufferRow = (top + displayRow) % height;
      const value = valueBuffer[bufferRow * width + displayColumn];
      if (!Number.isFinite(value)) {
        return null;
      }
      return [value.toFixed(2)];
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

function normalizeDomainRange(range: AxisRange): AxisRange {
  let { min, max } = range;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }
  if (max - min < MIN_CLIP_SPAN) {
    max = min + MIN_CLIP_SPAN;
  }
  return { min, max };
}

function clampInt(value: number, min: number, max: number): number {
  if (max < min) return min;
  if (value < min) return min;
  if (value > max) return max;
  return Math.trunc(value);
}
