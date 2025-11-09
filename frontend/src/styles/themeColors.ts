/**
 * Theme color values for use in inline styles and dynamic state-based styling.
 *
 * IMPORTANT: These values MUST match tailwind.config.js
 * Use Tailwind classes (bg-status-success, text-status-error, etc.) whenever possible.
 * Only use these constants when inline styles or dynamic class construction is required.
 */

export const themeColors = {
  status: {
    success: '#4CE4B3',
    warning: '#E2C15A',
    error: '#FF4C4C',
    info: '#A1A6FF',
    transmit: '#6EC9FF',
    recording: '#FF6B9D',
    stopped: '#64748b',
  },
  cockpit: {
    accent: '#7c83ff',
    accentHover: '#9DA2FF',
  },
} as const;

/**
 * Convert hex color to rgba string
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get health indicator colors for inline styles
 */
export function getHealthIndicator(status: 'healthy' | 'warning' | 'error' | 'unknown') {
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
    glow: status === 'unknown' ? 'none' : `0 0 8px ${hexToRgba(color, 0.4)}`,
  };
}
