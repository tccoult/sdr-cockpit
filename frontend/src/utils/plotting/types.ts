import type { MutableRefObject } from "react";

export enum Trace1DType {
  Line = "line",
  Stem = "stem",
  Scatter = "scatter",
  Area = "area",
}

export enum CursorStyle {
  Crosshair = "crosshair",
  Vertical = "vertical",
  Horizontal = "horizontal",
  None = "none",
}

export enum TooltipMode {
  Nearest = "nearest",
  AllTraces = "all-traces",
}

export enum LegendPosition {
  TopRight = "top-right",
  TopLeft = "top-left",
  BottomRight = "bottom-right",
  BottomLeft = "bottom-left",
}

export enum InterpolationMode {
  Nearest = "nearest",
  Bilinear = "bilinear",
}

export enum PointShape {
  Circle = "circle",
  Square = "square",
  Triangle = "triangle",
}

export enum ColorMapName {
  Plasma = "plasma",
  Viridis = "viridis",
  Turbo = "turbo",
  Grayscale = "grayscale",
  Jet = "jet",
  Hot = "hot",
  Cool = "cool",
}

export enum LayoutDirection {
  Vertical = "vertical",
  Horizontal = "horizontal",
  Grid = "grid",
}

export enum ScrollDirection {
  Down = "down",
  Up = "up",
}

export interface AxisConfig {
  label?: string;
  formatter?: (value: number) => string;
  range?: { min: number; max: number };
  scale?: "linear" | "log";
  ticks?: {
    count?: number | "auto";
    formatter?: (value: number) => string;
    color?: string;
    length?: number;
  };
}

export interface GridConfig {
  show?: boolean;
  color?: string;
  lineWidth?: number;
  xLines?: number | "auto";
  yLines?: number | "auto";
}

export interface CursorConfig {
  style: CursorStyle;
  snap: boolean;
  color: string;
  lineWidth: number;
  dashPattern?: number[];
}

export interface TooltipConfig {
  show: boolean;
  mode: TooltipMode;
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  formatZ?: (value: number) => string;
  background: string;
  textColor: string;
  borderRadius: number;
  padding: number;
}

export interface InteractionsConfig {
  zoom: false | "x" | "y" | "both";
  pan: false | "x" | "y" | "both";
  cursor: CursorConfig | null;
  tooltip: TooltipConfig | null;
  boxSelect: boolean;
}

export interface LegendConfig {
  show: boolean;
  position: LegendPosition;
  background: string;
  textColor: string;
}

export interface MarginsConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PlotConfig {
  axes: {
    x: AxisConfig;
    y: AxisConfig;
  };
  grid?: GridConfig;
  interactions?: {
    zoom?: boolean | "x" | "y" | "both";
    pan?: boolean | "x" | "y" | "both";
    cursor?: CursorStyle | CursorConfig | boolean;
    tooltip?: TooltipMode | TooltipConfig | boolean;
    boxSelect?: boolean;
  };
  margins?: Partial<MarginsConfig>;
  background?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  legend?: Partial<LegendConfig> & { show?: boolean };
  highDPI?: boolean;
  maxRenderRate?: number;
}

export type TraceDataArray = number[] | Float32Array;

export interface TraceData1D {
  x: TraceDataArray;
  y: TraceDataArray;
}

export type ColorStop = { value: number; color: string };

export interface CustomColorMap {
  name?: string;
  stops: ColorStop[];
}

export interface Trace2DData {
  x: TraceDataArray;
  y: TraceDataArray;
  z: number[][] | Float32Array;
  width?: number;
  height?: number;
}

export type TraceData2D = Trace2DData;

export interface Trace1DConfig {
  type: Trace1DType;
  color: string;
  lineWidth?: number;
  opacity?: number;
  dashPattern?: number[];
  pointSize?: number;
  pointShape?: PointShape;
  fillColor?: string;
  fillOpacity?: number;
  baseline?: number;
  label?: string;
  visible?: boolean;
  zIndex?: number;
}

export interface Trace2DConfig {
  colorMap: ColorMapName | CustomColorMap;
  valueRange: { min: number; max: number };
  interpolation?: InterpolationMode;
  opacity?: number;
  label?: string;
  visible?: boolean;
  zIndex?: number;
}

export interface AxisRange {
  min: number;
  max: number;
}

export interface CursorInfo {
  canvasX: number;
  canvasY: number;
  x: number;
  y: number;
  snapped?: {
    traceId: string;
    index: number;
    x: number;
    y: number;
  } | null;
  zValue?: number | null;
}

export interface TraceHandle1D {
  update: (data: TraceData1D) => void;
  setVisible: (visible: boolean) => void;
  setConfig: (config: Partial<Trace1DConfig>) => void;
  remove: () => void;
}

export interface TraceHandle2D {
  update: (data: TraceData2D) => void;
  setVisible: (visible: boolean) => void;
  setConfig: (config: Partial<Trace2DConfig>) => void;
  remove: () => void;
}

export interface PlotInstance {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  addTrace1D: (config: Trace1DConfig) => TraceHandle1D;
  addTrace2D: (config: Trace2DConfig) => TraceHandle2D;
  clearTraces: () => void;
  setAxisRange: (axis: "x" | "y", min: number, max: number) => void;
  getAxisRange: (axis: "x" | "y") => AxisRange;
  autoRange: (axis: "x" | "y" | "both", padding?: number) => void;
  onZoom: (callback: (range: AxisRange) => void) => () => void;
  onPan: (callback: (range: AxisRange) => void) => () => void;
  onCursor: (callback: (info: CursorInfo | null) => void) => () => void;
  requestRender: () => void;
  destroy: () => void;
}
