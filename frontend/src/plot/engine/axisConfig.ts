import type { AxisOptions } from "../axes/axisTypes";
import type { PlotAxisOptions, PlotTheme } from "../types";
import { toAxisTheme } from "./interactionOptions";

export function buildAxisOptions(
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

export function createAxisFormatter(config: PlotAxisOptions | undefined) {
  const formatter = config?.formatter;
  if (formatter) {
    return (value: number) => formatter(value);
  }
  return (value: number) => formatNumber(value);
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "NaN";
  }
  const abs = Math.abs(value);
  if (abs >= 1e4 || (abs > 0 && abs < 1e-2)) {
    return value.toExponential(3);
  }
  if (abs >= 1000) {
    return value.toFixed(0);
  }
  if (abs >= 100) {
    return value.toFixed(1);
  }
  if (abs >= 10) {
    return value.toFixed(2);
  }
  return value.toFixed(3);
}

export function toAxisThemeConfig(theme: PlotTheme) {
  return toAxisTheme(theme);
}
