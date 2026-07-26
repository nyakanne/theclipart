/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Single source of truth for Vindica's black/red/gold identity.
        // Values are read from the CSS custom properties in src/index.css
        // so there is exactly one place that defines each color.
        ink: {
          950: 'rgb(var(--vindica-ink-950) / <alpha-value>)',
          900: 'rgb(var(--vindica-ink-900) / <alpha-value>)',
          800: 'rgb(var(--vindica-ink-800) / <alpha-value>)',
          700: 'rgb(var(--vindica-ink-700) / <alpha-value>)',
          600: 'rgb(var(--vindica-ink-600) / <alpha-value>)',
        },
        gold: {
          400: 'rgb(var(--vindica-gold-soft) / <alpha-value>)',
          500: 'rgb(var(--vindica-gold) / <alpha-value>)',
          600: 'rgb(148 118 32 / <alpha-value>)',
        },
        ivory: {
          DEFAULT: 'rgb(var(--vindica-ivory) / <alpha-value>)',
        },
        // Overriding only the shades actually used across the app means
        // every existing `red-400`/`border-red-800`/`bg-red-900` className
        // resolves to the canonical Vindica reds with no template changes.
        red: {
          400: 'rgb(var(--vindica-red-glow) / <alpha-value>)',
          500: 'rgb(var(--vindica-red-glow) / <alpha-value>)',
          600: 'rgb(var(--vindica-red-glow) / <alpha-value>)',
          700: 'rgb(var(--vindica-red) / <alpha-value>)',
          800: 'rgb(var(--vindica-red) / <alpha-value>)',
          900: 'rgb(var(--vindica-red-deep) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line': 'scanLine 2s linear infinite',
      },
      keyframes: {
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
}
