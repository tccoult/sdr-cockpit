import { AxisModel } from "../axes/AxisModel";
import { createAxisLayer } from "../axes/AxisLayer";
import type { AxisOptions } from "../axes/axisTypes";
import { beginPan, createPanState, endPan, updatePan } from "../input/pointer";
import { applyWheel } from "../input/wheel";
import { createAnnotationLayer } from "../layers/AnnotationLayer";
import { createCursorLayer } from "../layers/CursorLayer";
import type { CursorLayer } from "../layers/CursorLayer";
import { createHeatmapLayer } from "../layers/HeatmapLayer";
import { createLineLayer } from "../layers/LineLayer";
import { defaultTheme, toAxisTheme } from "../theme/theme";
import {
  type AnnotationLayerHandle,
  type AnnotationLayerOptions,
  type AxisRange,
  type CursorState,
  type CursorStyle,
  type HeatmapLayerHandle,
  type HeatmapLayerOptions,
  type Layer,
  type LayerCreateContext,
  type LayerPhase,
  type LayerRenderContext,
  type LineLayerHandle,
  type LineLayerOptions,
  type PlotAxisOptions,
  type PlotCreationOptions,
  type PlotDimensions,
  type PlotHandle,
  type PlotInteractionsOptions,
  type PlotTheme,
  type Scheduler,
  type Viewport,
} from "../types";
import { createViewport } from "./Viewport";
import { RafScheduler } from "./Scheduler";

export type PlotInternalOptions = PlotCreationOptions;

type LayerRecord = {
  readonly layer: Layer;
  readonly destroyCallbacks: Array<() => void>;
};

const PHASE_ORDER: Record<LayerPhase, number> = {
  background: 0,
  grid: 100,
  content: 200,
  foreground: 300,
  cursor: 400,
  debug: 500,
};

const DEFAULT_PHASE_ORDER = PHASE_ORDER.content;
const FALLBACK_CANVAS_WIDTH = 640;
const FALLBACK_CANVAS_HEIGHT = 360;
const MIN_SPAN = 1e-12;
const DEFAULT_ZOOM_FACTOR = 0.2;
const RANGE_EPSILON = 1e-9;

type ResolvedInteractions = {
  panX: boolean;
  panY: boolean;
  zoomX: boolean;
  zoomY: boolean;
  zoomFactor: number;
  cursor: boolean;
  cursorStyle: CursorStyle;
};

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

function resolveInteractions(
  options: PlotInteractionsOptions | undefined
): ResolvedInteractions {
  const panOption = options?.pan;
  let panX: boolean;
  let panY: boolean;
  if (typeof panOption === "boolean") {
    panX = panOption;
    panY = panOption;
  } else if (panOption) {
    panX = panOption.x !== false;
    panY = panOption.y !== false;
  } else {
    panX = true;
    panY = true;
  }

  const zoomOption = options?.zoom;
  let zoomX: boolean;
  let zoomY: boolean;
  let zoomFactor = DEFAULT_ZOOM_FACTOR;
  if (typeof zoomOption === "boolean") {
    zoomX = zoomOption;
    zoomY = zoomOption;
  } else if (zoomOption) {
    zoomX = zoomOption.x !== false;
    zoomY = zoomOption.y !== false;
    if (zoomOption.factor !== undefined && zoomOption.factor > 0) {
      zoomFactor = zoomOption.factor;
    }
  } else {
    zoomX = true;
    zoomY = true;
  }

  const cursorOption = options?.cursor;
  let cursorEnabled: boolean;
  let cursorStyle: CursorStyle = "crosshair";
  if (typeof cursorOption === "boolean") {
    cursorEnabled = cursorOption;
  } else if (cursorOption) {
    cursorEnabled = cursorOption.enabled !== false;
    if (cursorOption.style) {
      cursorStyle = cursorOption.style;
    }
  } else {
    cursorEnabled = true;
  }
  if (!cursorEnabled) {
    cursorStyle = "none";
  }

  return { panX, panY, zoomX, zoomY, zoomFactor, cursor: cursorEnabled, cursorStyle };
}

