import { getCSSVariable, rgbStringToHex } from "../../styles/cssVars";

/**
 * Shared theme configuration for all visualization components
 * Ensures color harmony across FFT, Waterfall, and Spectrogram displays
 *
 * IMPORTANT: These values MUST match tailwind.config.js under the 'viz' namespace.
 * These constants are needed for canvas rendering which requires actual color values.
 */

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

/**
 * Get unified theme colors for visualization components
 * Values match Tailwind config (viz.* colors)
 */
const LIGHT_FALLBACK: VisualizationTheme = {
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

const DARK_FALLBACK: VisualizationTheme = {
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

export function getVisualizationTheme(isDark: boolean): VisualizationTheme {
  const fallback = isDark ? DARK_FALLBACK : LIGHT_FALLBACK;

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
    cursorLineColor:
      getCSSVariable("--viz-cursor") || fallback.cursorLineColor,
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
