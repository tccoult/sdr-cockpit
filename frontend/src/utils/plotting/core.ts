import { mergePlotConfig, type ResolvedPlotConfig } from "./defaults";
import { colorForValue, resolveColorMap } from "./colorMaps";
import {
  CursorStyle,
  InterpolationMode,
  PointShape,
  Trace1DType,
  type AxisConfig,
  type AxisRange,
  type CursorInfo,
  type GridConfig,
  type PlotConfig,
  type Trace1DConfig,
  type TraceHandle1D,
  type Trace2DConfig,
  type TraceHandle2D,
  type TraceData1D,
  type TraceData2D,
} from "./types";
import {
  arrayMinMax,
  calculateTicks,
  clamp,
  normalizePadding,
  withPadding,
} from "./math";

type ZoomPanCallback = (range: AxisRange) => void;
type CursorCallback = (info: CursorInfo | null) => void;

interface AxisState {
  config: AxisConfig;
  range: AxisRange;
  auto: boolean;
}

interface Trace1DState {
  id: string;
  config: Trace1DConfig;
  data: TraceData1D | null;
  visible: boolean;
  zIndex: number;
}

interface Trace2DState {
  id: string;
  config: Trace2DConfig;
  data: TraceData2D | null;
  visible: boolean;
  zIndex: number;
  bitmap: HTMLCanvasElement | null;
  width: number;
  height: number;
}

interface PlotSize {
  width: number;
  height: number;
  dpr: number;
}

interface PointerState {
  isDown: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  isPanning: boolean;
  isBoxSelecting: boolean;
}

interface CursorState {
  info: CursorInfo | null;
}

export interface PlotRuntime {
  updateConfig: (config: PlotConfig) => void;
  attachCanvas: (canvas: HTMLCanvasElement) => void;
  detachCanvas: () => void;
  addTrace1D: (config: Trace1DConfig) => TraceHandle1D;
  addTrace2D: (config: Trace2DConfig) => TraceHandle2D;
  clearTraces: () => void;
  setAxisRange: (axis: "x" | "y", min: number, max: number) => void;
  getAxisRange: (axis: "x" | "y") => AxisRange;
  autoRange: (axis: "x" | "y" | "both", padding?: number) => void;
  onZoom: (callback: ZoomPanCallback) => () => void;
  onPan: (callback: ZoomPanCallback) => () => void;
  onCursor: (callback: CursorCallback) => () => void;
  requestRender: () => void;
  destroy: () => void;
}

function defaultFormatter(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  const abs = Math.abs(value);
  if ((abs >= 1e4 || (abs > 0 && abs < 1e-2))) {
    return value.toExponential(2);
  }
  if (abs >= 100) {
    return value.toFixed(0);
  }
  return Number(value.toFixed(3)).toString();
}

function resolveTickCount(
  axis: AxisConfig,
  grid: GridConfig,
  orientation: "x" | "y"
): number {
  const axisCount = axis.ticks?.count;
  if (typeof axisCount === "number") {
    return axisCount;
  }
  if (axisCount === "auto") {
    return 8;
  }
  const gridLines = orientation === "x" ? grid.xLines : grid.yLines;
  if (typeof gridLines === "number") {
    return gridLines;
  }
  return 8;
}

