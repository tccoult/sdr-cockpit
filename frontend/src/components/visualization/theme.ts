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
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Convert RGB string (e.g., "124 131 255") to hex color (e.g., "#7c83ff")
 */
function rgbStringToHex(rgb: string): string {
  const [r, g, b] = rgb.split(' ').map(Number);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#7c83ff'; // fallback
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Get unified theme colors for visualization components
 * Values match Tailwind config (viz.* colors)
 */
export function getVisualizationTheme(isDark: boolean): VisualizationTheme {
  const accentColor = rgbStringToHex(getCSSVariable('--color-cockpit-accent') || '124 131 255');

  if (isDark) {
    return {
      background: 'rgba(10, 10, 15, 0.90)', // viz.bg-dark
      gridColor: 'rgba(255, 255, 255, 0.10)', // viz.grid-dark
      textColor: '#f1f5f9', // viz.text-dark
      axisColor: 'rgba(255, 255, 255, 0.40)', // viz.axis-dark
      traceColor: accentColor, // viz.trace (from CSS variable)
      tooltipBackground: 'rgba(15, 20, 30, 0.95)', // viz.tooltip-bg-dark
      tooltipBorder: 'rgba(255, 255, 255, 0.20)', // viz.tooltip-border-dark
      tooltipText: '#ffffff',
      scaleBackground: 'rgba(0, 0, 0, 0.70)', // viz.scale-bg-dark
      scaleText: '#ffffff',
    };
  } else {
    return {
      background: 'rgba(247, 249, 255, 0.98)', // viz.bg-light
      gridColor: 'rgba(15, 23, 42, 0.12)', // viz.grid-light
      textColor: '#0f172a', // viz.text-light
      axisColor: 'rgba(15, 23, 42, 0.80)', // viz.axis-light
      traceColor: accentColor, // viz.trace (from CSS variable)
      tooltipBackground: 'rgba(255, 255, 255, 0.95)', // viz.tooltip-bg-light
      tooltipBorder: 'rgba(15, 23, 42, 0.18)', // viz.tooltip-border-light
      tooltipText: '#0f172a',
      scaleBackground: 'rgba(255, 255, 255, 0.92)', // viz.scale-bg-light
      scaleText: '#0f172a',
    };
  }
}
