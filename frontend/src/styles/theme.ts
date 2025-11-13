import type { PlotTheme } from "../plot/types";

/**
 * Read a CSS custom property (returns raw string, e.g. "124 131 255" or "rgba(0,0,0,0.5)")
 */
export function getCSSVariable(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Convert RGB triplet string ("124 131 255") to hex color ("#7c83ff").
 */
export function rgbStringToHex(rgb: string): string {
  const [r, g, b] = rgb.split(" ").map(Number);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "";
  return (
    "#" + [r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")
  );
}

export interface VisualizationTheme {
  background: string;
  gridColor: string;
  textColor: string;
  axisColor: string;
  cursorLineColor: string;
  traceColor: string;
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
  scaleBackground?: string;
  scaleText?: string;
}

const LIGHT_VISUALIZATION_THEME: VisualizationTheme = {
  background: "#FCFDFF",
  gridColor: "rgba(15, 23, 42, 0.08)",
  textColor: "#1F2937",
  axisColor: "rgba(15, 23, 42, 0.65)",
  cursorLineColor: "rgba(31, 41, 55, 0.35)",
  traceColor: "#7C83FF",
  tooltipBackground: "rgba(255, 255, 255, 0.96)",
  tooltipBorder: "rgba(124, 131, 255, 0.20)",
  tooltipText: "#1F2937",
  scaleBackground: "rgba(255, 255, 255, 0.92)",
  scaleText: "#1F2937",
};

const DARK_VISUALIZATION_THEME: VisualizationTheme = {
  background: "#0E1018",
  gridColor: "rgba(255, 255, 255, 0.05)",
  textColor: "#E5E7EB",
  axisColor: "rgba(255, 255, 255, 0.30)",
  cursorLineColor: "rgba(255, 255, 255, 0.25)",
  traceColor: "#50D2FF",
  tooltipBackground: "rgba(14, 16, 24, 0.95)",
  tooltipBorder: "rgba(124, 131, 255, 0.35)",
  tooltipText: "#F8FAFC",
  scaleBackground: "rgba(14, 16, 24, 0.85)",
  scaleText: "#F8FAFC",
};

function resolveMode(input: boolean | "dark" | "light"): boolean {
  if (typeof input === "boolean") return input;
  return input === "dark";
}

export function getVisualizationTheme(
  mode: boolean | "dark" | "light"
): VisualizationTheme {
  const isDark = resolveMode(mode);
  const fallback = isDark
    ? DARK_VISUALIZATION_THEME
    : LIGHT_VISUALIZATION_THEME;

  const background =
    rgbStringToHex(getCSSVariable("--viz-bg")) || fallback.background;
  const textColor =
    rgbStringToHex(getCSSVariable("--viz-text")) || fallback.textColor;
  const traceColor =
    rgbStringToHex(getCSSVariable("--viz-trace")) || fallback.traceColor;

  return {
    background,
    gridColor: getCSSVariable("--viz-grid") || fallback.gridColor,
    textColor,
    axisColor: getCSSVariable("--viz-axis") || fallback.axisColor,
    cursorLineColor: getCSSVariable("--viz-cursor") || fallback.cursorLineColor,
    traceColor,
    tooltipBackground:
      getCSSVariable("--viz-tooltip-bg") || fallback.tooltipBackground,
    tooltipBorder:
      getCSSVariable("--viz-tooltip-border") || fallback.tooltipBorder,
    tooltipText: getCSSVariable("--viz-tooltip-text") || fallback.tooltipText,
    scaleBackground:
      getCSSVariable("--viz-scale-bg") || fallback.scaleBackground,
    scaleText: getCSSVariable("--viz-scale-text") || fallback.scaleText,
  };
}

const PLOT_TYPOGRAPHY = {
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 12,
  axisLineWidth: 1,
  axisLabelPadding: 18,
  axisTickLabelPadding: 6,
};

export function toPlotTheme(theme: VisualizationTheme): PlotTheme {
  return {
    background: theme.background,
    gridColor: theme.gridColor,
    axisColor: theme.axisColor,
    textColor: theme.textColor,
    cursorLineColor: theme.cursorLineColor,
    cursorHighlightColor: theme.cursorLineColor,
    ...PLOT_TYPOGRAPHY,
  };
}

export function getPlotTheme(mode: boolean | "dark" | "light"): PlotTheme {
  return toPlotTheme(getVisualizationTheme(mode));
}

export const themeColors = {
  status: {
    get success() {
      return (
        rgbStringToHex(getCSSVariable("--color-status-success")) || "#00b77a"
      );
    },
    get warning() {
      return (
        rgbStringToHex(getCSSVariable("--color-status-warning")) || "#e0b500"
      );
    },
    get error() {
      return (
        rgbStringToHex(getCSSVariable("--color-status-error")) || "#e53935"
      );
    },
    get info() {
      return rgbStringToHex(getCSSVariable("--color-status-info")) || "#2979ff";
    },
    get transmit() {
      return (
        rgbStringToHex(getCSSVariable("--color-status-transmit")) || "#2979ff"
      );
    },
    get recording() {
      return (
        rgbStringToHex(getCSSVariable("--color-status-recording")) || "#e53935"
      );
    },
    get stopped() {
      return (
        rgbStringToHex(getCSSVariable("--color-status-stopped")) || "#5e6270"
      );
    },
  },
  accent: {
    get base() {
      return rgbStringToHex(getCSSVariable("--accent-rgb")) || "#7c83ff";
    },
  },
};

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getHealthIndicator(
  status: "healthy" | "warning" | "error" | "unknown"
) {
  const colorMap = {
    healthy: themeColors.status.success,
    warning: themeColors.status.warning,
    error: themeColors.status.error,
    unknown: themeColors.status.stopped,
  };

  const color = colorMap[status];

  return {
    dotColor: color,
    bgColor: hexToRgba(color, 0.1),
    borderColor: hexToRgba(color, 0.3),
    glow: status === "unknown" ? "none" : `0 0 8px ${hexToRgba(color, 0.4)}`,
  };
}
