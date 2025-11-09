/**
 * Shared theme configuration for all visualization components
 * Ensures color harmony across FFT, Waterfall, and Spectrogram displays
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
 * Uses cockpit-accent violet for consistency with the UI theme
 */
export function getVisualizationTheme(isDark: boolean): VisualizationTheme {
  if (isDark) {
    return {
      background: 'rgba(10, 10, 15, 0.90)',
      gridColor: 'rgba(255, 255, 255, 0.10)',
      textColor: '#f1f5f9', // slate-100
      axisColor: 'rgba(255, 255, 255, 0.40)',
      traceColor: '#7c83ff', // cockpit-accent
      tooltipBackground: 'rgba(15, 20, 30, 0.95)',
      tooltipBorder: 'rgba(255, 255, 255, 0.20)',
      tooltipText: '#ffffff',
      scaleBackground: 'rgba(0, 0, 0, 0.70)',
      scaleText: '#ffffff',
    };
  } else {
    return {
      background: 'rgba(247, 249, 255, 0.98)',
      gridColor: 'rgba(15, 23, 42, 0.12)',
      textColor: '#0f172a', // slate-900
      axisColor: 'rgba(15, 23, 42, 0.80)',
      traceColor: '#7c83ff', // cockpit-accent
      tooltipBackground: 'rgba(255, 255, 255, 0.95)',
      tooltipBorder: 'rgba(15, 23, 42, 0.18)',
      tooltipText: '#0f172a',
      scaleBackground: 'rgba(255, 255, 255, 0.92)',
      scaleText: '#0f172a',
    };
  }
}
