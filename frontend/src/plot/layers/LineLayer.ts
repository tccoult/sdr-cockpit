import {
  createDecimationScratch,
  minMaxDecimateIndices,
} from "../math/decimate";
import type {
  AxisRange,
  CursorState,
  Layer,
  LayerCreateContext,
  LayerRenderContext,
  LineLayerHandle,
  LineLayerOptions,
  LineRenderMode,
} from "../types";

export interface LineLayer extends Layer, LineLayerHandle {}

const DEFAULT_COLOR = "#4af8ff";
const DEFAULT_LINE_WIDTH = 1.25;
const DEFAULT_MODE: LineRenderMode = "line";
const DEFAULT_POINT_SIZE = 3;

let idCounter = 0;

export function createLineLayer(
  context: LayerCreateContext,
  options: LineLayerOptions = {}
): LineLayer {
  const id = options.id ?? `line-${idCounter++}`;
  let visible = options.opacity === 0 ? false : true;
  let zIndex = 0;

  const color = options.color ?? DEFAULT_COLOR;
  const lineWidth = options.lineWidth ?? DEFAULT_LINE_WIDTH;
  const opacity = options.opacity ?? 1;
  const dash = options.dash ?? null;
  const mode: LineRenderMode = options.mode ?? DEFAULT_MODE;
  const pointSize = options.pointSize ?? DEFAULT_POINT_SIZE;
  const fillConfig = options.fill ?? { enabled: false };
  const baseline = options.baseline ?? null;

  let xData: Float32Array = new Float32Array(0);
  let yData: Float32Array = new Float32Array(0);
  let length = 0;
  let xDomain: AxisRange | null = null;
  let yDomain: AxisRange | null = null;
  let dataVersion = 0;

  const scratch = createDecimationScratch();
  let decimationKey = "";
  let decimationCount = 0;
  let decimationIndices: Uint32Array = scratch.out;

  const invalidateLayer = () => context.invalidateLayer(id);
  const formatXValue = (value: number) => context.formatAxisValue("x", value);
  const formatYValue = (value: number) => context.formatAxisValue("y", value);

  const recalcDomains = () => {
    if (length === 0) {
      xDomain = null;
      yDomain = null;
      return;
    }
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < length; i += 1) {
      const xValue = xData[i];
      const yValue = yData[i];
      if (Number.isFinite(xValue)) {
        if (xValue < minX) minX = xValue;
        if (xValue > maxX) maxX = xValue;
      }
      if (Number.isFinite(yValue)) {
        if (yValue < minY) minY = yValue;
        if (yValue > maxY) maxY = yValue;
      }
    }
    xDomain =
      minX < maxX && Number.isFinite(minX) && Number.isFinite(maxX)
        ? { min: minX, max: maxX }
        : null;
    yDomain =
      minY < maxY && Number.isFinite(minY) && Number.isFinite(maxY)
        ? { min: minY, max: maxY }
        : null;
  };

  const invalidateDecimation = () => {
    decimationKey = "";
    decimationCount = 0;
    decimationIndices = scratch.out;
  };

  const cloneToFloat32 = (values: Float32Array | number[]): Float32Array => {
    if (values instanceof Float32Array) {
      return values.slice();
    }
    return Float32Array.from(values);
  };

  const setXY = (
    inputX: Float32Array | number[],
    inputY: Float32Array | number[]
  ) => {
    if (inputX.length !== inputY.length) {
      throw new Error(
        `LineLayer "${id}" expected x and y arrays of equal length (received ${inputX.length} and ${inputY.length})`
      );
    }
    xData = cloneToFloat32(inputX);
    yData = cloneToFloat32(inputY);
    length = xData.length;
    recalcDomains();
    dataVersion += 1;
    invalidateDecimation();
    invalidateLayer();
  };

  const appendXY = (
    inputX: Float32Array | number[],
    inputY: Float32Array | number[]
  ) => {
    if (inputX.length !== inputY.length) {
      throw new Error(
        `LineLayer "${id}" appendXY expected arrays of equal length (received ${inputX.length} and ${inputY.length})`
      );
    }
    const appendLength = inputX.length;
    if (appendLength === 0) {
      return;
    }
    const nextX = cloneToFloat32(inputX);
    const nextY = cloneToFloat32(inputY);
    const newLength = length + appendLength;
    const mergedX = new Float32Array(newLength);
    mergedX.set(xData.subarray(0, length), 0);
    mergedX.set(nextX, length);
    const mergedY = new Float32Array(newLength);
    mergedY.set(yData.subarray(0, length), 0);
    mergedY.set(nextY, length);
    xData = mergedX;
    yData = mergedY;
    length = newLength;
    recalcDomains();
    dataVersion += 1;
    invalidateDecimation();
    invalidateLayer();
  };

  const getExtents = () => {
    return {
      x: xDomain ?? undefined,
      y: yDomain ?? undefined,
    };
  };

  const formatKeyValue = (value: number) =>
    Number.isFinite(value) ? value.toPrecision(12) : "NaN";

  const computeDecimationKey = (range: AxisRange, pixelWidth: number) =>
    `${formatKeyValue(range.min)}:${formatKeyValue(range.max)}:${pixelWidth}:${dataVersion}`;

  const drawLine = (
    ctx: CanvasRenderingContext2D,
    renderContext: LayerRenderContext
  ) => {
    if (length === 0) {
      return;
    }
    const { viewport, dimensions } = renderContext;
    const pixelWidth = Math.max(
      1,
      Math.floor(dimensions.width * dimensions.devicePixelRatio)
    );
    const range = viewport.xRange;
    const key = computeDecimationKey(range, pixelWidth);
    if (key !== decimationKey) {
      const result = minMaxDecimateIndices(
        xData,
        yData,
        range,
        pixelWidth,
        scratch
      );
      decimationIndices = result.indices;
      decimationCount = result.count;
      decimationKey = key;
    }

    const count = decimationCount;
    if (count === 0) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    const requiresDash = Boolean(dash && dash.length > 0);
    const useDefaultStroke =
      !requiresDash && opacity === 1 && lineWidth === DEFAULT_LINE_WIDTH;

    if (requiresDash) {
      ctx.setLineDash(dash as number[]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.lineWidth = lineWidth;
    if (opacity !== 1) {
      ctx.globalAlpha = opacity;
    }
    if (useDefaultStroke) {
      ctx.lineWidth = DEFAULT_LINE_WIDTH;
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    let hasPoint = false;
    let firstIdx = -1;
    let lastIdx = -1;

    for (let i = 0; i < count; i += 1) {
      const dataIndex = decimationIndices[i];
      if (dataIndex >= length) {
        continue;
      }
      const xValue = xData[dataIndex];
      const yValue = yData[dataIndex];
      if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) {
        continue;
      }
      const sx = viewport.projectX(xValue);
      const sy = viewport.projectY(yValue);
      if (!hasPoint) {
        ctx.moveTo(sx, sy);
        hasPoint = true;
        firstIdx = dataIndex;
      } else {
        ctx.lineTo(sx, sy);
      }
      lastIdx = dataIndex;
    }

    if (!hasPoint) {
      ctx.restore();
      return;
    }

    ctx.stroke();

    if (fillConfig.enabled && baseline !== null && firstIdx !== -1 && lastIdx !== -1) {
      const baselineY = viewport.projectY(baseline);
      ctx.lineTo(viewport.projectX(xData[lastIdx]), baselineY);
      ctx.lineTo(viewport.projectX(xData[firstIdx]), baselineY);
      ctx.closePath();
      const fillOpacity = fillConfig.opacity ?? opacity * 0.3;
      ctx.globalAlpha = fillOpacity;
      ctx.fillStyle = fillConfig.color ?? color;
      ctx.fill();
    }
    ctx.restore();
  };

  const drawPoints = (
    ctx: CanvasRenderingContext2D,
    renderContext: LayerRenderContext
  ) => {
    if (length === 0) {
      return;
    }
    const { viewport } = renderContext;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    const radius = Math.max(1, pointSize / 2);
    for (let i = 0; i < length; i += 1) {
      const xValue = xData[i];
      const yValue = yData[i];
      if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) continue;
      const sx = viewport.projectX(xValue);
      const sy = viewport.projectY(yValue);
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  return {
    id,
    phase: "content",
    surface: options.surface,
    get visible() {
      return visible;
    },
    set visible(value: boolean) {
      visible = value;
      invalidateLayer();
    },
    get zIndex() {
      return zIndex;
    },
    set zIndex(value: number) {
      zIndex = value;
      context.notifyLayerOrderChange();
      invalidateLayer();
    },
    getExtents,
    draw(ctx: CanvasRenderingContext2D, renderContext: LayerRenderContext) {
      if (!visible) return;
      if (mode === "points") {
        drawPoints(ctx, renderContext);
      } else {
        drawLine(ctx, renderContext);
      }
    },
    setXY,
    appendXY,
    setVisible(value: boolean) {
      visible = value;
      invalidateLayer();
    },
    remove() {
      visible = false;
      length = 0;
      xData = new Float32Array(0);
      yData = new Float32Array(0);
      xDomain = null;
      yDomain = null;
      dataVersion += 1;
      invalidateDecimation();
      invalidateLayer();
    },
    getReadout(cursor: CursorState) {
      if (length === 0) {
        return null;
      }
      const index = findClosestIndex(cursor.dataX);
      if (index === -1) {
        return null;
      }
      const label = options.id ?? id;
      const xValue = xData[index];
      const yValue = yData[index];
      if (!Number.isFinite(yValue)) {
        return null;
      }
      return [
        `${label}: ${formatYValue(yValue)} @ ${formatXValue(xValue)}`,
      ];
    },
  };

  function findClosestIndex(value: number): number {
    if (length === 0) {
      return -1;
    }
    let low = 0;
    let high = length - 1;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      const midValue = xData[mid];
      if (!Number.isFinite(midValue)) {
        break;
      }
      if (midValue <= value) {
        low = mid;
      } else {
        high = mid;
      }
    }
    const lowValue = xData[low];
    const highValue = xData[high];
    const lowDiff = Math.abs(value - lowValue);
    const highDiff = Math.abs(value - highValue);
    return lowDiff <= highDiff ? low : high;
  }
}
