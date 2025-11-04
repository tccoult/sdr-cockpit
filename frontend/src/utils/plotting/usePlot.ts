import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type {
  AxisRange,
  PlotConfig,
  PlotInstanceInternal,
  PlotDebugApi,
  Trace1DConfig,
  Trace2DConfig,
  TraceData1D,
  TraceData2D,
  TraceHandle1D,
  TraceHandle2D,
  CursorInfo,
  CursorRenderArgs,
} from "./types";
import { Trace1DType, CursorStyle } from "./types";

type TraceRegistry = Map<string, TraceRecord>;

type TraceRecord1D = {
  id: string;
  config: Trace1DConfig;
  data: TraceData1D | null;
  visible: boolean;
  removed: boolean;
};

type TraceRecord2D = {
  id: string;
  config: Trace2DConfig;
  data: TraceData2D | null;
  visible: boolean;
  removed: boolean;
};

type TraceRecord = TraceRecord1D | TraceRecord2D;

type Projection = {
  projectX: (value: number) => number;
  projectY: (value: number) => number;
  invertX: (pixel: number) => number;
  invertY: (pixel: number) => number;
  rect: { left: number; top: number; width: number; height: number };
};

type PointerMode = "idle" | "pan" | "box";

type PointerState = {
  mode: PointerMode;
  pointerId: number | null;
  lastX: number;
  lastY: number;
  panStartX: AxisRange;
  panStartY: AxisRange;
  boxStartX: number;
};

type PointerInput = {
  clientX: number;
  clientY: number;
  shiftKey?: boolean;
  pointerId?: number | null;
};

type WheelInput = {
  clientX: number;
  clientY: number;
  deltaY: number;
};

const DEFAULT_AXIS_RANGE: AxisRange = { min: 0, max: 1 };
const DEFAULT_MARGINS = { top: 20, right: 30, bottom: 40, left: 60 };
const DEFAULT_BACKGROUND = "rgba(10, 10, 15, 0.85)";
const DEFAULT_TEXT_COLOR = "#ffffff";
const DEFAULT_GRID_COLOR = "rgba(255, 255, 255, 0.1)";
const DEFAULT_AXIS_LINE_COLOR = "rgba(255, 255, 255, 0.4)";
const DEFAULT_FONT_FAMILY = "Inter, system-ui, sans-serif";
const DEFAULT_FONT_SIZE = 12;
const FALLBACK_CANVAS_WIDTH = 640;
const FALLBACK_CANVAS_HEIGHT = 360;
const CURSOR_LINE_COLOR = "rgba(255, 255, 255, 0.7)";
const CURSOR_LINE_WIDTH = 1;
const CURSOR_HIGHLIGHT_COLOR = "#ffff7a";
const CURSOR_HIGHLIGHT_RADIUS = 5;
const CURSOR_HIGHLIGHT_LINE_WIDTH = 2;
const BOX_SELECT_FILL = "rgba(255, 0, 255, 0.12)";
const BOX_SELECT_STROKE = "rgba(255, 0, 255, 0.45)";
const BOX_SELECT_MIN_PIXELS = 8;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function cursorEquals(a: CursorInfo | null, b: CursorInfo | null): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return a === b;
  }
  if (
    a.canvasX !== b.canvasX ||
    a.canvasY !== b.canvasY ||
    a.dataX !== b.dataX ||
    a.dataY !== b.dataY
  ) {
    return false;
  }
  if (a.snapped === null || b.snapped === null) {
    return a.snapped === b.snapped;
  }
  return (
    a.snapped.traceId === b.snapped.traceId &&
    a.snapped.x === b.snapped.x &&
    a.snapped.y === b.snapped.y
  );
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const defaultCursorRender: CursorRenderArgs["renderDefault"] = ({
  ctx,
  projection,
  cursor,
  style,
}) => {
  const { rect } = projection;
  ctx.save();
  ctx.strokeStyle = CURSOR_LINE_COLOR;
  ctx.lineWidth = CURSOR_LINE_WIDTH;
  ctx.setLineDash([]);

  if (style === CursorStyle.Crosshair || style === CursorStyle.Vertical) {
    ctx.beginPath();
    ctx.moveTo(cursor.canvasX, rect.top);
    ctx.lineTo(cursor.canvasX, rect.top + rect.height);
    ctx.stroke();
  }

  if (style === CursorStyle.Crosshair || style === CursorStyle.Horizontal) {
    ctx.beginPath();
    ctx.moveTo(rect.left, cursor.canvasY);
    ctx.lineTo(rect.left + rect.width, cursor.canvasY);
    ctx.stroke();
  }

  if (style === CursorStyle.Crosshair || style === CursorStyle.Vertical) {
    ctx.strokeStyle = CURSOR_HIGHLIGHT_COLOR;
    ctx.lineWidth = CURSOR_HIGHLIGHT_LINE_WIDTH;
    ctx.beginPath();
    ctx.arc(cursor.canvasX, cursor.canvasY, CURSOR_HIGHLIGHT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
};

const defaultCursorOptions = {
  style: CursorStyle.Crosshair,
  snap: true,
};

const defaultInteractions = {
  zoom: "x" as "x" | "y" | "both",
  pan: "x" as "x" | "y" | "both",
  cursor: true,
  boxSelect: true,
};

function resolveMargins(config: PlotConfig) {
  return {
    top: config.margins?.top ?? DEFAULT_MARGINS.top,
    right: config.margins?.right ?? DEFAULT_MARGINS.right,
    bottom: config.margins?.bottom ?? DEFAULT_MARGINS.bottom,
    left: config.margins?.left ?? DEFAULT_MARGINS.left,
  };
}

function resolveInteractions(config: PlotConfig) {
  const merged = { ...defaultInteractions, ...(config.interactions ?? {}) };
  return merged;
}

function resolveCursorConfig(config: PlotConfig) {
  const { cursor } = config.interactions ?? {};
  if (cursor === undefined || cursor === true) {
    return defaultCursorOptions;
  }
  if (!cursor) {
    return { style: CursorStyle.None, snap: false };
}
  return {
    style: cursor.style ?? CursorStyle.Crosshair,
    snap: cursor.snap ?? true,
  };
}

function niceTicks(min: number, max: number, targetCount: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || targetCount <= 0) {
    return [];
  }
  if (min === max) {
    return [min];
  }
  const range = max - min;
  const clampedCount = Math.max(2, targetCount);
  const roughStep = range / (clampedCount - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep))));
  const residual = roughStep / magnitude;

  let step: number;
  if (residual > 5) step = 10 * magnitude;
  else if (residual > 2) step = 5 * magnitude;
  else if (residual > 1) step = 2 * magnitude;
  else step = magnitude;

  const ticks: number[] = [];
  const firstTick = Math.ceil(min / step) * step;
  for (let tick = firstTick; tick <= max + step / 2; tick += step) {
    const rounded = Number.parseFloat(tick.toFixed(12));
    ticks.push(rounded);
  }
  if (ticks.length === 0) {
    ticks.push(min, max);
  }
  return ticks;
}

