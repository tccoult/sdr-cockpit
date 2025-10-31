import type { RefObject } from "react";
import type { ColorMapInput } from "../../utils/colorMaps";

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

export interface AxisRange {
  min: number;
  max: number;
}

export interface AxisConfig {
  label?: string;
  formatter?: (value: number) => string;
  range?: AxisRange;
  scale?: "linear" | "log";
  ticks?: {
    count?: number | "auto";
    formatter?: (value: number) => string;
    color?: string;
    length?: number;
  };
}

export interface PlotConfig {
  axes: {
    x: AxisConfig;
    y: AxisConfig;
  };
  grid?: {
    show?: boolean;
    color?: string;
    lineWidth?: number;
    xLines?: number | "auto";
    yLines?: number | "auto";
    dashPattern?: number[];
  };
  interactions?: {
    zoom?: boolean | "x" | "y" | "both";
    pan?: boolean | "x" | "y" | "both";
    cursor?:
      | {
          style?: CursorStyle;
          snap?: boolean;
        }
      | boolean;
    tooltip?:
      | {
          show?: boolean;
          mode?: TooltipMode;
          formatX?: (value: number) => string;
          formatY?: (value: number) => string;
          formatZ?: (value: number) => string;
          background?: string;
          textColor?: string;
          borderRadius?: number;
          padding?: number;
        }
      | boolean;
    boxSelect?: boolean;
  };
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  background?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  legend?: {
    show?: boolean;
    position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
    background?: string;
    textColor?: string;
  };
  highDPI?: boolean;
  maxRenderRate?: number;
  cursor?: {
    render?: (args: CursorRenderArgs) => void;
  };
}

export interface TraceData1D {
  x: number[] | Float32Array;
  y: number[] | Float32Array;
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

export interface Trace2DConfig {
  colorMap: ColorMapInput;
  valueRange: AxisRange;
  opacity?: number;
  label?: string;
  visible?: boolean;
  zIndex?: number;
}

export interface Trace1DConfig {
  type: Trace1DType;
  color: string;
  lineWidth?: number;
  opacity?: number;
  dashPattern?: number[];
  pointSize?: number;
  pointShape?: "circle" | "square" | "triangle";
  fillColor?: string;
  fillOpacity?: number;
  baseline?: number;
  label?: string;
  visible?: boolean;
  zIndex?: number;
}

export interface TraceData2D {
  x: number[] | Float32Array;
  y: number[] | Float32Array;
  z: number[][] | Float32Array;
  width?: number;
  height?: number;
}

export interface CursorInfo {
  canvasX: number;
  canvasY: number;
  dataX: number;
  dataY: number;
  dataZ: number | null;
  sourceTraceId: string | null;
  snapped: null | {
    traceId: string;
    x: number;
    y: number;
  };
}

export interface PlotInstance {
  canvasRef: RefObject<HTMLCanvasElement>;
  addTrace1D: (config: Trace1DConfig) => TraceHandle1D;
  addTrace2D: (config: Trace2DConfig) => TraceHandle2D;
  clearTraces: () => void;
  setAxisRange: (axis: "x" | "y", min: number, max: number) => void;
  getAxisRange: (axis: "x" | "y") => AxisRange;
  autoRange: (axis: "x" | "y" | "both", padding?: number) => void;
  onZoom: (
    callback: (axis: "x" | "y" | "both", range: AxisRange) => void
  ) => () => void;
  onPan: (
    callback: (axis: "x" | "y" | "both", range: AxisRange) => void
  ) => () => void;
  onCursor: (callback: (info: CursorInfo | null) => void) => () => void;
  requestRender: () => void;
  setPrimaryTrace: (traceId: string | null) => void;
  getPrimaryTrace: () => string | null;
  destroy: () => void;
}

export interface PlotDebugApi {
  readonly traceCount: number;
  readonly traceIds: string[];
  getTraceData: (traceId: string) => TraceData1D | TraceData2D | null;
  simulateWheel?: (event: WheelEventLike) => void;
  simulatePointerDown?: (event: PointerEventLike) => void;
  simulatePointerMove?: (event: PointerEventLike) => void;
  simulatePointerUp?: (event: PointerEventLike) => void;
  flush?: () => void;
  getCursorInfo?: () => CursorInfo | null;
}

export interface WheelEventLike {
  clientX: number;
  clientY: number;
  deltaY: number;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export interface PointerEventLike {
  clientX: number;
  clientY: number;
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  pointerId?: number;
}

export type PlotInstanceInternal = PlotInstance & {
  readonly __debug?: PlotDebugApi;
};

export interface CursorRenderArgs {
  ctx: CanvasRenderingContext2D;
  projection: {
    projectX: (value: number) => number;
    projectY: (value: number) => number;
    invertX: (pixel: number) => number;
    invertY: (pixel: number) => number;
    rect: { left: number; top: number; width: number; height: number };
  };
  cursor: CursorInfo;
  style: CursorStyle;
  renderDefault: (args: CursorRenderArgs) => void;
}
