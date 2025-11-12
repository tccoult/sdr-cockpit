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
 * Get CSS custom property value (returns RGB string like "124 131 255")
 */
function getCSSVariable(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Convert RGB string (e.g., "124 131 255") to hex color (e.g., "#7c83ff")
 */
function rgbStringToHex(rgb: string): string {
  const [r, g, b] = rgb.split(" ").map(Number);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "#7c83ff"; // fallback
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * Get unified theme colors for visualization components
 * Values match Tailwind config (viz.* colors)
 */
export function getVisualizationTheme(isDark: boolean): VisualizationTheme {
  const accentColor =
    rgbStringToHex(getCSSVariable("--color-cockpit-accent") || "124 131 255") ||
    "#7C83FF";

  if (isDark) {
    return {
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
  }

  return {
    background: "#FCFDFF",
    gridColor: "rgba(15, 23, 42, 0.08)",
    textColor: "#1F2937",
    axisColor: "rgba(15, 23, 42, 0.65)",
    cursorLineColor: "rgba(31, 41, 55, 0.35)",
    traceColor: accentColor,
    tooltipBackground: "rgba(255, 255, 255, 0.96)",
    tooltipBorder: "rgba(124, 131, 255, 0.20)",
    tooltipText: "#1F2937",
    scaleBackground: "rgba(255, 255, 255, 0.92)",
    scaleText: "#1F2937",
  };
}
