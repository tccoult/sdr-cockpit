/**
 * Represents the numeric span of an axis in world coordinates.
 */
export interface AxisRange {
  /**
   * Inclusive lower bound.
   */
  min: number;
  /**
   * Inclusive upper bound.
   */
  max: number;
}

/** Rendering phases honoured by the engine. */
export type LayerPhase =
  | "background"
  | "grid"
  | "content"
  | "foreground"
  | "cursor"
  | "debug";

/** Dimensions of the canvas in CSS pixels and current DPR. */
export interface PlotDimensions {
  /** Canvas width in CSS pixels. */
  width: number;
  /** Canvas height in CSS pixels. */
  height: number;
  /** Device pixel ratio currently applied to the backing store. */
  devicePixelRatio: number;
}

/** Context object received by layers on each draw pass. */
export interface LayerRenderContext {
  /** Viewport projection utilities. */
  readonly viewport: Viewport;
  /** Current canvas dimensions. */
  readonly dimensions: PlotDimensions;
  /** High-resolution timestamp used for animation. */
  readonly now: number;
}

/** Information about the active cursor position. */
export interface CursorState {
  canvasX: number;
  canvasY: number;
  dataX: number;
  dataY: number;
  values?: string[];
}

/** Contract implemented by every drawable layer registered with the plot. */
export interface Layer {
  readonly id: string;
  visible: boolean;
  zIndex: number;
  readonly phase?: LayerPhase;
  getExtents?(): { x?: AxisRange; y?: AxisRange } | null;
  draw(ctx: CanvasRenderingContext2D, context: LayerRenderContext): void;
  destroy?(): void;
  getReadout?(
    cursor: CursorState,
    context: LayerRenderContext
  ): string[] | null;
}

/** Styling options shared between all layers. */
export interface PlotTheme {
  readonly background: string;
  readonly gridColor: string;
  readonly axisColor: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly textColor: string;
  readonly axisLineWidth: number;
  readonly axisLabelPadding: number;
  readonly axisTickLabelPadding: number;
  readonly cursorLineColor?: string;
  readonly cursorHighlightColor?: string;
}

/** Supported cursor appearances. */
export type CursorStyle = "none" | "crosshair" | "vertical" | "horizontal";

/** Configuration for a single axis. */
export interface PlotAxisOptions {
  label?: string;
  formatter?: (value: number) => string;
  ticksTarget?: number;
  scale?: "linear" | "log" | "time";
  unit?: string;
}

/** Collection of axis configuration for the plot. */
export interface PlotAxesConfig {
  x?: PlotAxisOptions;
  y?: PlotAxisOptions;
}

/** Formats a cursor readout before it is exposed to consumers. */
export interface CursorReadoutFormatter {
  (
    cursor: CursorState,
    axis: PlotAxesConfig,
    layerReadouts: string[]
  ): string[];
}

/** Public imperative API returned by {@link createPlot}. */
export interface PlotHandle {
  /** Adds and registers a new line layer. */
  addLine(config: LineLayerOptions): LineLayerHandle;
  /** Adds and registers a heatmap layer. */
  addHeatmap(config: HeatmapLayerOptions): HeatmapLayerHandle;
  /** Adds and registers an annotation layer. */
  addAnnotation(config: AnnotationLayerOptions): AnnotationLayerHandle;
  /** Removes a layer by the identifier assigned at creation. */
  removeLayer(id: string): void;
  /** Overrides the X-axis domain. */
  setXRange(range: AxisRange): void;
  /** Overrides the Y-axis domain. */
  setYRange(range: AxisRange): void;
  /** Requests that all layers recompute their extents and fit the viewport. */
  fit(): void;
  /** Schedules a new animation frame if one is not already pending. */
  requestDraw(): void;
  /** Subscribes to pan events emitted by user interactions. */
  onPan(callback: (axis: "x" | "y", range: AxisRange) => void): () => void;
  /** Subscribes to zoom events emitted by user interactions. */
  onZoom(callback: (axis: "x" | "y", range: AxisRange) => void): () => void;
  /** Subscribes to cursor updates. */
  onCursor(callback: (cursor: CursorState | null) => void): () => void;
  /** Returns the latest cursor information, if any. */
  getCursor(): CursorState | null;
  /** Indicates whether the plot has already been destroyed. */
  isDestroyed(): boolean;
  /** Tears down the plot and releases all resources. */
  destroy(): void;
}

