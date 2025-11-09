/**
 * Status color utilities
 * Centralizes color definitions for status indicators to ensure consistency
 * These map to Tailwind color values: emerald-500, amber-500, red-500, slate-500
 */

export interface StatusIndicator {
  dotColor: string;
  bgColor: string;
  borderColor: string;
  glow: string;
}

/**
 * Tailwind color values for status indicators
 * Using hex values here for inline styles that require rgba manipulation
 */
const COLORS = {
  emerald: '#10b981', // emerald-500
  amber: '#f59e0b', // amber-500
  red: '#ef4444', // red-500
  slate: '#64748b', // slate-500
} as const;

/**
 * Convert hex color to rgba components
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get status indicator styles for health status
 */
export function getHealthIndicator(
  status: 'healthy' | 'warning' | 'error' | 'unknown'
): StatusIndicator {
  switch (status) {
    case 'healthy':
      return {
        dotColor: COLORS.emerald,
        bgColor: hexToRgba(COLORS.emerald, 0.1),
        borderColor: hexToRgba(COLORS.emerald, 0.3),
        glow: `0 0 8px ${hexToRgba(COLORS.emerald, 0.4)}`,
      };
    case 'warning':
      return {
        dotColor: COLORS.amber,
        bgColor: hexToRgba(COLORS.amber, 0.1),
        borderColor: hexToRgba(COLORS.amber, 0.3),
        glow: `0 0 8px ${hexToRgba(COLORS.amber, 0.4)}`,
      };
    case 'error':
      return {
        dotColor: COLORS.red,
        bgColor: hexToRgba(COLORS.red, 0.1),
        borderColor: hexToRgba(COLORS.red, 0.3),
        glow: `0 0 8px ${hexToRgba(COLORS.red, 0.4)}`,
      };
    case 'unknown':
    default:
      return {
        dotColor: COLORS.slate,
        bgColor: hexToRgba(COLORS.slate, 0.1),
        borderColor: hexToRgba(COLORS.slate, 0.3),
        glow: 'none',
      };
  }
}
