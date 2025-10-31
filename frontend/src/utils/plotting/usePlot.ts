import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import type {
  AxisRange,
  PlotConfig,
  PlotInstance,
  PlotInstanceInternal,
  PlotDebugApi,
  Trace1DConfig,
  Trace2DConfig,
  TraceData1D,
  TraceData2D,
  TraceHandle1D,
  TraceHandle2D,
  CursorInfo,
  WheelEventLike,
  PointerEventLike,
} from "./types";
import { Trace1DType } from "./types";

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

type TraceRegistry = Map<string, TraceRecord>;

type ProjectionMetrics = {
  projectX: (value: number) => number;
  projectY: (value: number) => number;
  invertX: (pixel: number) => number;
  invertY: (pixel: number) => number;
  plotRect: { left: number; top: number; width: number; height: number };
};

type PointerState = {
  active: boolean;
  pointerId: number | null;
  lastX: number;
  lastY: number;
  isPanning: boolean;
  panX: boolean;
  panY: boolean;
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

const warnNotImplemented = (method: string) => {
  if (import.meta.env.MODE !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`[plotting] ${method} is not implemented yet.`);
  }
};

type CursorListener = Parameters<PlotInstance["onCursor"]>[0];

function resolveMargins(config: PlotConfig) {
  return {
    top: config.margins?.top ?? DEFAULT_MARGINS.top,
    right: config.margins?.right ?? DEFAULT_MARGINS.right,
    bottom: config.margins?.bottom ?? DEFAULT_MARGINS.bottom,
    left: config.margins?.left ?? DEFAULT_MARGINS.left,
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

function getTickValues(
  range: AxisRange,
  axisConfig: PlotConfig["axes"]["x"],
  fallbackCount: number,
  override?: number | "auto"
) {
  const axisCount = axisConfig.ticks?.count;
  let targetCount: number | undefined;
  if (typeof axisCount === "number" && axisCount > 0) {
    targetCount = axisCount;
  } else if (typeof override === "number" && override > 0) {
    targetCount = override;
  }

  return niceTicks(range.min, range.max, targetCount ?? fallbackCount);
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
      // eslint-disable-next-line no-console
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

function axisOptionEnabled(
  option: PlotConfig["interactions"] extends infer T
    ? T extends { pan?: infer P }
      ? P
      : unknown
    : unknown,
  axis: "x" | "y"
) {
  if (!option) return false;
  if (option === true) return true;
  if (option === "both") return true;
  if (option === axis) return true;
  if (typeof option === "string") {
    return option === axis;
  }
  return false;
}

function zoomOptionEnabled(
  option: PlotConfig["interactions"] extends infer T
    ? T extends { zoom?: infer P }
      ? P
      : unknown
    : unknown,
  axis: "x" | "y"
) {
  if (option === undefined || option === false) {
    return false;
  }
  if (option === true || option === "both") {
    return true;
  }
  if (option === "x") {
    return axis === "x";
  }
  if (option === "y") {
    return axis === "y";
  }
  return false;
}

function cursorOptionEnabled(option: PlotConfig["interactions"] extends infer T
  ? T extends { cursor?: infer C }
    ? C
    : unknown
  : unknown) {
  if (option === undefined) return true;
  if (option === false) return false;
  if (typeof option === "object" && option !== null) {
    if (option.style === undefined) return true;
    return option.style !== "none";
  }
  return Boolean(option);
}

function createTraceHandle1D(
  tracesRef: MutableRefObject<TraceRegistry>,
  record: TraceRecord1D,
  requestRender: () => void
): TraceHandle1D {
  const ensureActive = () => {
    if (record.removed) {
      throw new Error(
        `[plotting] Trace "${record.id}" has been removed and cannot be updated.`
      );
    }
  };

  return {
    update: (data) => {
      ensureActive();
      record.data = data;
      requestRender();
    },
    setVisible: (visible) => {
      ensureActive();
      record.visible = visible;
      requestRender();
    },
    setConfig: (config) => {
      ensureActive();
      record.config = { ...record.config, ...config };
      requestRender();
    },
    remove: () => {
      if (record.removed) {
        return;
      }
      record.removed = true;
      tracesRef.current.delete(record.id);
      requestRender();
    },
  };
}

function createTraceHandle2D(
  tracesRef: MutableRefObject<TraceRegistry>,
  record: TraceRecord2D,
  requestRender: () => void
): TraceHandle2D {
  const ensureActive = () => {
    if (record.removed) {
      throw new Error(
        `[plotting] Trace "${record.id}" has been removed and cannot be updated.`
      );
    }
  };

  return {
    update: (data) => {
      ensureActive();
      record.data = data;
      requestRender();
    },
    setVisible: (visible) => {
      ensureActive();
      record.visible = visible;
      requestRender();
    },
    setConfig: (config) => {
      ensureActive();
      record.config = { ...record.config, ...config };
      requestRender();
    },
    remove: () => {
      if (record.removed) {
        return;
      }
      record.removed = true;
      tracesRef.current.delete(record.id);
      requestRender();
    },
  };
}

export function usePlot(config: PlotConfig): PlotInstanceInternal {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(config);
  const tracesRef = useRef<TraceRegistry>(new Map());
  const nextTraceIdRef = useRef(0);

  const axisRangesRef = useRef<Record<"x" | "y", AxisRange>>({
    x: config.axes.x.range ?? { ...DEFAULT_AXIS_RANGE },
    y: config.axes.y.range ?? { ...DEFAULT_AXIS_RANGE },
  });

  const projectionRef = useRef<ProjectionMetrics | null>(null);
  const pointerStateRef = useRef<PointerState>({
    active: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    isPanning: false,
    panX: false,
    panY: false,
  });
  const lastCursorInfoRef = useRef<CursorInfo | null>(null);

  const zoomListenersRef = useRef(
    new Set<(axis: "x" | "y" | "both", range: AxisRange) => void>()
  );
  const panListenersRef = useRef(
    new Set<(axis: "x" | "y" | "both", range: AxisRange) => void>()
  );
  const cursorListenersRef = useRef(new Set<CursorListener>());

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const renderPlot = useCallback(() => {
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
      const widthAttr = Number(canvas.getAttribute("width"));
      cssWidth = widthAttr || FALLBACK_CANVAS_WIDTH;
      canvas.style.width = `${cssWidth}px`;
    }
    if (!cssHeight) {
      const heightAttr = Number(canvas.getAttribute("height"));
      cssHeight = heightAttr || FALLBACK_CANVAS_HEIGHT;
      canvas.style.height = `${cssHeight}px`;
    }

    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    if (ctx.resetTransform) {
      ctx.resetTransform();
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

    const xRange = axisRangesRef.current.x;
    const yRange = axisRangesRef.current.y;
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
      plotRect: {
        left: margins.left,
        top: margins.top,
        width: plotWidth,
        height: plotHeight,
      },
    };

    const gridConfig = cfg.grid ?? {};
    const showGrid = gridConfig.show !== false;
    const textColor = cfg.textColor ?? DEFAULT_TEXT_COLOR;
    const fontSize = cfg.fontSize ?? DEFAULT_FONT_SIZE;
    const fontFamily = cfg.fontFamily ?? DEFAULT_FONT_FAMILY;
    ctx.font = `${fontSize}px ${fontFamily}`;

    const xTicks = getTickValues(
      xRange,
      cfg.axes.x,
      8,
      gridConfig.xLines
    );
    const yTicks = getTickValues(
      yRange,
      cfg.axes.y,
      8,
      gridConfig.yLines
    );

    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = gridConfig.color ?? DEFAULT_GRID_COLOR;
      ctx.lineWidth = gridConfig.lineWidth ?? 1;
      ctx.setLineDash(
        Array.isArray(gridConfig.dashPattern) ? gridConfig.dashPattern : [3, 3]
      );

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
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(margins.left, margins.top);
    ctx.lineTo(margins.left, margins.top + plotHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(margins.left, margins.top + plotHeight);
    ctx.lineTo(margins.left + plotWidth, margins.top + plotHeight);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = textColor;
    ctx.textBaseline = "top";
    ctx.textAlign = "center";

    for (const tick of xTicks) {
      const x = projectX(tick);
      ctx.fillText(
        formatTick(cfg.axes.x, tick),
        x,
        margins.top + plotHeight + 6
      );
    }

    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    for (const tick of yTicks) {
      const y = projectY(tick);
      ctx.fillText(formatTick(cfg.axes.y, tick), margins.left - 6, y);
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

    ctx.save();
    ctx.setLineDash([]);

    const sortedTraces = Array.from(tracesRef.current.values()).filter(
      (record) => !record.removed && record.visible
    );
    sortedTraces.sort((a, b) => {
      const zA = (a as TraceRecord1D).config?.zIndex ?? 0;
      const zB = (b as TraceRecord1D).config?.zIndex ?? 0;
      return zA - zB;
    });

    for (const record of sortedTraces) {
      if (!isTrace1D(record)) {
        continue;
      }
      const { config: traceConfig, data } = record;
      if (!data) continue;
      if (traceConfig.type !== Trace1DType.Line) {
        if (import.meta.env.MODE !== "production") {
          // eslint-disable-next-line no-console
          console.warn(
            `[plotting] Trace type "${traceConfig.type}" not yet implemented.`
          );
        }
        continue;
      }

      const xData = data.x;
      const yData = data.y;
      const length = Math.min(xData.length, yData.length);
      if (length === 0) continue;

      ctx.strokeStyle = traceConfig.color;
      ctx.lineWidth = traceConfig.lineWidth ?? 2;
      ctx.globalAlpha = traceConfig.opacity ?? 1;
      if (traceConfig.dashPattern) {
        ctx.setLineDash(traceConfig.dashPattern);
      } else {
        ctx.setLineDash([]);
      }

      let hasPoint = false;
      ctx.beginPath();
      for (let i = 0; i < length; i += 1) {
        const xValue = (xData as ArrayLike<number>)[i];
        const yValue = (yData as ArrayLike<number>)[i];
        if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) {
          continue;
        }
        const cx = projectX(xValue);
        const cy = projectY(yValue);
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
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }, []);

  const requestRender = useCallback(() => {
    renderPlot();
  }, [renderPlot]);

  const applyAxisRange = useCallback(
    (axis: "x" | "y", min: number, max: number, reason?: "zoom" | "pan") => {
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return;
      }
      if (min === max) {
        return;
      }
      let nextMin = min;
      let nextMax = max;
      if (nextMin > nextMax) {
        const tmp = nextMin;
        nextMin = nextMax;
        nextMax = tmp;
      }
      const prev = axisRangesRef.current[axis];
      const sameMin = Math.abs(prev.min - nextMin) < 1e-9;
      const sameMax = Math.abs(prev.max - nextMax) < 1e-9;
      if (sameMin && sameMax) {
        return;
      }

      const nextRange: AxisRange = { min: nextMin, max: nextMax };
      axisRangesRef.current[axis] = nextRange;

      if (reason === "zoom") {
        zoomListenersRef.current.forEach((listener) =>
          listener(axis, nextRange)
        );
      } else if (reason === "pan") {
        panListenersRef.current.forEach((listener) =>
          listener(axis, nextRange)
        );
      }

      requestRender();
    },
    [requestRender]
  );

  const emitCursor = useCallback(
    (info: CursorInfo | null) => {
      const prev = lastCursorInfoRef.current;
      const same =
        (!info && !prev) ||
        (info &&
          prev &&
          info.canvasX === prev.canvasX &&
          info.canvasY === prev.canvasY &&
          info.dataX === prev.dataX &&
          info.dataY === prev.dataY);
      if (same) {
        return;
      }
      lastCursorInfoRef.current = info;
      cursorListenersRef.current.forEach((listener) => listener(info));
    },
    []
  );

  const getPointerPosition = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const canvas = canvasRef.current;
      const projection = projectionRef.current;
      if (!canvas || !projection) {
        return null;
      }
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const inside =
        x >= projection.plotRect.left &&
        x <= projection.plotRect.left + projection.plotRect.width &&
        y >= projection.plotRect.top &&
        y <= projection.plotRect.top + projection.plotRect.height;
      return { x, y, inside };
    },
    []
  );

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
      requestRender();
      return createTraceHandle1D(tracesRef, record, requestRender);
    },
    [requestRender]
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
      requestRender();
      return createTraceHandle2D(tracesRef, record, requestRender);
    },
    [requestRender]
  );

  const clearTraces = useCallback(() => {
    tracesRef.current.forEach((record) => {
      record.removed = true;
    });
    tracesRef.current.clear();
    requestRender();
  }, [requestRender]);

  const setAxisRange = useCallback(
    (axis: "x" | "y", min: number, max: number) => {
      applyAxisRange(axis, min, max);
    },
    [applyAxisRange]
  );

  const getAxisRange = useCallback((axis: "x" | "y") => {
    return axisRangesRef.current[axis];
  }, []);

  const autoRange = useCallback(
    (axis: "x" | "y" | "both", padding = 0) => {
      warnNotImplemented(`autoRange(${axis}, ${padding})`);
    },
    []
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

  const simulateWheel = useCallback(
    (event: WheelEventLike) => {
      const projection = projectionRef.current;
      if (!projection) {
        return;
      }

      const interactions = configRef.current.interactions;
      const zoomConfig = interactions?.zoom ?? false;
      const zoomX = zoomOptionEnabled(zoomConfig, "x");
      const zoomY = zoomOptionEnabled(zoomConfig, "y");
      if (!zoomX && !zoomY) {
        return;
      }

      const pointer = getPointerPosition(event);
      const rangeX = axisRangesRef.current.x;
      const rangeY = axisRangesRef.current.y;
      const centerX = rangeX.min + (rangeX.max - rangeX.min) / 2;
      const centerY = rangeY.min + (rangeY.max - rangeY.min) / 2;

      const anchorX =
        pointer && pointer.inside ? projection.invertX(pointer.x) : centerX;
      const anchorY =
        pointer && pointer.inside ? projection.invertY(pointer.y) : centerY;

      const factor = event.deltaY > 0 ? 1.1 : 0.9;

      if (zoomX) {
        const next = zoomRange(rangeX, factor, anchorX);
        applyAxisRange("x", next.min, next.max, "zoom");
      }
      if (zoomY) {
        const next = zoomRange(rangeY, factor, anchorY);
        applyAxisRange("y", next.min, next.max, "zoom");
      }
    },
    [applyAxisRange, getPointerPosition]
  );

  const simulatePointerDown = useCallback(
    (event: PointerEventLike) => {
      const interactions = configRef.current.interactions;
      const pointer = getPointerPosition(event);
      const panConfig = interactions?.pan;
      const panXEnabled = axisOptionEnabled(panConfig, "x");
      const panYEnabled = axisOptionEnabled(panConfig, "y");
      const canPan =
        pointer?.inside && (panXEnabled || panYEnabled) && !event.shiftKey;

      pointerStateRef.current = {
        active: true,
        pointerId: event.pointerId ?? 1,
        lastX: pointer?.x ?? 0,
        lastY: pointer?.y ?? 0,
        isPanning: Boolean(canPan),
        panX: Boolean(canPan && panXEnabled),
        panY: Boolean(canPan && panYEnabled),
      };

      const projection = projectionRef.current;
      if (!projection) {
        return;
      }

      if (cursorOptionEnabled(interactions?.cursor) && pointer) {
        if (pointer.inside) {
          emitCursor({
            canvasX: pointer.x,
            canvasY: pointer.y,
            dataX: projection.invertX(pointer.x),
            dataY: projection.invertY(pointer.y),
            snapped: null,
          });
        } else {
          emitCursor(null);
        }
      }
    },
    [emitCursor, getPointerPosition]
  );

  const simulatePointerMove = useCallback(
    (event: PointerEventLike) => {
      const pointer = getPointerPosition(event);
      const projection = projectionRef.current;
      const interactions = configRef.current.interactions;
      const cursorEnabled = cursorOptionEnabled(interactions?.cursor);

      const state = pointerStateRef.current;
      if (state.active && state.isPanning && pointer && projection) {
        const rangeX = axisRangesRef.current.x;
        const rangeY = axisRangesRef.current.y;
        const spanX = rangeX.max - rangeX.min || 1;
        const spanY = rangeY.max - rangeY.min || 1;

        if (state.panX && projection.plotRect.width > 0) {
          const deltaX = pointer.x - state.lastX;
          const shift = -(deltaX / projection.plotRect.width) * spanX;
          applyAxisRange(
            "x",
            rangeX.min + shift,
            rangeX.max + shift,
            "pan"
          );
        }

        if (state.panY && projection.plotRect.height > 0) {
          const deltaY = pointer.y - state.lastY;
          const shift = (deltaY / projection.plotRect.height) * spanY;
          applyAxisRange(
            "y",
            rangeY.min + shift,
            rangeY.max + shift,
            "pan"
          );
        }

        state.lastX = pointer.x;
        state.lastY = pointer.y;
      }

      if (!cursorEnabled) {
        return;
      }

      if (pointer && projection && pointer.inside) {
        emitCursor({
          canvasX: pointer.x,
          canvasY: pointer.y,
          dataX: projection.invertX(pointer.x),
          dataY: projection.invertY(pointer.y),
          snapped: null,
        });
      } else if (!pointerStateRef.current.isPanning) {
        emitCursor(null);
      }
    },
    [applyAxisRange, emitCursor, getPointerPosition]
  );

  const simulatePointerUp = useCallback(() => {
    pointerStateRef.current = {
      active: false,
      pointerId: null,
      lastX: 0,
      lastY: 0,
      isPanning: false,
      panX: false,
      panY: false,
    };
  }, []);

  const destroy = useCallback(() => {
    clearTraces();
    zoomListenersRef.current.clear();
    panListenersRef.current.clear();
    cursorListenersRef.current.clear();
    projectionRef.current = null;
    pointerStateRef.current = {
      active: false,
      pointerId: null,
      lastX: 0,
      lastY: 0,
      isPanning: false,
      panX: false,
      panY: false,
    };
    emitCursor(null);
  }, [clearTraces, emitCursor]);

  useEffect(() => {
    axisRangesRef.current = {
      x: config.axes.x.range ?? axisRangesRef.current.x ?? DEFAULT_AXIS_RANGE,
      y: config.axes.y.range ?? axisRangesRef.current.y ?? DEFAULT_AXIS_RANGE,
    };
    requestRender();
  }, [config.axes.x.range, config.axes.y.range, requestRender]);

  useEffect(() => {
    requestRender();
  }, [requestRender]);

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
        if (!record) {
          return null;
        }
        return record.data;
      },
    };
  }, []);

  return useMemo<PlotInstanceInternal>(() => {
    const instance: PlotInstanceInternal = {
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
      requestRender,
      simulateWheel,
      simulatePointerDown,
      simulatePointerMove,
      simulatePointerUp,
      destroy,
      __debug: import.meta.env.MODE !== "production" ? debugApi : undefined,
    };
    return instance;
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
    requestRender,
    simulateWheel,
    simulatePointerDown,
    simulatePointerMove,
    simulatePointerUp,
    setAxisRange,
  ]);
}
