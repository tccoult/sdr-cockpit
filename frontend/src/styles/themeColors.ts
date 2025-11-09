/**
 * Theme color utilities for inline styles and dynamic state-based styling.
 *
 * IMPORTANT: Colors are defined via CSS custom properties in index.css.
 * Use Tailwind classes (bg-status-success, text-status-error, etc.) whenever possible.
 * Only use these utilities when inline styles or dynamic class construction is required.
 */

/**
 * Get a CSS custom property value from the current theme
 */
function getCSSVariable(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Get current theme color values (automatically adapts to light/dark mode)
 */
export const themeColors = {
  status: {
    get success() { return getCSSVariable('--color-status-success'); },
    get warning() { return getCSSVariable('--color-status-warning'); },
    get error() { return getCSSVariable('--color-status-error'); },
    get info() { return getCSSVariable('--color-status-info'); },
    get transmit() { return getCSSVariable('--color-status-transmit'); },
    get recording() { return getCSSVariable('--color-status-recording'); },
    get stopped() { return getCSSVariable('--color-status-stopped'); },
  },
  cockpit: {
    get accent() { return getCSSVariable('--color-cockpit-accent'); },
    get accentHover() { return getCSSVariable('--color-cockpit-accent-hover'); },
  },
};

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
