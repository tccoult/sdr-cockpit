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
 * Get unified theme colors for visualization components
 * Values match Tailwind config (viz.* colors)
 */
export function getVisualizationTheme(isDark: boolean): VisualizationTheme {
  if (isDark) {
    return {
      background: 'rgba(10, 10, 15, 0.90)', // viz.bg-dark
      gridColor: 'rgba(255, 255, 255, 0.10)', // viz.grid-dark
      textColor: '#f1f5f9', // viz.text-dark
      axisColor: 'rgba(255, 255, 255, 0.40)', // viz.axis-dark
      traceColor: '#7c83ff', // viz.trace
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
      traceColor: '#7c83ff', // viz.trace
      tooltipBackground: 'rgba(255, 255, 255, 0.95)', // viz.tooltip-bg-light
      tooltipBorder: 'rgba(15, 23, 42, 0.18)', // viz.tooltip-border-light
      tooltipText: '#0f172a',
      scaleBackground: 'rgba(255, 255, 255, 0.92)', // viz.scale-bg-light
      scaleText: '#0f172a',
    };
  }
}
