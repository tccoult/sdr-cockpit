export interface AxisRange {
  min: number;
  max: number;
}

export type LayerPhase =
  | "background"
  | "grid"
  | "content"
  | "foreground"
  | "cursor"
  | "debug";

export interface PlotDimensions {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export interface LayerRenderContext {
  readonly viewport: Viewport;
  readonly dimensions: PlotDimensions;
  readonly now: number;
}

export interface CursorState {
  canvasX: number;
  canvasY: number;
  dataX: number;
  dataY: number;
}

export interface Layer {
  readonly id: string;
  visible: boolean;
  zIndex: number;
  readonly phase?: LayerPhase;
  getExtents?(): { x?: AxisRange; y?: AxisRange } | null;
  draw(ctx: CanvasRenderingContext2D, context: LayerRenderContext): void;
  destroy?(): void;
}

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

export type CursorStyle = "none" | "crosshair" | "vertical" | "horizontal";

export interface PlotAxisOptions {
  label?: string;
  formatter?: (value: number) => string;
  ticksTarget?: number;
  scale?: "linear" | "log" | "time";
  unit?: string;
}

export interface PlotAxesConfig {
  x?: PlotAxisOptions;
  y?: PlotAxisOptions;
}

export interface PlotHandle {
  addLine(config: LineLayerOptions): LineLayerHandle;
  addHeatmap(config: HeatmapLayerOptions): HeatmapLayerHandle;
  addAnnotation(config: AnnotationLayerOptions): AnnotationLayerHandle;
  removeLayer(id: string): void;
  setXRange(range: AxisRange): void;
  setYRange(range: AxisRange): void;
  fit(): void;
  requestDraw(): void;
  onPan(callback: (axis: "x" | "y", range: AxisRange) => void): () => void;
  onZoom(callback: (axis: "x" | "y", range: AxisRange) => void): () => void;
  onCursor(callback: (cursor: CursorState | null) => void): () => void;
  getCursor(): CursorState | null;
  destroy(): void;
}

export interface Scheduler {
  request(task: () => void): void;
  cancel(task: () => void): void;
  destroy(): void;
}

export interface ViewportOptions {
  readonly initialXRange?: AxisRange;
  readonly initialYRange?: AxisRange;
}

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
}

export type LineRenderMode = "line" | "points";

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

export interface HeatmapLayerOptions {
  id?: string;
  width: number;
  height: number;
  colormap?: string | Uint8ClampedArray;
  clip?: { min: number; max: number };
  opacity?: number;
}

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
  pushColumn(values: Float32Array): void;
  setFullImage(data: Float32Array | number[][], normalize?: boolean): void;
}

export interface AnnotationLayerHandle extends LayerHandle {
  addAnnotation(annotation: AnnotationDefinition): void;
  upsertAnnotations(annotations: AnnotationDefinition[]): void;
  deleteAnnotation(id: string): void;
}

export interface PlotCreationOptions {
  dpr?: number;
  background?: string;
  xRange?: AxisRange;
  yRange?: AxisRange;
  theme?: Partial<PlotTheme>;
  scheduler?: Scheduler;
  interactions?: PlotInteractionsOptions;
  axes?: PlotAxesConfig;
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
