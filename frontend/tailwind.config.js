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
          trace: '#7C83FF',
          'bg-dark': '#0E1018',
          'bg-light': '#FCFDFF',
          'grid-dark': 'rgba(255, 255, 255, 0.08)',
          'grid-light': 'rgba(15, 23, 42, 0.06)',
          'axis-dark': 'rgba(255, 255, 255, 0.40)',
          'axis-light': 'rgba(15, 23, 42, 0.80)',
          'text-dark': '#E5E7EB',
          'text-light': '#1F2937',
          'ctrl-dark': '#0E1018',
          'ctrl-light': '#FCFDFF',
        },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        'cockpit-glow': '0 20px 60px rgba(0, 0, 0, 0.45)',
        'viz-surface-light': '0 1px 3px rgba(15, 23, 42, 0.06)',
        'viz-surface-dark': '0 0 18px rgba(15, 23, 42, 0.75)',
      },
    },
  },
  plugins: [],
}
