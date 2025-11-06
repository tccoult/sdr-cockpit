export type Range = [number, number];

export type AxisScaleKind = "linear" | "log" | "time";

export type AxisSide = "left" | "right" | "top" | "bottom";

export interface AxisOptions {
  side: AxisSide;
  scale?: AxisScaleKind;
  label?: string;
  unit?: string;
  ticksTarget?: number;
  tickSizePx?: number;
  grid?: boolean;
  format?: (value: number) => string;
}

export interface AxisTheme {
  axisColor: string;
  gridColor: string;
  textColor: string;
  font: string;
  lineWidth: number;
  labelPaddingPx: number;
  tickLabelPaddingPx: number;
}

export interface Tick {
  value: number;
  label: string;
  px: number;
}