function fallbackFormatter(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  const abs = Math.abs(value);
  if ((abs >= 1e6 || (abs <= 1e-3 && abs > 0)) && abs !== 0) {
    return value.toExponential(2);
  }
  if (abs >= 1000) {
    return value.toLocaleString();
  }
  return value.toFixed(abs < 1 ? 3 : 2);
}

function formatTick(axisConfig: PlotConfig["axes"]["x"], value: number) {
  const formatter =
    axisConfig.ticks?.formatter ??
    axisConfig.formatter ??
    fallbackFormatter;
  try {
    return formatter(value);
  } catch (error) {
    if (import.meta.env.MODE !== "production") {
      console.warn("[plotting] Tick formatter threw an error:", error);
    }
    return fallbackFormatter(value);
  }
}

function isTrace1D(record: TraceRecord): record is TraceRecord1D {
  return (
    "config" in record &&
    (record as TraceRecord1D).config != null &&
    "type" in (record as TraceRecord1D).config
  );
}

function zoomRange(range: AxisRange, factor: number, anchor: number): AxisRange {
  const span = range.max - range.min || 1;
  const targetSpan = Math.max(span * factor, span * 1e-6);
  const clampedAnchor = Number.isFinite(anchor)
    ? anchor
    : range.min + span / 2;
  const t = (clampedAnchor - range.min) / span;
  const newMin = clampedAnchor - t * targetSpan;
  return { min: newMin, max: newMin + targetSpan };
}

function axisAllows(option: boolean | "x" | "y" | "both", axis: "x" | "y") {
  if (!option) return false;
  if (option === true || option === "both") return true;
  return option === axis;
}

const createPointerState = (): PointerState => ({
  mode: "idle",
  pointerId: null,
  lastX: 0,
  lastY: 0,
  panStartX: { ...DEFAULT_AXIS_RANGE },
  panStartY: { ...DEFAULT_AXIS_RANGE },
  boxStartX: 0,
});

type CursorListener = (info: CursorInfo | null) => void;

