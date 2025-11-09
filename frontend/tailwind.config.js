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
          accent: 'var(--color-cockpit-accent)',
          'accent-hover': 'var(--color-cockpit-accent-hover)',
        },
        status: {
          success: 'var(--color-status-success)',
          warning: 'var(--color-status-warning)',
          error: 'var(--color-status-error)',
          info: 'var(--color-status-info)',
          transmit: 'var(--color-status-transmit)',
          recording: 'var(--color-status-recording)',
          stopped: 'var(--color-status-stopped)',
        },
        viz: {
          trace: 'var(--color-cockpit-accent)',
          'bg-dark': 'rgba(10, 10, 15, 0.90)',
          'bg-light': 'rgba(247, 249, 255, 0.98)',
          'grid-dark': 'rgba(255, 255, 255, 0.10)',
          'grid-light': 'rgba(15, 23, 42, 0.12)',
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
