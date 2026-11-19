/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f1115',
        graphite: '#1a1d24',
        slate: {
          DEFAULT: '#2a2e38',
          light: '#363b48',
        },
        ash: '#8b8d94',
        bone: '#e8e6e1',
        cream: '#f5f4f0',
        ember: {
          DEFAULT: '#e85d3a',
          light: '#ff7a57',
          dark: '#c44a2e',
        },
        amber: {
          DEFAULT: '#f0a830',
          light: '#ffc44d',
        },
        sage: {
          DEFAULT: '#4a9d7c',
          light: '#5cb88f',
        },
        frost: {
          DEFAULT: '#5b8def',
          light: '#7da5f5',
        },
        rose: {
          DEFAULT: '#d94f6b',
          light: '#e56e84',
        },
        violet: '#a855f7',
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display-xl': ['clamp(3rem, 7vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(2.25rem, 5vw, 3.5rem)', { lineHeight: '1', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(1.75rem, 3.5vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'heading': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body': ['0.9375rem', { lineHeight: '1.6' }],
        'caption': ['0.8125rem', { lineHeight: '1.5' }],
        'micro': ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.03em' }],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.15)',
        'card-drag': '0 12px 40px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3)',
        'glow-ember': '0 0 20px rgba(232,93,58,0.3)',
        'glow-frost': '0 0 20px rgba(91,141,239,0.3)',
      },
      borderRadius: {
        'card': '0.625rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