/** Schedules coalesced draw calls, usually backed by requestAnimationFrame. */
export interface Scheduler {
  request(task: () => void): void;
  cancel(task: () => void): void;
  destroy(): void;
}

/** Plot margins in CSS pixels. */
export interface PlotMargins {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Initial axis ranges supplied to the viewport. */
export interface ViewportOptions {
  readonly initialXRange?: AxisRange;
  readonly initialYRange?: AxisRange;
  readonly margins?: PlotMargins;
}

/** Projects between world coordinates and device pixels. */
export interface Viewport {
  readonly projectX: (value: number) => number;
  readonly projectY: (value: number) => number;
  readonly invertX: (pixel: number) => number;
  readonly invertY: (pixel: number) => number;
  readonly rect: DOMRectReadOnly;
  readonly xRange: AxisRange;
  readonly yRange: AxisRange;
  updateDimensions(canvas: HTMLCanvasElement, dpr: number): void;
  setXRange(range: AxisRange): void;
  setYRange(range: AxisRange): void;
}

export interface LayerCreateContext {
  readonly viewport: Viewport;
  readonly theme: PlotTheme;
  readonly requestDraw: () => void;
  readonly addDestroyCallback: (fn: () => void) => void;
  readonly formatAxisValue: (axis: "x" | "y", value: number) => string;
  readonly notifyLayerOrderChange: () => void;
}

/** Rendering modes supported by the line layer. */
export type LineRenderMode = "line" | "points";

/** Options used when creating a line layer. */
export interface LineLayerOptions {
  id?: string;
  color?: string;
  lineWidth?: number;
  opacity?: number;
  dash?: number[];
  mode?: LineRenderMode;
  pointSize?: number;
  baseline?: number | null;
  fill?: {
    enabled?: boolean;
    color?: string;
    opacity?: number;
  };
}

/** Options used when creating a heatmap layer. */
export interface HeatmapLayerOptions {
  id?: string;
  width: number;
  height: number;
  colormap?: string | Uint8ClampedArray;
  clip?: { min: number; max: number };
  opacity?: number;
}

/** Options used when creating an annotation layer. */
export interface AnnotationLayerOptions {
  id?: string;
  annotations?: AnnotationDefinition[];
}

export type AnnotationDefinition =
  | {
      type: "line";
      id: string;
      x: number;
      color?: string;
      width?: number;
      visible?: boolean;
    }
  | {
      type: "span";
      id: string;
      x0: number;
      x1: number;
      color?: string;
      fill?: string;
      opacity?: number;
      visible?: boolean;
    }
  | {
      type: "point";
      id: string;
      x: number;
      y: number;
      radius?: number;
      color?: string;
      visible?: boolean;
    };

export interface LayerHandle {
  readonly id: string;
  setVisible(visible: boolean): void;
  remove(): void;
}

export interface LineLayerHandle extends LayerHandle {
  setXY(x: Float32Array, y: Float32Array): void;
  appendXY(x: Float32Array, y: Float32Array): void;
}

export interface HeatmapLayerHandle extends LayerHandle {
  pushRow(values: Float32Array): void;
  setFullImage(data: Float32Array | number[][], normalize?: boolean): void;
  setClip(clip: { min: number; max: number } | "auto"): void;
}

export interface AnnotationLayerHandle extends LayerHandle {
  addAnnotation(annotation: AnnotationDefinition): void;
  upsertAnnotations(annotations: AnnotationDefinition[]): void;
  deleteAnnotation(id: string): void;
}

/** Global configuration object accepted by {@link createPlot}. */
export interface PlotCreationOptions {
  dpr?: number;
  background?: string;
  xRange?: AxisRange;
  yRange?: AxisRange;
  theme?: Partial<PlotTheme>;
  scheduler?: Scheduler;
  interactions?: PlotInteractionsOptions;
  axes?: PlotAxesConfig;
  cursorFormatter?: CursorReadoutFormatter;
  /** Margins for axes and labels. If not specified, uses DEFAULT_PLOT_MARGINS. */
  margins?: PlotMargins;
}

export interface PlotInteractionsOptions {
  pan?: boolean | { x?: boolean; y?: boolean };
  zoom?: boolean | { x?: boolean; y?: boolean; factor?: number };
  cursor?: boolean | { enabled?: boolean; style?: CursorStyle };
}

export interface ReactPlotHandle {
  readonly plot: PlotHandle | null;
  readonly attachCanvas: (canvas: HTMLCanvasElement | null) => void;
}