export function createPlotRuntime(initialConfig: PlotConfig): PlotRuntime {
  const configRef: { current: ResolvedPlotConfig } = {
    current: mergePlotConfig(initialConfig),
  };
  const canvasRef: { current: HTMLCanvasElement | null } = { current: null };
  const ctxRef: { current: CanvasRenderingContext2D | null } = {
    current: null,
  };
  const size: PlotSize = { width: 0, height: 0, dpr: 1 };
  const axes: Record<"x" | "y", AxisState> = {
    x: {
      config: configRef.current.axes.x,
      range:
        configRef.current.axes.x.range ?? {
          min: 0,
          max: 1,
        },
      auto: !configRef.current.axes.x.range,
    },
    y: {
      config: configRef.current.axes.y,
      range:
        configRef.current.axes.y.range ?? {
          min: 0,
          max: 1,
        },
      auto: !configRef.current.axes.y.range,
    },
  };
  const traces1D = new Map<string, Trace1DState>();
  const traces2D = new Map<string, Trace2DState>();
  const zoomCallbacks = new Set<ZoomPanCallback>();
  const panCallbacks = new Set<ZoomPanCallback>();
  const cursorCallbacks = new Set<CursorCallback>();
  const pointerState: PointerState = {
    isDown: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    isPanning: false,
    isBoxSelecting: false,
  };
  const cursorState: CursorState = { info: null };
  const boxSelectRect = { x: 0, y: 0, width: 0, height: 0 };
  let frameHandle: number | null = null;
  let lastRender = 0;
  let destroyed = false;
  let resizeObserver: ResizeObserver | null = null;

  function scheduleRender(force = false) {
    if (destroyed) {
      return;
    }
    if (frameHandle !== null) {
      if (force) {
        window.cancelAnimationFrame(frameHandle);
        frameHandle = null;
      } else {
        return;
      }
    }
    frameHandle = window.requestAnimationFrame((timestamp) => {
      frameHandle = null;
      const rate = configRef.current.maxRenderRate;
      const minInterval = rate > 0 ? 1000 / rate : 0;
      if (!force && timestamp - lastRender < minInterval) {
        scheduleRender(true);
        return;
      }
      lastRender = timestamp;
      render();
    });
  }

  function getPlotRect(): { x: number; y: number; width: number; height: number } {
    const margins = configRef.current.margins;
    const width = Math.max(0, size.width - margins.left - margins.right);
    const height = Math.max(0, size.height - margins.top - margins.bottom);
    return {
      x: margins.left,
      y: margins.top,
      width,
      height,
    };
  }

  function dataToX(value: number) {
    const { min, max } = axes.x.range;
    const rect = getPlotRect();
    const span = max - min || 1;
    return rect.x + ((value - min) / span) * rect.width;
  }

  function dataToY(value: number) {
    const { min, max } = axes.y.range;
    const rect = getPlotRect();
    const span = max - min || 1;
    return rect.y + rect.height - ((value - min) / span) * rect.height;
  }

  function xToData(pixel: number) {
    const rect = getPlotRect();
    const { min, max } = axes.x.range;
    const span = max - min || 1;
    return min + ((pixel - rect.x) / rect.width) * span;
  }

  function yToData(pixel: number) {
    const rect = getPlotRect();
    const { min, max } = axes.y.range;
    const span = max - min || 1;
    return max - ((pixel - rect.y) / rect.height) * span;
  }

  function fireCursor(info: CursorInfo | null) {
    cursorCallbacks.forEach((cb) => cb(info));
  }

  function fireZoom(axis: "x" | "y") {
    const range = axes[axis].range;
    zoomCallbacks.forEach((cb) => cb(range));
  }

  function firePan(axis: "x" | "y") {
    const range = axes[axis].range;
    panCallbacks.forEach((cb) => cb(range));
  }

  function updateCursorFromPointer(x: number, y: number) {
    const interactions = configRef.current.interactions;
    const cursorConfig = interactions.cursor;
    if (!cursorConfig) {
      if (cursorState.info) {
        cursorState.info = null;
        fireCursor(null);
        scheduleRender();
      }
      return;
    }

    const rect = getPlotRect();
    if (
      x < rect.x ||
      y < rect.y ||
      x > rect.x + rect.width ||
      y > rect.y + rect.height
    ) {
      if (cursorState.info) {
        cursorState.info = null;
        fireCursor(null);
        scheduleRender();
      }
      return;
    }

    const info: CursorInfo = {
      canvasX: x,
      canvasY: y,
      x: xToData(x),
      y: yToData(y),
      snapped: null,
      zValue: null,
    };

    if (cursorConfig.snap) {
      let bestTrace: Trace1DState | null = null;
      let bestIndex = -1;
      let bestDistance = Infinity;
      for (const trace of traces1D.values()) {
        if (!trace.visible || !trace.data) {
          continue;
        }
        const { x: xs, y: ys } = trace.data;
        const length = Math.min(xs.length, ys.length);
        for (let i = 0; i < length; i += 1) {
          const dx = xs[i] - info.x;
          const distance = Math.abs(dx);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestTrace = trace;
            bestIndex = i;
          }
        }
      }

      if (bestTrace && bestTrace.data && bestIndex >= 0) {
        const { x: xs, y: ys } = bestTrace.data;
        const snappedX = xs[bestIndex];
        const snappedY = ys[bestIndex];
        info.snapped = {
          traceId: bestTrace.id,
          index: bestIndex,
          x: snappedX,
          y: snappedY,
        };
        info.x = snappedX;
        info.y = snappedY;
        info.canvasX = dataToX(snappedX);
        info.canvasY = dataToY(snappedY);
      }
    } else if (traces2D.size > 0) {
      for (const trace of traces2D.values()) {
        if (!trace.visible || !trace.data || !trace.width || !trace.height) {
          continue;
        }
        const relX = (x - rect.x) / rect.width;
        const relY = (y - rect.y) / rect.height;
        if (relX < 0 || relY < 0 || relX > 1 || relY > 1) {
          continue;
        }
        const px = Math.min(trace.width - 1, Math.max(0, Math.floor(relX * trace.width)));
        const py = Math.min(trace.height - 1, Math.max(0, Math.floor(relY * trace.height)));
        const idx = py * trace.width + px;
        const source = trace.data.z;
        if (source instanceof Float32Array) {
          info.zValue = source[idx];
        } else if (Array.isArray(source) && source[py]) {
          info.zValue = source[py][px];
        }
        break;
      }
    }

    cursorState.info = info;
    fireCursor(info);
    scheduleRender();
  }

  function setAxisRange(axis: "x" | "y", min: number, max: number) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
      return;
    }
    axes[axis].range = { min, max };
    axes[axis].auto = false;
    scheduleRender();
  }

  function autoRangeAxis(axis: "x" | "y", padding?: number) {
    let min = Infinity;
    let max = -Infinity;
    const pad = normalizePadding(padding);

    const consider = (values: ArrayLike<number>) => {
      const range = arrayMinMax(values);
      if (!range) return;
      if (range.min < min) min = range.min;
      if (range.max > max) max = range.max;
    };

    if (axis === "x") {
      traces1D.forEach((trace) => {
        if (trace.visible && trace.data) consider(trace.data.x);
      });
      traces2D.forEach((trace) => {
        if (trace.visible && trace.data) consider(trace.data.x);
      });
    } else {
      traces1D.forEach((trace) => {
        if (trace.visible && trace.data) consider(trace.data.y);
      });
      traces2D.forEach((trace) => {
        if (trace.visible && trace.data) consider(trace.data.y);
      });
    }

    if (min === Infinity || max === -Infinity || min === max) {
      return;
    }

    const padded = withPadding({ min, max }, pad);
    axes[axis].range = padded;
    axes[axis].auto = true;
    scheduleRender();
  }

  function autoRange(axis: "x" | "y" | "both", padding?: number) {
    if (axis === "both" || axis === "x") {
      autoRangeAxis("x", padding);
    }
    if (axis === "both" || axis === "y") {
      autoRangeAxis("y", padding);
    }
  }

  function updateSize() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const config = configRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = config.highDPI ? window.devicePixelRatio || 1 : 1;
    const width = Math.max(1, Math.round(rect.width || canvas.width / dpr || 1));
    const height = Math.max(1, Math.round(rect.height || canvas.height / dpr || 1));
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      size.width = width;
      size.height = height;
      size.dpr = dpr;
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    } else {
      size.width = width;
      size.height = height;
      size.dpr = dpr;
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (!canvasRef.current) return;
    pointerState.isDown = true;
    pointerState.startX = event.offsetX;
    pointerState.startY = event.offsetY;
    pointerState.lastX = event.offsetX;
    pointerState.lastY = event.offsetY;
    pointerState.isPanning =
      configRef.current.interactions.pan !== false && !event.shiftKey;
    pointerState.isBoxSelecting =
      !!configRef.current.interactions.boxSelect && event.shiftKey;
    if (pointerState.isBoxSelecting) {
      boxSelectRect.x = event.offsetX;
      boxSelectRect.y = event.offsetY;
      boxSelectRect.width = 0;
      boxSelectRect.height = 0;
    }
    if (canvasRef.current) {
      canvasRef.current.setPointerCapture(event.pointerId);
    }
  }

  function handlePointerMove(event: PointerEvent) {
    if (!canvasRef.current) return;
    const x = event.offsetX;
    const y = event.offsetY;
    if (pointerState.isDown) {
      const dx = x - pointerState.lastX;
      const dy = y - pointerState.lastY;
      pointerState.lastX = x;
      pointerState.lastY = y;
      if (pointerState.isPanning) {
        const rect = getPlotRect();
        if (rect.width === 0 || rect.height === 0) {
          return;
        }
        const panMode = configRef.current.interactions.pan;
        if (panMode === "both" || panMode === "x") {
          const span = axes.x.range.max - axes.x.range.min;
          const delta = (-dx / rect.width) * span;
          setAxisRange(
            "x",
            axes.x.range.min + delta,
            axes.x.range.max + delta
          );
          firePan("x");
        }
        if (panMode === "both" || panMode === "y") {
          const span = axes.y.range.max - axes.y.range.min;
          const delta = (dy / rect.height) * span;
          setAxisRange(
            "y",
            axes.y.range.min + delta,
            axes.y.range.max + delta
          );
          firePan("y");
        }
      } else if (pointerState.isBoxSelecting) {
        boxSelectRect.width = x - boxSelectRect.x;
        boxSelectRect.height = y - boxSelectRect.y;
        scheduleRender();
      }
    }
    updateCursorFromPointer(x, y);
  }

  function handlePointerUp(event: PointerEvent) {
    if (!canvasRef.current) return;
    if (pointerState.isBoxSelecting) {
      const rect = getPlotRect();
      const startX = boxSelectRect.x;
      const startY = boxSelectRect.y;
      const endX = startX + boxSelectRect.width;
      const endY = startY + boxSelectRect.height;
      if (Math.abs(endX - startX) > 4 && Math.abs(endY - startY) > 4) {
        const minX = clamp(Math.min(startX, endX), rect.x, rect.x + rect.width);
        const maxX = clamp(Math.max(startX, endX), rect.x, rect.x + rect.width);
        const minY = clamp(Math.min(startY, endY), rect.y, rect.y + rect.height);
        const maxY = clamp(Math.max(startY, endY), rect.y, rect.y + rect.height);
        setAxisRange("x", xToData(minX), xToData(maxX));
        setAxisRange("y", yToData(maxY), yToData(minY));
        fireZoom("x");
        fireZoom("y");
      }
      boxSelectRect.width = 0;
      boxSelectRect.height = 0;
      scheduleRender();
    }
    pointerState.isDown = false;
    pointerState.isPanning = false;
    pointerState.isBoxSelecting = false;
    if (canvasRef.current) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
  }

  function handlePointerLeave() {
    pointerState.isDown = false;
    pointerState.isPanning = false;
    pointerState.isBoxSelecting = false;
    if (cursorState.info) {
      cursorState.info = null;
      fireCursor(null);
      scheduleRender();
    }
  }

  function handleWheel(event: WheelEvent) {
    const interactions = configRef.current.interactions;
    if (interactions.zoom === false) {
      return;
    }
    event.preventDefault();
    const rect = getPlotRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    const x = event.offsetX;
    const y = event.offsetY;
    const zoomFactor = Math.exp(-event.deltaY * 0.0015);

    const applyZoom = (axis: "x" | "y") => {
      const range = axes[axis].range;
      const cursorValue = axis === "x" ? xToData(x) : yToData(y);
      const span = range.max - range.min;
      const newSpan = span / zoomFactor;
      const ratio = (cursorValue - range.min) / (span || 1);
      const newMin = cursorValue - newSpan * ratio;
      const newMax = newMin + newSpan;
      setAxisRange(axis, newMin, newMax);
      fireZoom(axis);
    };

    if (interactions.zoom === "both" || interactions.zoom === "x") {
      applyZoom("x");
    }
    if (interactions.zoom === "both" || interactions.zoom === "y") {
      applyZoom("y");
    }
  }

  function drawGrid(ctx: CanvasRenderingContext2D) {
    const { grid } = configRef.current;
    if (!grid.show) {
      return;
    }
    const rect = getPlotRect();
    ctx.save();
    ctx.strokeStyle = grid.color ?? "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = grid.lineWidth ?? 1;

    const xTickCount = resolveTickCount(axes.x.config, grid, "x");
    const yTickCount = resolveTickCount(axes.y.config, grid, "y");
    const xTicks = calculateTicks(axes.x.range.min, axes.x.range.max, xTickCount);
    const yTicks = calculateTicks(axes.y.range.min, axes.y.range.max, yTickCount);

    ctx.beginPath();
    xTicks.forEach((tick) => {
      const x = dataToX(tick);
      ctx.moveTo(x, rect.y);
      ctx.lineTo(x, rect.y + rect.height);
    });
    yTicks.forEach((tick) => {
      const y = dataToY(tick);
      ctx.moveTo(rect.x, y);
      ctx.lineTo(rect.x + rect.width, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  function drawAxes(ctx: CanvasRenderingContext2D) {
    const rect = getPlotRect();
    const { axes: axesConfig, textColor, fontSize, fontFamily } = configRef.current;
    const xTickCount = resolveTickCount(axesConfig.x, configRef.current.grid, "x");
    const yTickCount = resolveTickCount(axesConfig.y, configRef.current.grid, "y");
    const xTicks = calculateTicks(axes.x.range.min, axes.x.range.max, xTickCount);
    const yTicks = calculateTicks(axes.y.range.min, axes.y.range.max, yTickCount);
    const xFormatter =
      axesConfig.x.ticks?.formatter ?? axesConfig.x.formatter ?? defaultFormatter;
    const yFormatter =
      axesConfig.y.ticks?.formatter ?? axesConfig.y.formatter ?? defaultFormatter;
    const xTickColor = axesConfig.x.ticks?.color ?? textColor;
    const yTickColor = axesConfig.y.ticks?.color ?? textColor;

    ctx.save();
    ctx.strokeStyle = textColor;
    ctx.fillStyle = textColor;
    ctx.lineWidth = 1.5;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // X axis line
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y + rect.height);
    ctx.lineTo(rect.x + rect.width, rect.y + rect.height);
    ctx.stroke();

    xTicks.forEach((tick) => {
      const x = dataToX(tick);
      ctx.strokeStyle = xTickColor;
      ctx.beginPath();
      const tickLength = axesConfig.x.ticks?.length ?? 6;
      ctx.moveTo(x, rect.y + rect.height);
      ctx.lineTo(x, rect.y + rect.height + tickLength);
      ctx.stroke();
      ctx.fillText(xFormatter(tick), x, rect.y + rect.height + tickLength + 4);
    });

    if (axesConfig.x.label) {
      ctx.fillText(
        axesConfig.x.label,
        rect.x + rect.width / 2,
        rect.y + rect.height + (axesConfig.x.ticks?.length ?? 6) + fontSize + 8
      );
    }

    // Y axis line
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y);
    ctx.lineTo(rect.x, rect.y + rect.height);
    ctx.strokeStyle = textColor;
    ctx.stroke();

    yTicks.forEach((tick) => {
      const y = dataToY(tick);
      const tickLength = axesConfig.y.ticks?.length ?? 6;
      ctx.strokeStyle = yTickColor;
      ctx.beginPath();
      ctx.moveTo(rect.x - tickLength, y);
      ctx.lineTo(rect.x, y);
      ctx.stroke();
      ctx.fillText(yFormatter(tick), rect.x - tickLength - 4, y);
    });

    if (axesConfig.y.label) {
      ctx.save();
      ctx.translate(rect.x - (axesConfig.y.ticks?.length ?? 6) - fontSize - 12, rect.y + rect.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillText(axesConfig.y.label, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  function ensure2DBitmap(trace: Trace2DState) {
    if (!trace.data) {
      trace.bitmap = null;
      trace.width = 0;
      trace.height = 0;
      return;
    }
    const { data } = trace;
    const width = data.width ?? (Array.isArray(data.z) ? data.z[0]?.length : undefined);
    const height = data.height ?? (Array.isArray(data.z) ? data.z.length : undefined);
    if (!width || !height || width <= 0 || height <= 0) {
      trace.bitmap = null;
      trace.width = 0;
      trace.height = 0;
      return;
    }
    trace.width = width;
    trace.height = height;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      trace.bitmap = null;
      return;
    }
    const imageData = ctx.createImageData(width, height);
    const stops = resolveColorMap(trace.config.colorMap);
    const opacity = trace.config.opacity ?? 1;
    const values: Float32Array =
      data.z instanceof Float32Array
        ? data.z
        : (() => {
            const arr = new Float32Array(width * height);
            if (Array.isArray(data.z)) {
              for (let row = 0; row < height; row += 1) {
                const sourceRow = data.z[row] ?? [];
                for (let col = 0; col < width; col += 1) {
                  const value = sourceRow[col];
                  arr[row * width + col] = Number.isFinite(value) ? value : 0;
                }
              }
            }
            return arr;
          })();
    const range = trace.config.valueRange;
    const span = range.max - range.min || 1;
    const pixels = imageData.data;
    for (let i = 0; i < width * height; i += 1) {
      const raw = values[i];
      const normalized = clamp((raw - range.min) / span, 0, 1);
      const [r, g, b, a] = colorForValue(normalized, stops, opacity);
      const offset = i * 4;
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
      pixels[offset + 3] = a;
    }
    ctx.putImageData(imageData, 0, 0);
    trace.bitmap = canvas;
  }

  function draw2DTraces(ctx: CanvasRenderingContext2D) {
    const ordered = Array.from(traces2D.values()).filter((trace) => trace.visible && trace.data);
    ordered.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    const rect = getPlotRect();
    ordered.forEach((trace) => {
      if (!trace.bitmap) {
        ensure2DBitmap(trace);
      }
      if (!trace.bitmap) return;
      ctx.save();
      ctx.globalAlpha = trace.config.opacity ?? 1;
      ctx.imageSmoothingEnabled = trace.config.interpolation !== InterpolationMode.Nearest;
      ctx.drawImage(trace.bitmap, rect.x, rect.y, rect.width, rect.height);
      ctx.restore();
    });
  }

  function draw1DTraces(ctx: CanvasRenderingContext2D) {
    const ordered = Array.from(traces1D.values()).filter((trace) => trace.visible && trace.data);
    ordered.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    const rect = getPlotRect();
    ordered.forEach((trace) => {
      const { data, config } = trace;
      if (!data) return;
      const { x: xs, y: ys } = data;
      const length = Math.min(xs.length, ys.length);
      if (length === 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.clip();
      ctx.strokeStyle = config.color;
      ctx.lineWidth = config.lineWidth ?? 1.5;
      ctx.globalAlpha = config.opacity ?? 1;
      if (config.dashPattern) {
        ctx.setLineDash(config.dashPattern);
      }
      if (config.type === Trace1DType.Area) {
        ctx.beginPath();
        const baseline = config.baseline ?? 0;
        ctx.moveTo(dataToX(xs[0]), dataToY(baseline));
        for (let i = 0; i < length; i += 1) {
          ctx.lineTo(dataToX(xs[i]), dataToY(ys[i]));
        }
        ctx.lineTo(dataToX(xs[length - 1]), dataToY(baseline));
        ctx.closePath();
        ctx.fillStyle = config.fillColor ?? config.color;
        const fillOpacity = config.fillOpacity ?? 0.2;
        ctx.globalAlpha = fillOpacity;
        ctx.fill();
        ctx.globalAlpha = config.opacity ?? 1;
      }

      if (config.type === Trace1DType.Stem) {
        const baseline = config.baseline ?? 0;
        ctx.beginPath();
        for (let i = 0; i < length; i += 1) {
          const x = dataToX(xs[i]);
          ctx.moveTo(x, dataToY(baseline));
          ctx.lineTo(x, dataToY(ys[i]));
        }
        ctx.stroke();
      } else if (config.type !== Trace1DType.Scatter) {
        ctx.beginPath();
        for (let i = 0; i < length; i += 1) {
          const x = dataToX(xs[i]);
          const y = dataToY(ys[i]);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      if (config.type === Trace1DType.Scatter || config.pointSize) {
        const pointSize = config.pointSize ?? 4;
        const half = pointSize / 2;
        ctx.fillStyle = config.color;
        const shape = config.pointShape ?? PointShape.Circle;
        for (let i = 0; i < length; i += 1) {
          const x = dataToX(xs[i]);
          const y = dataToY(ys[i]);
          switch (shape) {
            case PointShape.Square: {
              ctx.fillRect(x - half, y - half, pointSize, pointSize);
              break;
            }
            case PointShape.Triangle: {
              ctx.beginPath();
              ctx.moveTo(x, y - half);
              ctx.lineTo(x + half, y + half);
              ctx.lineTo(x - half, y + half);
              ctx.closePath();
              ctx.fill();
              break;
            }
            default: {
              ctx.beginPath();
              ctx.arc(x, y, half, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      ctx.setLineDash([]);
      ctx.restore();
    });
  }

  function drawCursor(ctx: CanvasRenderingContext2D) {
    const cursorConfig = configRef.current.interactions.cursor;
    const info = cursorState.info;
    if (!cursorConfig || !info) return;
    const rect = getPlotRect();
    ctx.save();
    ctx.strokeStyle = cursorConfig.color;
    ctx.lineWidth = cursorConfig.lineWidth;
    if (cursorConfig.dashPattern) {
      ctx.setLineDash(cursorConfig.dashPattern);
    }
    if (cursorConfig.style === CursorStyle.Crosshair || cursorConfig.style === CursorStyle.Vertical) {
      ctx.beginPath();
      ctx.moveTo(info.canvasX, rect.y);
      ctx.lineTo(info.canvasX, rect.y + rect.height);
      ctx.stroke();
    }
    if (cursorConfig.style === CursorStyle.Crosshair || cursorConfig.style === CursorStyle.Horizontal) {
      ctx.beginPath();
      ctx.moveTo(rect.x, info.canvasY);
      ctx.lineTo(rect.x + rect.width, info.canvasY);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBoxSelect(ctx: CanvasRenderingContext2D) {
    if (!pointerState.isBoxSelecting || !pointerState.isDown) {
      return;
    }
    const rect = {
      x: boxSelectRect.width >= 0 ? boxSelectRect.x : boxSelectRect.x + boxSelectRect.width,
      y: boxSelectRect.height >= 0 ? boxSelectRect.y : boxSelectRect.y + boxSelectRect.height,
      width: Math.abs(boxSelectRect.width),
      height: Math.abs(boxSelectRect.height),
    };
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }

  function render() {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) {
      return;
    }
    updateSize();
    ctx.save();
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = configRef.current.background;
    ctx.fillRect(0, 0, size.width, size.height);

    drawGrid(ctx);
    draw2DTraces(ctx);
    draw1DTraces(ctx);
    drawAxes(ctx);
    drawCursor(ctx);
    drawBoxSelect(ctx);

    ctx.restore();
  }

  function attachCanvas(canvas: HTMLCanvasElement) {
    canvasRef.current = canvas;
    ctxRef.current = canvas.getContext("2d");
    updateSize();
    scheduleRender(true);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
        scheduleRender(true);
      });
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener("resize", updateSize);
    }
  }

  function detachCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("pointerleave", handlePointerLeave);
    canvas.removeEventListener("wheel", handleWheel);
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    } else {
      window.removeEventListener("resize", updateSize);
    }
    canvasRef.current = null;
    ctxRef.current = null;
  }

  function createTraceHandle1D(state: Trace1DState): TraceHandle1D {
    return {
      update(data: TraceData1D) {
        state.data = data;
        if (axes.x.auto) {
          autoRangeAxis("x");
        }
        if (axes.y.auto) {
          autoRangeAxis("y");
        }
        scheduleRender();
      },
      setVisible(visible: boolean) {
        state.visible = visible;
        scheduleRender();
      },
      setConfig(config: Partial<Trace1DConfig>) {
        state.config = { ...state.config, ...config };
        scheduleRender();
      },
      remove() {
        traces1D.delete(state.id);
        scheduleRender();
      },
    };
  }

  function createTraceHandle2D(state: Trace2DState): TraceHandle2D {
    return {
      update(data: TraceData2D) {
        state.data = data;
        ensure2DBitmap(state);
        if (axes.x.auto) {
          autoRangeAxis("x");
        }
        if (axes.y.auto) {
          autoRangeAxis("y");
        }
        scheduleRender();
      },
      setVisible(visible: boolean) {
        state.visible = visible;
        scheduleRender();
      },
      setConfig(config: Partial<Trace2DConfig>) {
        state.config = { ...state.config, ...config };
        if (config.colorMap || config.valueRange) {
          ensure2DBitmap(state);
        }
        scheduleRender();
      },
      remove() {
        traces2D.delete(state.id);
        scheduleRender();
      },
    };
  }

  let traceCounter = 0;

  function addTrace1D(config: Trace1DConfig): TraceHandle1D {
    const id = `trace1d-${traceCounter += 1}`;
    const state: Trace1DState = {
      id,
      config,
      data: null,
      visible: config.visible ?? true,
      zIndex: config.zIndex ?? 0,
    };
    traces1D.set(id, state);
    scheduleRender();
    return createTraceHandle1D(state);
  }

  function addTrace2D(config: Trace2DConfig): TraceHandle2D {
    const id = `trace2d-${traceCounter += 1}`;
    const state: Trace2DState = {
      id,
      config,
      data: null,
      visible: config.visible ?? true,
      zIndex: config.zIndex ?? 0,
      bitmap: null,
      width: 0,
      height: 0,
    };
    traces2D.set(id, state);
    scheduleRender();
    return createTraceHandle2D(state);
  }

  function clearTraces() {
    traces1D.clear();
    traces2D.clear();
    scheduleRender();
  }

  function updateConfig(config: PlotConfig) {
    configRef.current = mergePlotConfig(config);
    axes.x.config = configRef.current.axes.x;
    axes.y.config = configRef.current.axes.y;
    if (configRef.current.axes.x.range) {
      axes.x.range = configRef.current.axes.x.range;
      axes.x.auto = false;
    }
    if (configRef.current.axes.y.range) {
      axes.y.range = configRef.current.axes.y.range;
      axes.y.auto = false;
    }
    ensure2DBitmapForAll();
    scheduleRender(true);
  }

  function ensure2DBitmapForAll() {
    traces2D.forEach((trace) => ensure2DBitmap(trace));
  }

  function onZoom(callback: ZoomPanCallback) {
    zoomCallbacks.add(callback);
    return () => zoomCallbacks.delete(callback);
  }

  function onPan(callback: ZoomPanCallback) {
    panCallbacks.add(callback);
    return () => panCallbacks.delete(callback);
  }

  function onCursor(callback: CursorCallback) {
    cursorCallbacks.add(callback);
    return () => cursorCallbacks.delete(callback);
  }

  function destroy() {
    destroyed = true;
    detachCanvas();
    if (frameHandle !== null) {
      window.cancelAnimationFrame(frameHandle);
    }
    traces1D.clear();
    traces2D.clear();
    zoomCallbacks.clear();
    panCallbacks.clear();
    cursorCallbacks.clear();
  }

  function getAxisRange(axis: "x" | "y"): AxisRange {
    return axes[axis].range;
  }

  return {
    updateConfig,
    attachCanvas,
    detachCanvas,
    addTrace1D,
    addTrace2D,
    clearTraces,
    setAxisRange,
    getAxisRange,
    autoRange,
    onZoom,
    onPan,
    onCursor,
    requestRender: () => scheduleRender(true),
    destroy,
  };
}
