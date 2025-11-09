/**
 * Theme color utilities for inline styles and dynamic state-based styling.
 *
 * IMPORTANT: Colors are defined via CSS custom properties in index.css as RGB values.
 * Use Tailwind classes (bg-status-success, text-status-error, etc.) whenever possible.
 * Only use these utilities when inline styles or dynamic class construction is required.
 */

/**
 * Get a CSS custom property value from the current theme (returns RGB string like "124 131 255")
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
 * Get current theme color values as hex (automatically adapts to light/dark mode)
 */
export const themeColors = {
  status: {
    get success() { return rgbStringToHex(getCSSVariable('--color-status-success')); },
    get warning() { return rgbStringToHex(getCSSVariable('--color-status-warning')); },
    get error() { return rgbStringToHex(getCSSVariable('--color-status-error')); },
    get info() { return rgbStringToHex(getCSSVariable('--color-status-info')); },
    get transmit() { return rgbStringToHex(getCSSVariable('--color-status-transmit')); },
    get recording() { return rgbStringToHex(getCSSVariable('--color-status-recording')); },
    get stopped() { return rgbStringToHex(getCSSVariable('--color-status-stopped')); },
  },
  cockpit: {
    get accent() { return rgbStringToHex(getCSSVariable('--color-cockpit-accent')); },
    get accentHover() { return rgbStringToHex(getCSSVariable('--color-cockpit-accent-hover')); },
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
