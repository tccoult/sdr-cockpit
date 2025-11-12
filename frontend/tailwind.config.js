import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: 'hsl(var(--card) / <alpha-value>)',
        'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
        popover: 'hsl(var(--popover) / <alpha-value>)',
        'popover-foreground': 'hsl(var(--popover-foreground) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
        accent: 'hsl(var(--accent) / <alpha-value>)',
        'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        secondary: 'hsl(var(--secondary) / <alpha-value>)',
        'secondary-foreground': 'hsl(var(--secondary-foreground) / <alpha-value>)',
        ghost: 'hsl(var(--ghost) / <alpha-value>)',
        'ghost-foreground': 'hsl(var(--ghost-foreground) / <alpha-value>)',
        cockpit: {
          surface: '#080b12',
          accent: 'rgb(var(--color-cockpit-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--color-cockpit-accent-hover) / <alpha-value>)',
        },
        status: {
          success: 'rgb(var(--color-status-success) / <alpha-value>)',
          warning: 'rgb(var(--color-status-warning) / <alpha-value>)',
          error: 'rgb(var(--color-status-error) / <alpha-value>)',
          info: 'rgb(var(--color-status-info) / <alpha-value>)',
          transmit: 'rgb(var(--color-status-transmit) / <alpha-value>)',
          recording: 'rgb(var(--color-status-recording) / <alpha-value>)',
          stopped: 'rgb(var(--color-status-stopped) / <alpha-value>)',
        },
        viz: {
          bg: 'rgb(var(--viz-bg) / <alpha-value>)',
          text: 'rgb(var(--viz-text) / <alpha-value>)',
          border: 'rgb(var(--viz-border) / <alpha-value>)',
          trace: 'rgb(var(--viz-trace) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        'cockpit-glow': '0 20px 60px rgba(0, 0, 0, 0.45)',
        'viz-surface': 'var(--viz-surface-shadow)',
      },
    },
  },
  plugins: [],
}
