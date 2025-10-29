/**
 * Design tokens and theme constants for SDR Cockpit
 */

// Colors
export const colors = {
  // Base colors
  background: {
    primary: '#0a0a0f',
    secondary: 'rgba(10, 10, 15, 0.8)',
    tertiary: 'rgba(10, 10, 15, 0.6)',
    canvas: 'rgba(10, 10, 15, 0.95)',
    modal: 'rgba(20, 20, 30, 0.95)',
    input: 'rgba(30, 30, 40, 0.8)',
  },

  // Text colors
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.8)',
    tertiary: 'rgba(255, 255, 255, 0.6)',
    quaternary: 'rgba(255, 255, 255, 0.5)',
    muted: 'rgba(255, 255, 255, 0.4)',
  },

  // Border colors
  border: {
    primary: 'rgba(255, 255, 255, 0.1)',
    secondary: 'rgba(255, 255, 255, 0.15)',
    tertiary: 'rgba(255, 255, 255, 0.2)',
    strong: 'rgba(255, 255, 255, 0.3)',
    subtle: 'rgba(255, 255, 255, 0.06)',
  },

  // Interactive element backgrounds
  interactive: {
    default: 'rgba(255, 255, 255, 0.08)',
    hover: 'rgba(255, 255, 255, 0.12)',
    active: 'rgba(255, 255, 255, 0.15)',
    subtle: 'rgba(255, 255, 255, 0.05)',
    muted: 'rgba(255, 255, 255, 0.04)',
  },

  // Status colors
  status: {
    live: '#4caf50',
    transmitting: '#ff9800',
    paused: '#ffc107',
    stopped: '#9e9e9e',
    recording: '#f44336',
  },

  // Status backgrounds
  statusBg: {
    live: 'rgba(76, 175, 80, 0.1)',
    liveBorder: 'rgba(76, 175, 80, 0.3)',
    paused: 'rgba(158, 158, 158, 0.1)',
    pausedBorder: 'rgba(158, 158, 158, 0.3)',
    recording: 'rgba(244, 67, 54, 0.1)',
    recordingBorder: 'rgba(244, 67, 54, 0.3)',
    info: 'rgba(0, 229, 255, 0.1)',
    infoBorder: 'rgba(0, 229, 255, 0.3)',
  },

  // Accent colors
  accent: {
    primary: '#66d0ff',
    fft: '#FF00FF',
    cursor: '#FFFF00',
    selection: 'rgba(255, 0, 255, 0.05)',
    selectionBorder: 'rgba(255, 0, 255, 0.2)',
  },

  // Overlay colors
  overlay: {
    light: 'rgba(0, 0, 0, 0.5)',
    heavy: 'rgba(0, 0, 0, 0.8)',
  },
} as const;

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
} as const;

// Border radius
export const borderRadius = {
  sm: 3,
  md: 4,
  lg: 6,
  xl: 8,
  xxl: 12,
  round: '50%',
} as const;

// Layout
export const layout = {
  sidebarWidth: 280,
  mobileBreakpoint: 1024,
} as const;

// Canvas margins (for FFT and waterfall displays)
export const canvasMargins = {
  top: 20,
  right: 30,
  bottom: 40,
  left: 60,
} as const;

// Animation
export const animation = {
  fast: '0.15s',
  normal: '0.2s',
  slow: '0.3s',
  slower: '0.4s',
  easing: {
    standard: 'ease',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// Shadows
export const shadows = {
  sm: '0 2px 4px rgba(0, 0, 0, 0.2)',
  md: '0 4px 8px rgba(0, 0, 0, 0.3)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 0 40px rgba(255, 255, 255, 0.02)',
  xl: '0 20px 60px rgba(0, 0, 0, 0.5)',
} as const;

// Performance
export const performance = {
  fftFrameRate: 60,
  waterfallFrameRate: 30,
  debounceTime: 100,
  fftSmoothingFactor: 0.9,
} as const;

// Typography
export const typography = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: {
    xs: 9,
    sm: 11,
    md: 12,
    base: 13,
    lg: 14,
    xl: 16,
    xxl: 18,
    xxxl: 20,
    xxxxl: 22,
    xxxxxl: 24,
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

// Z-index layers
export const zIndex = {
  base: 0,
  dropdown: 10,
  overlay: 999,
  modal: 1000,
  tooltip: 1001,
} as const;
