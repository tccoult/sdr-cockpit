import { minMaxDecimate } from "../math/decimate";
import type {
  AxisRange,
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

  const requestDraw = context.requestDraw;

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

  const cloneToFloat32 = (values: Float32Array | number[]): Float32Array => {
    const result = new Float32Array(values.length);
    for (let i = 0; i < values.length; i += 1) {
      result[i] = (values as ArrayLike<number>)[i];
    }
    return result;
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
    requestDraw();
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
    requestDraw();
  };

  const getExtents = () => {
    return {
      x: xDomain ?? undefined,
      y: yDomain ?? undefined,
    };
  };

  const drawLine = (ctx: CanvasRenderingContext2D, renderContext: LayerRenderContext) => {
    if (length === 0) {
      return;
    }
    const { viewport, dimensions } = renderContext;
    const decimated = minMaxDecimate(
      xData.subarray(0, length),
      yData.subarray(0, length),
      viewport.xRange,
      Math.max(1, Math.floor(dimensions.width * dimensions.devicePixelRatio))
    );
    const { x: decimatedX, y: decimatedY } = decimated;
    const count = Math.min(decimatedX.length, decimatedY.length);
    if (count === 0) {
      return;
    }
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    if (dash && dash.length > 0) {
      ctx.setLineDash(dash);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(
      viewport.projectX(decimatedX[0]),
      viewport.projectY(decimatedY[0])
    );
    for (let i = 1; i < count; i += 1) {
      ctx.lineTo(
        viewport.projectX(decimatedX[i]),
        viewport.projectY(decimatedY[i])
      );
    }
    ctx.stroke();

    if (fillConfig.enabled && baseline !== null) {
      ctx.lineTo(
        viewport.projectX(decimatedX[count - 1]),
        viewport.projectY(baseline)
      );
      ctx.lineTo(
        viewport.projectX(decimatedX[0]),
        viewport.projectY(baseline)
      );
      ctx.closePath();
      ctx.globalAlpha = fillConfig.opacity ?? opacity * 0.3;
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
      requestDraw();
    },
    remove() {
      visible = false;
      length = 0;
      xData = new Float32Array(0);
      yData = new Float32Array(0);
      xDomain = null;
      yDomain = null;
      requestDraw();
    },
  };
}
