import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', 'class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			'popover-foreground': 'hsl(var(--popover-foreground) / <alpha-value>)',
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			'secondary-foreground': 'hsl(var(--secondary-foreground) / <alpha-value>)',
  			ghost: 'hsl(var(--ghost) / <alpha-value>)',
  			'ghost-foreground': 'hsl(var(--ghost-foreground) / <alpha-value>)',
  			status: {
  				success: 'rgb(var(--color-status-success) / <alpha-value>)',
  				warning: 'rgb(var(--color-status-warning) / <alpha-value>)',
  				error: 'rgb(var(--color-status-error) / <alpha-value>)',
  				info: 'rgb(var(--color-status-info) / <alpha-value>)',
  				transmit: 'rgb(var(--color-status-transmit) / <alpha-value>)',
  				recording: 'rgb(var(--color-status-recording) / <alpha-value>)',
  				stopped: 'rgb(var(--color-status-stopped) / <alpha-value>)'
  			},
  			viz: {
  				bg: 'rgb(var(--viz-bg) / <alpha-value>)',
  				text: 'rgb(var(--viz-text) / <alpha-value>)',
  				border: 'rgb(var(--viz-border) / <alpha-value>)',
  				trace: 'rgb(var(--viz-trace) / <alpha-value>)'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
                    ...defaultTheme.fontFamily.sans
                ]
  		},
  		boxShadow: {
  			'viz-surface': 'var(--viz-surface-shadow)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