export function createPlot(
  canvas: HTMLCanvasElement,
  options: PlotInternalOptions = {}
): PlotHandle {
  return new PlotEngine(canvas, options);
}

class PlotEngine implements PlotHandle {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly viewport: Viewport;
  private readonly scheduler: Scheduler;
  private readonly theme: PlotTheme;
  private readonly destroyCallbacks: Array<() => void> = [];
  private readonly layers = new Map<string, LayerRecord>();
  private readonly sortedLayers: Layer[] = [];
  private readonly interactions: ResolvedInteractions;
  private readonly panListeners = new Set<(axis: "x" | "y", range: AxisRange) => void>();
  private readonly zoomListeners = new Set<(axis: "x" | "y", range: AxisRange) => void>();
  private readonly cursorListeners = new Set<(cursor: CursorState | null) => void>();
  private readonly panState = createPanState();
  private axisModelX: AxisModel;
  private axisModelY: AxisModel;
  private axisOptions: { x: AxisOptions; y: AxisOptions };
  private cursorLayer: CursorLayer;
  private axesRegistered = false;
  private cursorState: CursorState | null = null;
  private canvasRect: DOMRectReadOnly = new DOMRectReadOnly(0, 0, 1, 1);

  private readonly handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    this.refreshCanvasRect();
    const coords = this.toCanvasCoordinates(event.clientX, event.clientY);
    if (this.interactions.panX || this.interactions.panY) {
      beginPan(
        this.panState,
        event.pointerId,
        coords.x,
        coords.y,
        this.viewport,
        { x: this.viewport.xRange, y: this.viewport.yRange }
      );
      try {
        this.canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        if (import.meta.env.MODE !== "production") {
          console.warn("[plot] failed to set pointer capture", error);
        }
      }
      event.preventDefault();
    }
    if (this.interactions.cursor) {
      this.updateCursorPosition(coords.x, coords.y);
    }
  };

  private readonly handlePointerMove = (event: PointerEvent) => {
    const coords = this.toCanvasCoordinates(event.clientX, event.clientY);
    if (this.panState.active && event.pointerId === this.panState.pointerId) {
      const ranges = updatePan(this.panState, coords.x, coords.y, {
        allowX: this.interactions.panX,
        allowY: this.interactions.panY,
      });
      if (ranges.x && this.interactions.panX) {
        this.applyRange("x", ranges.x, "pan");
      }
      if (ranges.y && this.interactions.panY) {
        this.applyRange("y", ranges.y, "pan");
      }
      event.preventDefault();
    } else if (this.interactions.cursor) {
      this.updateCursorPosition(coords.x, coords.y);
    }
  };

  private readonly handlePointerUp = (event: PointerEvent) => {
    if (this.panState.active && event.pointerId === this.panState.pointerId) {
      try {
        this.canvas.releasePointerCapture(event.pointerId);
      } catch (error) {
        if (import.meta.env.MODE !== "production") {
          console.warn("[plot] failed to release pointer capture", error);
        }
      }
      endPan(this.panState);
    }
    if (this.interactions.cursor) {
      const coords = this.toCanvasCoordinates(event.clientX, event.clientY);
      this.updateCursorPosition(coords.x, coords.y);
    } else {
      this.clearCursor();
    }
  };

  private readonly handlePointerLeave = () => {
    if (this.interactions.cursor) {
      this.clearCursor();
    }
  };

  private readonly handleWheel = (event: WheelEvent) => {
    if (!this.interactions.zoomX && !this.interactions.zoomY) {
      return;
    }
    event.preventDefault();
    this.refreshCanvasRect();
    const coords = this.toCanvasCoordinates(event.clientX, event.clientY);
    const result = applyWheel(
      {
        px: coords.x,
        py: coords.y,
        deltaY: event.deltaY,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      },
      this.viewport,
      { x: this.viewport.xRange, y: this.viewport.yRange },
      {
        enableX: this.interactions.zoomX,
        enableY: this.interactions.zoomY,
        zoomFactor: this.interactions.zoomFactor,
      }
    );

    if (result.x && this.interactions.zoomX) {
      this.applyRange("x", result.x, "zoom");
    }
    if (result.y && this.interactions.zoomY) {
      this.applyRange("y", result.y, "zoom");
    }
  };

  private devicePixelRatio: number;
  private dimensions: PlotDimensions = {
    width: FALLBACK_CANVAS_WIDTH,
    height: FALLBACK_CANVAS_HEIGHT,
    devicePixelRatio: 1,
  };
  private dirty = false;
  private destroyed = false;
  private needsResize = true;
  private layersDirty = true;
  private resizeObserver: ResizeObserver | null = null;
  private dprWatcher: { mq: MediaQueryList; listener: () => void } | null = null;

  constructor(canvas: HTMLCanvasElement, options: PlotInternalOptions) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Plot engine requires a 2D canvas context");
    }

    this.canvas = canvas;
    this.ctx = ctx;
    this.scheduler = options.scheduler ?? new RafScheduler();
    this.theme = this.resolveTheme(options);
    this.interactions = resolveInteractions(options.interactions);
    this.devicePixelRatio = this.resolveInitialDpr(options);
    this.viewport = createViewport({
      initialXRange: options.xRange,
      initialYRange: options.yRange,
    });

    this.axisOptions = {
      x: buildAxisOptions("bottom", options.axes?.x),
      y: buildAxisOptions("left", options.axes?.y),
    };
    this.axisModelX = new AxisModel(this.axisOptions.x);
    this.axisModelY = new AxisModel(this.axisOptions.y);
   this.axisModelX.setRange(rangeToTuple(this.viewport.xRange));
   this.axisModelY.setRange(rangeToTuple(this.viewport.yRange));
   this.registerAxisLayers();

    this.cursorLayer = createCursorLayer(this.theme, this.interactions.cursorStyle);
    this.cursorLayer.visible = this.interactions.cursor;
    this.cursorLayer.setStyle(this.interactions.cursorStyle);
    this.registerLayer(this.cursorLayer, []);

    this.initResizeObserver();
    this.initDprWatcher(options);
    this.syncCanvasSize();
    this.setupInputListeners();

    this.requestDraw();
  }

  addLine(config: LineLayerOptions): LineLayerHandle {
    this.assertAlive();
    const destroyCallbacks: Array<() => void> = [];
    const layerContext = this.createLayerContext(destroyCallbacks);
    const layer = createLineLayer(layerContext, config);
    this.registerLayer(layer, destroyCallbacks);

    return {
      id: layer.id,
      setXY: (x, y) => {
        layer.setXY(x, y);
        this.requestDraw();
      },
      appendXY: (x, y) => {
        layer.appendXY(x, y);
        this.requestDraw();
      },
      setVisible: (visible) => {
        layer.setVisible(visible);
        this.requestDraw();
      },
      remove: () => {
        this.removeLayer(layer.id);
      },
    };
  }

  addHeatmap(config: HeatmapLayerOptions): HeatmapLayerHandle {
    this.assertAlive();
    const destroyCallbacks: Array<() => void> = [];
    const layerContext = this.createLayerContext(destroyCallbacks);
    const layer = createHeatmapLayer(layerContext, config);
    this.registerLayer(layer, destroyCallbacks);

    return {
      id: layer.id,
      pushColumn: (values) => {
        layer.pushColumn(values);
        this.requestDraw();
      },
      setFullImage: (data, normalize) => {
        layer.setFullImage(data, normalize);
        this.requestDraw();
      },
      setVisible: (visible) => {
        layer.setVisible(visible);
        this.requestDraw();
      },
      remove: () => {
        this.removeLayer(layer.id);
      },
    };
  }

  addAnnotation(config: AnnotationLayerOptions): AnnotationLayerHandle {
    this.assertAlive();
    const destroyCallbacks: Array<() => void> = [];
    const layerContext = this.createLayerContext(destroyCallbacks);
    const layer = createAnnotationLayer(layerContext, config);
    this.registerLayer(layer, destroyCallbacks);

    return {
      id: layer.id,
      setVisible: (visible) => {
        layer.setVisible(visible);
        this.requestDraw();
      },
      remove: () => {
        this.removeLayer(layer.id);
      },
    };
  }

  removeLayer(id: string): void {
    if (this.destroyed) return;
    const record = this.layers.get(id);
    if (!record) {
      return;
    }
    this.layers.delete(id);
    this.layersDirty = true;

    try {
      record.layer.destroy?.();
    } catch (error) {
      if (import.meta.env.MODE !== "production") {
        console.warn(`[plot] Layer "${id}" destroy failed`, error);
      }
    }
    for (const cleanup of record.destroyCallbacks) {
      try {
        cleanup();
      } catch (error) {
        if (import.meta.env.MODE !== "production") {
          console.warn(`[plot] Layer "${id}" cleanup failed`, error);
        }
      }
    }
    this.requestDraw();
  }

  setXRange(range: AxisRange): void {
    this.applyRange("x", range, "manual");
  }

  setYRange(range: AxisRange): void {
    this.applyRange("y", range, "manual");
  }

  fit(): void {
    if (this.destroyed) return;
    let xMin = Number.POSITIVE_INFINITY;
    let xMax = Number.NEGATIVE_INFINITY;
    let yMin = Number.POSITIVE_INFINITY;
    let yMax = Number.NEGATIVE_INFINITY;
    let hasX = false;
    let hasY = false;

    for (const { layer } of this.layers.values()) {
      if (!layer.visible) continue;
      const extents = layer.getExtents?.();
      if (!extents) continue;
      if (extents.x) {
        const { min, max } = extents.x;
        if (Number.isFinite(min) && Number.isFinite(max)) {
          xMin = Math.min(xMin, min);
          xMax = Math.max(xMax, max);
          hasX = true;
        }
      }
      if (extents.y) {
        const { min, max } = extents.y;
        if (Number.isFinite(min) && Number.isFinite(max)) {
          yMin = Math.min(yMin, min);
          yMax = Math.max(yMax, max);
          hasY = true;
        }
      }
    }

    if (hasX) {
      const range = normalizeRange({ min: xMin, max: xMax });
      if (range) {
        this.viewport.setXRange(range);
        this.axisModelX.setRange(rangeToTuple(range));
      }
    }
    if (hasY) {
      const range = normalizeRange({ min: yMin, max: yMax });
      if (range) {
        this.viewport.setYRange(range);
        this.axisModelY.setRange(rangeToTuple(range));
      }
    }
    if (hasX || hasY) {
      this.requestDraw();
    }
  }

  private registerAxisLayers() {
    if (this.axesRegistered) {
      return;
    }
    const axisTheme = toAxisTheme(this.theme);
    const gridBottom = createAxisLayer({
      model: this.axisModelX,
      options: this.axisOptions.x,
      theme: axisTheme,
      drawGrid: true,
    });
    const gridLeft = createAxisLayer({
      model: this.axisModelY,
      options: this.axisOptions.y,
      theme: axisTheme,
      drawGrid: true,
    });
    const axisBottom = createAxisLayer({
      model: this.axisModelX,
      options: this.axisOptions.x,
      theme: axisTheme,
    });
    const axisLeft = createAxisLayer({
      model: this.axisModelY,
      options: this.axisOptions.y,
      theme: axisTheme,
    });

    this.registerLayer(gridBottom, []);
    this.registerLayer(gridLeft, []);
    this.registerLayer(axisBottom, []);
    this.registerLayer(axisLeft, []);
    this.axesRegistered = true;
  }

  private applyRange(
    axis: "x" | "y",
    range: AxisRange,
    source: "pan" | "zoom" | "manual"
  ) {
    const normalized = normalizeRange(range);
    if (!normalized) {
      return;
    }
    const current = axis === "x" ? this.viewport.xRange : this.viewport.yRange;
    if (rangesEqual(current, normalized)) {
      return;
    }
    if (axis === "x") {
      this.viewport.setXRange(normalized);
      this.axisModelX.setRange(rangeToTuple(normalized));
    } else {
      this.viewport.setYRange(normalized);
      this.axisModelY.setRange(rangeToTuple(normalized));
    }

    if (source === "pan") {
      this.emitPan(axis, normalized);
    } else if (source === "zoom") {
      this.emitZoom(axis, normalized);
    }
    if (this.cursorState && this.interactions.cursor) {
      this.updateCursorPosition(this.cursorState.canvasX, this.cursorState.canvasY);
    }
    this.requestDraw();
  }

  requestDraw(): void {
    if (this.destroyed) return;
    if (this.dirty) {
      return;
    }
    this.dirty = true;
    this.scheduler.request(this.flush);
  }

  onPan(callback: (axis: "x" | "y", range: AxisRange) => void): () => void {
    this.panListeners.add(callback);
    return () => this.panListeners.delete(callback);
  }

  onZoom(callback: (axis: "x" | "y", range: AxisRange) => void): () => void {
    this.zoomListeners.add(callback);
    return () => this.zoomListeners.delete(callback);
  }

  onCursor(callback: (cursor: CursorState | null) => void): () => void {
    this.cursorListeners.add(callback);
    return () => this.cursorListeners.delete(callback);
  }

  getCursor(): CursorState | null {
    return this.cursorState;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scheduler.destroy();
    this.cleanupDprWatcher();
    this.resizeObserver?.disconnect();
    for (const { layer, destroyCallbacks } of this.layers.values()) {
      try {
        layer.destroy?.();
      } catch (error) {
        if (import.meta.env.MODE !== "production") {
          console.warn("[plot] Layer destroy failed", error);
        }
      }
      for (const cleanup of destroyCallbacks) {
        try {
          cleanup();
        } catch (error) {
          if (import.meta.env.MODE !== "production") {
            console.warn("[plot] Layer cleanup failed", error);
          }
        }
      }
    }
    this.layers.clear();
    this.sortedLayers.length = 0;

    for (const cleanup of this.destroyCallbacks) {
      try {
        cleanup();
      } catch (error) {
        if (import.meta.env.MODE !== "production") {
          console.warn("[plot] Plot cleanup failed", error);
        }
      }
    }
    this.destroyCallbacks.length = 0;
    this.clearCursor();
  }

  private readonly flush = () => {
    if (this.destroyed) return;
    this.dirty = false;
    this.drawFrame();
  };

  private drawFrame() {
    if (this.destroyed) return;
    if (this.needsResize) {
      this.syncCanvasSize();
    }
    if (this.layersDirty) {
      this.rebuildLayerOrder();
    }

    const ctx = this.ctx;
    const dimensions = this.dimensions;
    const renderContext: LayerRenderContext = {
      viewport: this.viewport,
      dimensions,
      now: now(),
    };

    ctx.save();
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.fillStyle = this.theme.background;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    for (const layer of this.sortedLayers) {
      if (!layer.visible) continue;
      try {
        layer.draw(ctx, renderContext);
      } catch (error) {
        if (import.meta.env.MODE !== "production") {
          console.warn(`[plot] Layer "${layer.id}" draw failed`, error);
        }
      }
    }
    ctx.restore();
  }

  private registerLayer(
    layer: Layer,
    destroyCallbacks: Array<() => void>
  ): void {
    if (this.layers.has(layer.id)) {
      throw new Error(`Layer with id "${layer.id}" already exists`);
    }
    this.layers.set(layer.id, { layer, destroyCallbacks });
    this.layersDirty = true;
    this.requestDraw();
  }

  private rebuildLayerOrder() {
    this.layersDirty = false;
    this.sortedLayers.length = 0;
    for (const { layer } of this.layers.values()) {
      this.sortedLayers.push(layer);
    }
    this.sortedLayers.sort((a, b) => {
      const phaseA = phaseOrder(a.phase);
      const phaseB = phaseOrder(b.phase);
      if (phaseA !== phaseB) {
        return phaseA - phaseB;
      }
      if (a.zIndex !== b.zIndex) {
        return a.zIndex - b.zIndex;
      }
      return a.id.localeCompare(b.id);
    });
  }

  private syncCanvasSize() {
    this.needsResize = false;
    const rect = this.canvas.getBoundingClientRect();
    this.canvasRect = rect;
    const cssWidth = rect.width > 0 ? rect.width : FALLBACK_CANVAS_WIDTH;
    const cssHeight = rect.height > 0 ? rect.height : FALLBACK_CANVAS_HEIGHT;
    const dpr = this.devicePixelRatio;
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));

    if (this.canvas.width !== width) {
      this.canvas.width = width;
    }
    if (this.canvas.height !== height) {
      this.canvas.height = height;
    }

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewport.updateDimensions(this.canvas, dpr);
    this.axisModelX.setSpanPx(this.viewport.rect.width);
    this.axisModelY.setSpanPx(this.viewport.rect.height);
    this.dimensions = {
      width: cssWidth,
      height: cssHeight,
      devicePixelRatio: dpr,
    };
  }

  private setupInputListeners() {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerUp);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });

    this.destroyCallbacks.push(() => {
      this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
      this.canvas.removeEventListener("pointermove", this.handlePointerMove);
      this.canvas.removeEventListener("pointerup", this.handlePointerUp);
      this.canvas.removeEventListener("pointercancel", this.handlePointerUp);
      this.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
      this.canvas.removeEventListener("wheel", this.handleWheel);
    });
  }

  private refreshCanvasRect() {
    this.canvasRect = this.canvas.getBoundingClientRect();
  }

  private emitPan(axis: "x" | "y", range: AxisRange) {
    for (const listener of this.panListeners) {
      listener(axis, range);
    }
  }

  private emitZoom(axis: "x" | "y", range: AxisRange) {
    for (const listener of this.zoomListeners) {
      listener(axis, range);
    }
  }

  private emitCursor(cursor: CursorState | null) {
    for (const listener of this.cursorListeners) {
      listener(cursor);
    }
  }

  private updateCursorPosition(x: number, y: number) {
    if (!this.interactions.cursor) {
      return;
    }
    const rect = this.viewport.rect;
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    const dataX = this.viewport.invertX(x);
    const dataY = this.viewport.invertY(y);
    const next: CursorState = { canvasX: x, canvasY: y, dataX, dataY };
    if (cursorEquals(this.cursorState, next)) {
      return;
    }
    this.cursorState = next;
    this.cursorLayer.setCursor(next);
    this.emitCursor(next);
    this.requestDraw();
  }

  private clearCursor() {
    if (this.cursorState === null) {
      return;
    }
    this.cursorState = null;
    this.emitCursor(null);
    this.cursorLayer.setCursor(null);
    this.requestDraw();
  }

  private toCanvasCoordinates(clientX: number, clientY: number) {
    const rect = this.canvasRect;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private initResizeObserver() {
    const handler = () => {
      if (this.destroyed) return;
      this.needsResize = true;
      this.refreshCanvasRect();
      this.requestDraw();
    };

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(handler);
      this.resizeObserver.observe(this.canvas);
    } else if (typeof window !== "undefined") {
      window.addEventListener("resize", handler, { passive: true });
      this.destroyCallbacks.push(() =>
        window.removeEventListener("resize", handler)
      );
    }
  }

  private initDprWatcher(options: PlotInternalOptions) {
    if (typeof window === "undefined") {
      return;
    }
    if (options.dpr !== undefined) {
      return;
    }

    const attach = () => {
      this.cleanupDprWatcher();
      const dpr = window.devicePixelRatio || 1;
      const query = `(resolution: ${dpr}dppx)`;
      const mq = window.matchMedia ? window.matchMedia(query) : null;
      if (!mq) {
        return;
      }
      const listener = () => {
        this.cleanupDprWatcher();
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.needsResize = true;
        this.refreshCanvasRect();
        this.requestDraw();
        attach();
      };
      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", listener);
      } else if (typeof mq.addListener === "function") {
        mq.addListener(listener);
      }
      this.dprWatcher = { mq, listener };
    };

    attach();
  }

  private cleanupDprWatcher() {
    if (!this.dprWatcher) return;
    const { mq, listener } = this.dprWatcher;
    if (typeof mq.removeEventListener === "function") {
      mq.removeEventListener("change", listener);
    } else if (typeof mq.removeListener === "function") {
      mq.removeListener(listener);
    }
    this.dprWatcher = null;
  }

  private createLayerContext(
    destroyCallbacks: Array<() => void>
  ): LayerCreateContext {
    return {
      viewport: this.viewport,
      theme: this.theme,
      requestDraw: () => this.requestDraw(),
      addDestroyCallback: (fn) => destroyCallbacks.push(fn),
    };
  }

  private resolveTheme(options: PlotInternalOptions): PlotTheme {
    const overrides = options.theme ?? {};
    return {
      background:
        options.background ??
        overrides.background ??
        defaultTheme.background,
      gridColor: overrides.gridColor ?? defaultTheme.gridColor,
      axisColor: overrides.axisColor ?? defaultTheme.axisColor,
      textColor: overrides.textColor ?? defaultTheme.textColor,
      fontFamily: overrides.fontFamily ?? defaultTheme.fontFamily,
      fontSize: overrides.fontSize ?? defaultTheme.fontSize,
      axisLineWidth: overrides.axisLineWidth ?? defaultTheme.axisLineWidth,
      axisLabelPadding: overrides.axisLabelPadding ?? defaultTheme.axisLabelPadding,
      axisTickLabelPadding:
        overrides.axisTickLabelPadding ?? defaultTheme.axisTickLabelPadding,
      cursorLineColor: overrides.cursorLineColor ?? defaultTheme.cursorLineColor,
      cursorHighlightColor:
        overrides.cursorHighlightColor ?? defaultTheme.cursorHighlightColor,
    };
  }

  private resolveInitialDpr(options: PlotInternalOptions): number {
    if (options.dpr !== undefined) {
      return options.dpr;
    }
    if (typeof window !== "undefined" && window.devicePixelRatio) {
      return window.devicePixelRatio;
    }
    return 1;
  }

  private assertAlive() {
    if (this.destroyed) {
      throw new Error("Plot instance has been destroyed");
    }
  }
}

