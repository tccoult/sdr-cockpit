/**
 * Theme color utilities for inline styles and dynamic state-based styling.
 *
 * IMPORTANT: Colors are defined via CSS custom properties in index.css as RGB values.
 * Use Tailwind classes (bg-status-success, text-status-error, etc.) whenever possible.
 * Only use these utilities when inline styles or dynamic class construction is required.
 */

import { getCSSVariable, rgbStringToHex } from "./cssVars";

/**
 * Get current theme color values as hex (automatically adapts to light/dark mode)
 */
export const themeColors = {
  status: {
    get success() { return rgbStringToHex(getCSSVariable('--color-status-success')) || '#00b77a'; },
    get warning() { return rgbStringToHex(getCSSVariable('--color-status-warning')) || '#e0b500'; },
    get error() { return rgbStringToHex(getCSSVariable('--color-status-error')) || '#e53935'; },
    get info() { return rgbStringToHex(getCSSVariable('--color-status-info')) || '#2979ff'; },
    get transmit() { return rgbStringToHex(getCSSVariable('--color-status-transmit')) || '#2979ff'; },
    get recording() { return rgbStringToHex(getCSSVariable('--color-status-recording')) || '#e53935'; },
    get stopped() { return rgbStringToHex(getCSSVariable('--color-status-stopped')) || '#5e6270'; },
  },
  cockpit: {
    get accent() { return rgbStringToHex(getCSSVariable('--color-cockpit-accent')) || '#7c83ff'; },
    get accentHover() { return rgbStringToHex(getCSSVariable('--color-cockpit-accent-hover')) || '#6870ff'; },
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
