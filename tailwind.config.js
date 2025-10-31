/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			primary: {
  				'50': '#eff6ff',
  				'100': '#dbeafe',
  				'200': '#bfdbfe',
  				'300': '#93c5fd',
  				'400': '#60a5fa',
  				'500': '#3b82f6',
  				'600': '#2563eb',
  				'700': '#1d4ed8',
  				'800': '#1e40af',
  				'900': '#1e3a8a',
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			gray: {
  				'50': '#f9fafb',
  				'100': '#f3f4f6',
  				'200': '#e5e7eb',
  				'300': '#d1d5db',
  				'400': '#9ca3af',
  				'500': '#6b7280',
  				'600': '#4b5563',
  				'700': '#374151',
  				'800': '#1f2937',
  				'900': '#111827'
  			},
  			green: {
  				'50': '#f0fdf4',
  				'100': '#dcfce7',
  				'200': '#bbf7d0',
  				'300': '#86efac',
  				'400': '#4ade80',
  				'500': '#22c55e',
  				'600': '#16a34a',
  				'700': '#15803d',
  				'800': '#166534',
  				'900': '#14532d'
  			},
  			// Galileo Glass UI Colors
  			galileo: {
  				'bg-primary': '#ECECEF',
  				'bg-secondary': '#F3F4F6',
  				'bg-gradient-start': '#F3F4F6',
  				'bg-gradient-end': '#DFE2E8',
  				'glass-bg': 'rgba(255, 255, 255, 0.35)',
  				'glass-bg-hover': 'rgba(255, 255, 255, 0.5)',
  				'glass-border': 'rgba(200, 200, 200, 0.23)',
  				'text-primary': '#414753',
  				'text-secondary': '#60616A',
  				'text-tertiary': '#7A7E88',
  				'interactive-bg': 'rgba(255, 255, 255, 0.5)',
  				'interactive-border': '#A1A5AF',
  				'interactive-hover': '#868B97',
  				// Advanced Glassmorphism Colors
  				'glass-subtle-bg': 'rgba(255, 255, 255, 0.15)',
  				'glass-elevated-bg': 'rgba(255, 255, 255, 0.5)',
  				'glass-frosted-bg': 'rgba(255, 255, 255, 0.25)',
  				'glass-depth-bg': 'rgba(255, 255, 255, 0.3)',
  				'glass-depth-border': 'rgba(255, 255, 255, 0.4)',
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
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
  				'SF Pro Display',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		backdropBlur: {
  			'galileo': '32px',
  		},
  		boxShadow: {
  			'galileo': '0 4px 24px 0 rgba(100, 100, 100, 0.10)',
  		},
  		borderRadius: {
  			'galileo': '24px',
  			'galileo-sm': '20px',
  			'galileo-lg': '32px',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		animation: {
  			bounce: 'bounce 1s infinite',
  			spin: 'spin 1s linear infinite',
  			pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  		},
  		keyframes: {
  			bounce: {
  				'0%, 100%': {
  					transform: 'translateY(-25%)',
  					animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)'
  				},
  				'50%': {
  					transform: 'none',
  					animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)'
  				}
  			},
  			spin: {
  				from: {
  					transform: 'rotate(0deg)'
  				},
  				to: {
  					transform: 'rotate(360deg)'
  				}
  			},
  			pulse: {
  				'0%, 100%': {
  					opacity: '1'
  				},
  				'50%': {
  					opacity: '.5'
  				}
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}


