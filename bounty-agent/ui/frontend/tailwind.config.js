/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg:     '#080b12',
          card:   '#0d1117',
          border: '#1e2d3d',
          green:  '#00ff88',
          blue:   '#00d4ff',
          purple: '#a855f7',
          red:    '#ff4444',
          orange: '#ff8800',
          yellow: '#ffcc00',
        },
      },
      animation: {
        'pulse-green': 'pulseGreen 2s ease-in-out infinite',
        'scan-line':   'scanLine 3s linear infinite',
        'fade-in':     'fadeIn 0.4s ease-out',
        'slide-up':    'slideUp 0.3s ease-out',
        'glow':        'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseGreen: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 8px #00ff88' },
          '50%':      { opacity: '0.6', boxShadow: '0 0 20px #00ff88' },
        },
        scanLine: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          from: { textShadow: '0 0 10px #00ff88, 0 0 20px #00ff88' },
          to:   { textShadow: '0 0 20px #00ff88, 0 0 40px #00ff88, 0 0 60px #00ff88' },
        },
      },
    },
  },
  plugins: [],
}
