import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cockpit: {
          surface: '#080b12',
          panel: 'rgba(16, 20, 32, 0.85)',
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
          trace: 'rgb(var(--color-cockpit-accent) / <alpha-value>)',
          'bg-dark': 'rgba(8, 10, 16, 0.95)',
          'bg-light': 'rgba(247, 249, 251, 0.98)',
          'grid-dark': 'rgba(255, 255, 255, 0.06)',
          'grid-light': 'rgba(15, 23, 42, 0.08)',
          'axis-dark': 'rgba(255, 255, 255, 0.40)',
          'axis-light': 'rgba(15, 23, 42, 0.80)',
          'text-dark': '#f1f5f9',
          'text-light': '#0f172a',
          'tooltip-bg-dark': 'rgba(15, 20, 30, 0.95)',
          'tooltip-bg-light': 'rgba(255, 255, 255, 0.95)',
          'tooltip-border-dark': 'rgba(255, 255, 255, 0.20)',
          'tooltip-border-light': 'rgba(15, 23, 42, 0.18)',
          'scale-bg-dark': 'rgba(0, 0, 0, 0.70)',
          'scale-bg-light': 'rgba(255, 255, 255, 0.92)',
        },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        'cockpit-glow': '0 20px 60px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
}