function phaseOrder(phase: LayerPhase | undefined): number {
  if (!phase) {
    return DEFAULT_PHASE_ORDER;
  }
  return PHASE_ORDER[phase] ?? DEFAULT_PHASE_ORDER;
}

function normalizeRange(range: AxisRange | undefined | null): AxisRange | null {
  if (!range) return null;
  let { min, max } = range;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }
  if (min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }
  if (max - min < MIN_SPAN) {
    const pad = min === 0 ? MIN_SPAN : Math.abs(min) * 1e-6;
    min -= pad;
    max += pad;
  }
  return { min, max };
}

function rangeToTuple(range: AxisRange): [number, number] {
  return [range.min, range.max];
}

function rangesEqual(a: AxisRange, b: AxisRange): boolean {
  return (
    Math.abs(a.min - b.min) < RANGE_EPSILON &&
    Math.abs(a.max - b.max) < RANGE_EPSILON
  );
}

function cursorEquals(a: CursorState | null, b: CursorState | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.canvasX - b.canvasX) < 0.01 &&
    Math.abs(a.canvasY - b.canvasY) < 0.01 &&
    Math.abs(a.dataX - b.dataX) < RANGE_EPSILON &&
    Math.abs(a.dataY - b.dataY) < RANGE_EPSILON
  );
}

function buildAxisOptions(
  side: "left" | "right" | "top" | "bottom",
  config: PlotAxisOptions | undefined
): AxisOptions {
  return {
    side,
    label: config?.label,
    format: config?.formatter,
    ticksTarget: config?.ticksTarget,
    scale: config?.scale,
    unit: config?.unit,
  };
}
