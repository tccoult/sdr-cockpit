import type { AxisTheme } from "../axes/axisTypes";
import type { PlotTheme } from "../types";

export const defaultTheme: PlotTheme = {
  background: "rgba(10, 10, 15, 0.85)",
  gridColor: "rgba(255, 255, 255, 0.1)",
  axisColor: "rgba(255, 255, 255, 0.4)",
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12,
  textColor: "#ffffff",
  axisLineWidth: 1,
  axisLabelPadding: 18,
  axisTickLabelPadding: 6,
  cursorLineColor: "rgba(255, 255, 255, 0.7)",
  cursorHighlightColor: "#ffff7a",
};

export function toAxisTheme(theme: PlotTheme): AxisTheme {
  return {
    axisColor: theme.axisColor,
    gridColor: theme.gridColor,
    textColor: theme.textColor,
    font: `${theme.fontSize}px ${theme.fontFamily}`,
    lineWidth: theme.axisLineWidth,
    labelPaddingPx: theme.axisLabelPadding,
    tickLabelPaddingPx: theme.axisTickLabelPadding,
  };
}
