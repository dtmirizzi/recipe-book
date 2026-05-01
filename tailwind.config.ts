import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tomato: {
          50: 'oklch(0.96 0.025 30)',
          100: 'oklch(0.92 0.06 30)',
          300: 'oklch(0.78 0.13 30)',
          500: 'oklch(0.62 0.18 30)',
          700: 'oklch(0.48 0.16 30)',
          900: 'oklch(0.32 0.10 30)',
        },
        saffron: {
          100: 'oklch(0.92 0.06 82)',
          500: 'oklch(0.78 0.14 82)',
          700: 'oklch(0.58 0.12 82)',
        },
        paper: {
          DEFAULT: '#fdfcf9',
          warm: '#f7f4ed',
          soft: '#efeae0',
        },
        ink: {
          DEFAULT: '#1f1d18',
          soft: '#4a463f',
          muted: '#8a857b',
        },
        line: '#e7e2d5',
        ok: 'oklch(0.62 0.13 145)',
        warn: 'oklch(0.72 0.15 65)',
        err: 'oklch(0.58 0.20 25)',
      },
      fontFamily: {
        sans: ['Lato', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '14px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(74, 70, 63, 0.06)',
        md: '0 4px 12px rgba(74, 70, 63, 0.08), 0 1px 2px rgba(74, 70, 63, 0.06)',
        lg: '0 12px 28px rgba(74, 70, 63, 0.10), 0 2px 6px rgba(74, 70, 63, 0.06)',
      },
      maxWidth: {
        container: '1120px',
      },
    },
  },
  plugins: [],
};

export default config;