export function usePlot(config: PlotConfig): PlotInstanceInternal {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(config);
  const projectionRef = useRef<Projection | null>(null);
  const frameRef = useRef<number | null>(null);
  const tracesRef = useRef<TraceRegistry>(new Map());
  const nextTraceIdRef = useRef(0);
  const axisRangeRef = useRef<Record<"x" | "y", AxisRange>>({
    x: config.axes.x.range ?? { ...DEFAULT_AXIS_RANGE },
    y: config.axes.y.range ?? { ...DEFAULT_AXIS_RANGE },
  });
  const pointerStateRef = useRef<PointerState>(createPointerState());
  const selectionRef = useRef<{ active: boolean; start: number; current: number } | null>(null);
  const cursorStateRef = useRef<CursorInfo | null>(null);
  const zoomListenersRef = useRef(
    new Set<(axis: "x" | "y" | "both", range: AxisRange) => void>()
  );
  const panListenersRef = useRef(
    new Set<(axis: "x" | "y" | "both", range: AxisRange) => void>()
  );
  const cursorListenersRef = useRef(new Set<CursorListener>());

  const renderCursorCallbackRef = useRef<CursorRenderArgs["renderDefault"]>(defaultCursorRender);
  const renderRef = useRef<() => void>(() => {});
  const cursorRenderProp = config.cursor?.render;
  useEffect(() => {
    renderCursorCallbackRef.current = cursorRenderProp ?? defaultCursorRender;
  }, [cursorRenderProp]);

  const scheduleRender = useCallback(() => {
    if (frameRef.current !== null || !canvasRef.current) {
      return;
    }
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      renderRef.current();
    });
  }, []);

  useEffect(() => {
    configRef.current = config;
    scheduleRender();
  }, [config, scheduleRender]);

  const emitZoom = useCallback(
    (axis: "x" | "y", range: AxisRange) => {
      zoomListenersRef.current.forEach((listener) =>
        listener(axis, range)
      );
    },
    []
  );

  const emitPan = useCallback(
    (axis: "x" | "y", range: AxisRange) => {
      panListenersRef.current.forEach((listener) =>
        listener(axis, range)
      );
    },
    []
  );

  const emitCursor = useCallback(
    (cursor: CursorInfo | null): boolean => {
      if (cursorEquals(cursorStateRef.current, cursor)) {
        return false;
      }
      cursorStateRef.current = cursor;
      cursorListenersRef.current.forEach((listener) => listener(cursor));
      return true;
    },
    []
  );

  const applyAxisRange = useCallback(
    (axis: "x" | "y", min: number, max: number, source: "pan" | "zoom" | "manual") => {
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return;
      }
      if (min === max) {
        return;
      }
      const prev = axisRangeRef.current[axis];
      if (Math.abs(prev.min - min) < 1e-9 && Math.abs(prev.max - max) < 1e-9) {
        return;
      }
      axisRangeRef.current[axis] = { min, max };
      if (source === "pan") {
        emitPan(axis, axisRangeRef.current[axis]);
      } else if (source === "zoom") {
        emitZoom(axis, axisRangeRef.current[axis]);
      }
      scheduleRender();
    },
    [emitPan, emitZoom, scheduleRender]
  );

  const findNearestPoint1D = useCallback(
    (value: number): { traceId: string; x: number; y: number } | null => {
      let closest: { traceId: string; x: number; y: number } | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      tracesRef.current.forEach((record) => {
        if (!isTrace1D(record) || record.removed || !record.visible || !record.data) {
          return;
        }
        const { x, y } = record.data;
        const length = Math.min(x.length, y.length);
        for (let i = 0; i < length; i += 1) {
          const xVal = (x as ArrayLike<number>)[i];
          const yVal = (y as ArrayLike<number>)[i];
          if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) continue;
          const distance = Math.abs(xVal - value);
          if (distance < bestDistance) {
            bestDistance = distance;
            closest = { traceId: record.id, x: xVal, y: yVal };
          }
        }
      });
      return closest;
    },
    []
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cfg = configRef.current;
    const dpr =
      cfg.highDPI === false
        ? 1
        : typeof window !== "undefined"
        ? window.devicePixelRatio || 1
        : 1;

    const rect = canvas.getBoundingClientRect();
    let cssWidth = rect.width || canvas.clientWidth;
    let cssHeight = rect.height || canvas.clientHeight;
    if (!cssWidth) {
      const fallback = Number(canvas.getAttribute("width")) || FALLBACK_CANVAS_WIDTH;
      cssWidth = fallback;
      canvas.style.width = `${fallback}px`;
    }
    if (!cssHeight) {
      const fallback = Number(canvas.getAttribute("height")) || FALLBACK_CANVAS_HEIGHT;
      cssHeight = fallback;
      canvas.style.height = `${fallback}px`;
    }

    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.imageSmoothingEnabled = true;

    const margins = resolveMargins(cfg);
    const plotWidth = Math.max(0, cssWidth - margins.left - margins.right);
    const plotHeight = Math.max(0, cssHeight - margins.top - margins.bottom);
    if (plotWidth <= 0 || plotHeight <= 0) {
      projectionRef.current = null;
      return;
    }

    const background = cfg.background ?? DEFAULT_BACKGROUND;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    const xRange = axisRangeRef.current.x;
    const yRange = axisRangeRef.current.y;
    const xSpan = xRange.max - xRange.min || 1;
    const ySpan = yRange.max - yRange.min || 1;

    const projectX = (value: number) =>
      margins.left + ((value - xRange.min) / xSpan) * plotWidth;
    const projectY = (value: number) =>
      margins.top + (1 - (value - yRange.min) / ySpan) * plotHeight;
    const invertX = (pixel: number) =>
      xRange.min + ((pixel - margins.left) / plotWidth) * xSpan;
    const invertY = (pixel: number) =>
      yRange.min + (1 - (pixel - margins.top) / plotHeight) * ySpan;

    projectionRef.current = {
      projectX,
      projectY,
      invertX,
      invertY,
      rect: {
        left: margins.left,
        top: margins.top,
        width: plotWidth,
        height: plotHeight,
      },
    };

    const grid = cfg.grid ?? { show: true };
    if (grid.show !== false) {
      ctx.save();
      ctx.strokeStyle = grid.color ?? DEFAULT_GRID_COLOR;
      ctx.lineWidth = grid.lineWidth ?? 1;
      ctx.setLineDash([4, 4]);

      const xTicks = niceTicks(xRange.min, xRange.max, 8);
      const yTicks = niceTicks(yRange.min, yRange.max, 8);

      for (const tick of xTicks) {
        const x = projectX(tick);
        ctx.beginPath();
        ctx.moveTo(x, margins.top);
        ctx.lineTo(x, margins.top + plotHeight);
        ctx.stroke();
      }
      for (const tick of yTicks) {
        const y = projectY(tick);
        ctx.beginPath();
        ctx.moveTo(margins.left, y);
        ctx.lineTo(margins.left + plotWidth, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = DEFAULT_AXIS_LINE_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margins.left, margins.top);
    ctx.lineTo(margins.left, margins.top + plotHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(margins.left, margins.top + plotHeight);
    ctx.lineTo(margins.left + plotWidth, margins.top + plotHeight);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = cfg.textColor ?? DEFAULT_TEXT_COLOR;
    ctx.font = `${cfg.fontSize ?? DEFAULT_FONT_SIZE}px ${
      cfg.fontFamily ?? DEFAULT_FONT_FAMILY
    }`;
    ctx.textBaseline = "top";
    ctx.textAlign = "center";

    for (const tick of niceTicks(xRange.min, xRange.max, 8)) {
      ctx.fillText(
        formatTick(cfg.axes.x, tick),
        projectX(tick),
        margins.top + plotHeight + 6
      );
    }

    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    for (const tick of niceTicks(yRange.min, yRange.max, 8)) {
      ctx.fillText(
        formatTick(cfg.axes.y, tick),
        margins.left - 6,
        projectY(tick)
      );
    }

    if (cfg.axes.x.label) {
      ctx.textBaseline = "bottom";
      ctx.textAlign = "center";
      ctx.fillText(
        cfg.axes.x.label,
        margins.left + plotWidth / 2,
        cssHeight - 4
      );
    }

    if (cfg.axes.y.label) {
      ctx.save();
      ctx.translate(12, margins.top + plotHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textBaseline = "bottom";
      ctx.textAlign = "center";
      ctx.fillText(cfg.axes.y.label, 0, 0);
      ctx.restore();
    }
    ctx.restore();

    const sortedTraces = Array.from(tracesRef.current.values()).filter(
      (record) => !record.removed && record.visible
    );
    sortedTraces.sort((a, b) => {
      const zA = "config" in a && "zIndex" in a.config ? a.config.zIndex ?? 0 : 0;
      const zB = "config" in b && "zIndex" in b.config ? b.config.zIndex ?? 0 : 0;
      return zA - zB;
    });

    for (const record of sortedTraces) {
      if (!isTrace1D(record) || !record.data) {
        continue;
      }
      const { config: traceConfig, data } = record;
      const xData = data.x;
      const yData = data.y;
      const length = Math.min(xData.length, yData.length);
      if (length === 0) continue;

      const strokeColor = traceConfig.color ?? "#00ffc8";
      const opacity = traceConfig.opacity ?? 1;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = traceConfig.lineWidth ?? 2;
      ctx.setLineDash(traceConfig.dashPattern ?? []);

      switch (traceConfig.type) {
        case Trace1DType.Line: {
          ctx.beginPath();
          let hasPoint = false;
          for (let i = 0; i < length; i += 1) {
            const xVal = (xData as ArrayLike<number>)[i];
            const yVal = (yData as ArrayLike<number>)[i];
            if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) {
              hasPoint = false;
              continue;
            }
            const cx = projectX(xVal);
            const cy = projectY(yVal);
            if (!hasPoint) {
              ctx.moveTo(cx, cy);
              hasPoint = true;
            } else {
              ctx.lineTo(cx, cy);
            }
          }
          if (hasPoint) {
            ctx.stroke();
          }
          break;
        }
        case Trace1DType.Scatter: {
          const radius = traceConfig.pointSize ?? 3;
          ctx.beginPath();
          for (let i = 0; i < length; i += 1) {
            const xVal = (xData as ArrayLike<number>)[i];
            const yVal = (yData as ArrayLike<number>)[i];
            if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) continue;
            ctx.moveTo(projectX(xVal) + radius, projectY(yVal));
            ctx.arc(projectX(xVal), projectY(yVal), radius, 0, Math.PI * 2);
          }
          ctx.fillStyle = strokeColor;
          ctx.fill();
          break;
        }
        case Trace1DType.Area: {
          const baseline = traceConfig.baseline ?? 0;
          const baselineY = projectY(baseline);
          ctx.beginPath();
          let started = false;
          for (let i = 0; i < length; i += 1) {
            const xVal = (xData as ArrayLike<number>)[i];
            const yVal = (yData as ArrayLike<number>)[i];
            if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) continue;
            const cx = projectX(xVal);
            const cy = projectY(yVal);
            if (!started) {
              ctx.moveTo(cx, baselineY);
              ctx.lineTo(cx, cy);
              started = true;
            } else {
              ctx.lineTo(cx, cy);
            }
          }
          if (started) {
            const lastX = projectX((xData as ArrayLike<number>)[length - 1]);
            ctx.lineTo(lastX, baselineY);
            ctx.closePath();
            ctx.fillStyle = traceConfig.fillColor ?? strokeColor;
            ctx.globalAlpha = traceConfig.fillOpacity ?? 0.2;
            ctx.fill();
            ctx.globalAlpha = opacity;
            ctx.stroke();
          }
          break;
        }
        default: {
          if (import.meta.env.MODE !== "production") {
            console.warn(`[plotting] Trace type "${traceConfig.type}" not implemented yet.`);
          }
          break;
        }
      }
      ctx.restore();
    }

    if (selectionRef.current?.active) {
      const { start, current } = selectionRef.current;
      const left = clamp(Math.min(start, current), margins.left, margins.left + plotWidth);
      const right = clamp(Math.max(start, current), margins.left, margins.left + plotWidth);
      if (right - left >= BOX_SELECT_MIN_PIXELS) {
        ctx.save();
        ctx.fillStyle = BOX_SELECT_FILL;
        ctx.strokeStyle = BOX_SELECT_STROKE;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.fillRect(left, margins.top, right - left, plotHeight);
        ctx.strokeRect(left, margins.top, right - left, plotHeight);
        ctx.restore();
      }
    }

    const cursor = cursorStateRef.current;
    const cursorConfig = resolveCursorConfig(cfg);
    if (cursor && cursorConfig.style !== CursorStyle.None) {
      const renderArgs: CursorRenderArgs = {
        ctx,
        projection: projectionRef.current!,
        cursor,
        style: cursorConfig.style,
        renderDefault: defaultCursorRender,
      };
      renderCursorCallbackRef.current(renderArgs);
    }
  }, []);

  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  useEffect(() => {
    scheduleRender();
  }, [scheduleRender]);

  const getPointerPosition = useCallback(
    (input: { clientX: number; clientY: number }) => {
      const canvas = canvasRef.current;
      const projection = projectionRef.current;
      if (!canvas || !projection) return null;
      const rect = canvas.getBoundingClientRect();
      const x = input.clientX - rect.left;
      const y = input.clientY - rect.top;
      const inside =
        x >= projection.rect.left &&
        x <= projection.rect.left + projection.rect.width &&
        y >= projection.rect.top &&
        y <= projection.rect.top + projection.rect.height;
      return { x, y, inside };
    },
    []
  );

  const updateCursor = useCallback(
    (pointer: { x: number; y: number; inside: boolean } | null) => {
      const projection = projectionRef.current;
      const cursorConfig = resolveCursorConfig(configRef.current);
      if (!projection || !pointer || !pointer.inside) {
        if (emitCursor(null)) {
          scheduleRender();
        }
        return;
      }

      let pointerInfo: { x: number; y: number; inside: boolean } = {
        x: pointer.x,
        y: pointer.y,
        inside: pointer.inside,
      };
      const dataX = projection.invertX(pointerInfo.x);
      const dataY = projection.invertY(pointerInfo.y);
      let finalX = dataX;
      let finalY = dataY;
      let snappedInfo: { traceId: string; x: number; y: number } | null = null;

      if (cursorConfig.snap) {
        const nearest = findNearestPoint1D(dataX);
        if (nearest) {
          finalX = nearest.x;
          finalY = nearest.y;
          pointerInfo = {
            ...pointerInfo,
            x: projection.projectX(nearest.x),
            y: projection.projectY(nearest.y),
            inside: pointerInfo.inside,
          };
          snappedInfo = nearest;
        }
      }

      const cursorInfo: CursorInfo = {
        canvasX: pointerInfo.x,
        canvasY: pointerInfo.y,
        dataX: finalX,
        dataY: finalY,
        snapped: snappedInfo
          ? {
              traceId: snappedInfo.traceId,
              x: snappedInfo.x,
              y: snappedInfo.y,
            }
          : null,
      };

      if (emitCursor(cursorInfo)) {
        scheduleRender();
      }
    },
    [emitCursor, findNearestPoint1D, scheduleRender]
  );

  const beginInteraction = useCallback(
    (input: PointerInput) => {
      const pointer = getPointerPosition(input);
      const projection = projectionRef.current;
      const interactions = resolveInteractions(configRef.current);
      if (!pointer || !projection) return;

      const boxSelectEnabled = interactions.boxSelect !== false;
      const panEnabled = axisAllows(interactions.pan, "x");

      if (pointer.inside && boxSelectEnabled && input.shiftKey) {
        pointerStateRef.current = {
          mode: "box",
          pointerId: input.pointerId ?? null,
          lastX: pointer.x,
          lastY: pointer.y,
          panStartX: { ...axisRangeRef.current.x },
          panStartY: { ...axisRangeRef.current.y },
          boxStartX: pointer.x,
        };
        selectionRef.current = { active: true, start: pointer.x, current: pointer.x };
        scheduleRender();
        return;
      }

      if (pointer.inside && panEnabled) {
        pointerStateRef.current = {
          mode: "pan",
          pointerId: input.pointerId ?? null,
          lastX: pointer.x,
          lastY: pointer.y,
          panStartX: { ...axisRangeRef.current.x },
          panStartY: { ...axisRangeRef.current.y },
          boxStartX: pointer.x,
        };
        return;
      }

      pointerStateRef.current = createPointerState();
      selectionRef.current = null;
    },
    [getPointerPosition, scheduleRender]
  );

  const moveInteraction = useCallback(
    (input: PointerInput) => {
      const pointer = getPointerPosition(input);
      const projection = projectionRef.current;
      const interactions = resolveInteractions(configRef.current);
      const state = pointerStateRef.current;

      if (pointer && pointer.inside) {
        updateCursor(pointer);
      } else if (pointerStateRef.current.mode === "idle") {
        updateCursor(null);
      }

      if (!pointer || !projection) return;

      if (state.mode === "box" && selectionRef.current) {
        selectionRef.current = {
          active: true,
          start: state.boxStartX,
          current: pointer.x,
        };
        scheduleRender();
        return;
      }

      if (state.mode === "pan") {
        pointerStateRef.current.lastX = pointer.x;
        pointerStateRef.current.lastY = pointer.y;

        if (axisAllows(interactions.pan, "x")) {
          const span = state.panStartX.max - state.panStartX.min || 1;
          const delta = (pointer.x - state.boxStartX) / projection.rect.width;
          const shift = delta * span;
          applyAxisRange(
            "x",
            state.panStartX.min - shift,
            state.panStartX.max - shift,
            "pan"
          );
        }
        scheduleRender();
      }
    },
    [applyAxisRange, getPointerPosition, scheduleRender, updateCursor]
  );

  const endInteraction = useCallback(
    (input: PointerInput) => {
      const projection = projectionRef.current;
      const state = pointerStateRef.current;

      if (state.mode === "box" && selectionRef.current && projection) {
        const { start, current } = selectionRef.current;
        const left = clamp(Math.min(start, current), projection.rect.left, projection.rect.left + projection.rect.width);
        const right = clamp(Math.max(start, current), projection.rect.left, projection.rect.left + projection.rect.width);
        const span = right - left;
        if (span >= BOX_SELECT_MIN_PIXELS) {
          const newMin = projection.invertX(left);
          const newMax = projection.invertX(right);
          applyAxisRange("x", newMin, newMax, "zoom");
        }
      }

      selectionRef.current = null;
      pointerStateRef.current = createPointerState();

      const pointer = getPointerPosition(input);
      if (pointer && pointer.inside) {
        updateCursor(pointer);
      } else {
        updateCursor(null);
      }
      scheduleRender();
    },
    [applyAxisRange, getPointerPosition, scheduleRender, updateCursor]
  );

  const cancelInteraction = useCallback(() => {
    selectionRef.current = null;
    pointerStateRef.current = createPointerState();
    updateCursor(null);
    scheduleRender();
  }, [scheduleRender, updateCursor]);

  const handleWheelInput = useCallback(
    (input: WheelInput) => {
      const interactions = resolveInteractions(configRef.current);
      if (!axisAllows(interactions.zoom, "x") && !axisAllows(interactions.zoom, "y")) {
        return;
      }

      const pointer = getPointerPosition(input);
      const projection = projectionRef.current;
      if (!projection) return;

      const factor = input.deltaY > 0 ? 1.1 : 0.9;

      if (axisAllows(interactions.zoom, "x")) {
        const anchor = pointer?.inside ? projection.invertX(pointer.x) : mix(axisRangeRef.current.x.min, axisRangeRef.current.x.max, 0.5);
        const next = zoomRange(axisRangeRef.current.x, factor, anchor);
        applyAxisRange("x", next.min, next.max, "zoom");
      }

      if (axisAllows(interactions.zoom, "y")) {
        const anchor = pointer?.inside ? projection.invertY(pointer.y) : mix(axisRangeRef.current.y.min, axisRangeRef.current.y.max, 0.5);
        const next = zoomRange(axisRangeRef.current.y, factor, anchor);
        applyAxisRange("y", next.min, next.max, "zoom");
      }

      scheduleRender();
    },
    [applyAxisRange, getPointerPosition, scheduleRender]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      handleWheelInput({
        clientX: event.clientX,
        clientY: event.clientY,
        deltaY: event.deltaY,
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      event.preventDefault();
      beginInteraction({
        clientX: event.clientX,
        clientY: event.clientY,
        shiftKey: event.shiftKey,
        pointerId: event.pointerId,
      });
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // ignored
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      moveInteraction({
        clientX: event.clientX,
        clientY: event.clientY,
        shiftKey: event.shiftKey,
        pointerId: event.pointerId,
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      endInteraction({
        clientX: event.clientX,
        clientY: event.clientY,
        shiftKey: event.shiftKey,
        pointerId: event.pointerId,
      });
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // ignored
      }
    };

    const handlePointerCancel = (event: PointerEvent) => {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // ignored
      }
      cancelInteraction();
    };

    const handlePointerLeave = () => {
      updateCursor(null);
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerCancel);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [
    beginInteraction,
    cancelInteraction,
    endInteraction,
    handleWheelInput,
    moveInteraction,
    updateCursor,
  ]);

  const addTrace1D = useCallback(
    (traceConfig: Trace1DConfig) => {
      const id = `t1d-${nextTraceIdRef.current++}`;
      const record: TraceRecord1D = {
        id,
        config: traceConfig,
        data: null,
        visible: traceConfig.visible ?? true,
        removed: false,
      };
      tracesRef.current.set(id, record);
      scheduleRender();
      const handle: TraceHandle1D = {
        update: (data: TraceData1D) => {
          if (record.removed) {
            throw new Error(`[plotting] Trace "${id}" has been removed.`);
          }
          record.data = data;
          scheduleRender();
        },
        setVisible: (visible: boolean) => {
          if (record.removed) return;
          record.visible = visible;
          scheduleRender();
        },
        setConfig: (configUpdate: Partial<Trace1DConfig>) => {
          if (record.removed) return;
          record.config = { ...record.config, ...configUpdate };
          scheduleRender();
        },
        remove: () => {
          if (record.removed) return;
          record.removed = true;
          tracesRef.current.delete(id);
          scheduleRender();
        },
      };
      return handle;
    },
    [scheduleRender]
  );

  const addTrace2D = useCallback(
    (traceConfig: Trace2DConfig) => {
      const id = `t2d-${nextTraceIdRef.current++}`;
      const record: TraceRecord2D = {
        id,
        config: traceConfig,
        data: null,
        visible: traceConfig.visible ?? true,
        removed: false,
      };
      tracesRef.current.set(id, record);
      scheduleRender();
      const handle: TraceHandle2D = {
        update: (data: TraceData2D) => {
          if (record.removed) {
            throw new Error(`[plotting] Trace "${id}" has been removed.`);
          }
          record.data = data;
          scheduleRender();
        },
        setVisible: (visible: boolean) => {
          if (record.removed) return;
          record.visible = visible;
          scheduleRender();
        },
        setConfig: (configUpdate: Partial<Trace2DConfig>) => {
          if (record.removed) return;
          record.config = { ...record.config, ...configUpdate };
          scheduleRender();
        },
        remove: () => {
          if (record.removed) return;
          record.removed = true;
          tracesRef.current.delete(id);
          scheduleRender();
        },
      };
      return handle;
    },
    [scheduleRender]
  );

  const clearTraces = useCallback(() => {
    tracesRef.current.forEach((record) => {
      record.removed = true;
    });
    tracesRef.current.clear();
    scheduleRender();
  }, [scheduleRender]);

  const setAxisRange = useCallback(
    (axis: "x" | "y", min: number, max: number) => {
      applyAxisRange(axis, min, max, "manual");
    },
    [applyAxisRange]
  );

  const getAxisRange = useCallback((axis: "x" | "y") => {
    return axisRangeRef.current[axis];
  }, []);

  const autoRange = useCallback(
    (axis: "x" | "y" | "both", padding = 0.05) => {
      if (axis === "both" || axis === "x") {
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        tracesRef.current.forEach((record) => {
          if (!isTrace1D(record) || !record.data) return;
          const xs = record.data.x;
          const length = xs.length;
          for (let i = 0; i < length; i += 1) {
            const val = (xs as ArrayLike<number>)[i];
            if (!Number.isFinite(val)) continue;
            min = Math.min(min, val);
            max = Math.max(max, val);
          }
        });
        if (min < max) {
          const span = max - min;
          applyAxisRange(
            "x",
            min - span * padding,
            max + span * padding,
            "manual"
          );
        }
      }
      if (axis === "both" || axis === "y") {
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        tracesRef.current.forEach((record) => {
          if (!isTrace1D(record) || !record.data) return;
          const ys = record.data.y;
          const length = ys.length;
          for (let i = 0; i < length; i += 1) {
            const val = (ys as ArrayLike<number>)[i];
            if (!Number.isFinite(val)) continue;
            min = Math.min(min, val);
            max = Math.max(max, val);
          }
        });
        if (min < max) {
          const span = max - min;
          applyAxisRange(
            "y",
            min - span * padding,
            max + span * padding,
            "manual"
          );
        }
      }
    },
    [applyAxisRange]
  );

  const onZoom = useCallback(
    (listener: (axis: "x" | "y" | "both", range: AxisRange) => void) => {
      zoomListenersRef.current.add(listener);
      return () => {
        zoomListenersRef.current.delete(listener);
      };
    },
    []
  );

  const onPan = useCallback(
    (listener: (axis: "x" | "y" | "both", range: AxisRange) => void) => {
      panListenersRef.current.add(listener);
      return () => {
        panListenersRef.current.delete(listener);
      };
    },
    []
  );

  const onCursor = useCallback(
    (listener: CursorListener) => {
      cursorListenersRef.current.add(listener);
      return () => {
        cursorListenersRef.current.delete(listener);
      };
    },
    []
  );

  const destroy = useCallback(() => {
    clearTraces();
    zoomListenersRef.current.clear();
    panListenersRef.current.clear();
    cursorListenersRef.current.clear();
    selectionRef.current = null;
    cursorStateRef.current = null;
    pointerStateRef.current = createPointerState();
    projectionRef.current = null;
  }, [clearTraces]);

  const debugApi = useMemo<PlotDebugApi>(() => {
    return {
      get traceCount() {
        return tracesRef.current.size;
      },
      get traceIds() {
        return Array.from(tracesRef.current.keys());
      },
      getTraceData: (traceId: string) => {
        const record = tracesRef.current.get(traceId);
        if (!record) return null;
        return isTrace1D(record) ? record.data : record.data;
      },
      simulateWheel: (input) => {
        handleWheelInput(input);
      },
      simulatePointerDown: (input) => {
        beginInteraction(input);
      },
      simulatePointerMove: (input) => {
        moveInteraction(input);
      },
      simulatePointerUp: (input) => {
        endInteraction(input);
      },
      flush: () => {
        render();
      },
      getCursorInfo: () => cursorStateRef.current,
    };
  }, [beginInteraction, endInteraction, handleWheelInput, moveInteraction, render]);

  return useMemo<PlotInstanceInternal>(() => {
    return {
      canvasRef,
      addTrace1D,
      addTrace2D,
      clearTraces,
      setAxisRange,
      getAxisRange,
      autoRange,
      onZoom,
      onPan,
      onCursor,
      requestRender: scheduleRender,
      destroy,
      __debug: debugApi,
    };
  }, [
    addTrace1D,
    addTrace2D,
    autoRange,
    clearTraces,
    debugApi,
    destroy,
    getAxisRange,
    onCursor,
    onPan,
    onZoom,
    scheduleRender,
    setAxisRange,
  ]);
}
