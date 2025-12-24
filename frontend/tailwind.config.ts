import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          black: '#0a0a0a',
          darker: '#050505',
          dark: '#111111',
          gray: '#1a1a1a',
          border: '#222222',
          text: '#888888',
        },
        neon: {
          green: '#00ff00',
          greenDark: '#00cc00',
          greenGlow: '#00ff0080',
          red: '#ff3333',
          redDark: '#cc0000',
          redGlow: '#ff333380',
          amber: '#ffaa00',
          cyan: '#00ffff',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scan-line': 'scanLine 8s linear infinite',
        'blink': 'blink 1s step-end infinite',
        'matrix-rain': 'matrixRain 20s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px #00ff00, 0 0 10px #00ff0040' },
          '50%': { boxShadow: '0 0 20px #00ff00, 0 0 30px #00ff0060' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        matrixRain: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(#00ff0008 1px, transparent 1px),
                         linear-gradient(90deg, #00ff0008 1px, transparent 1px)`,
        'scanline': 'linear-gradient(transparent 50%, rgba(0, 0, 0, 0.1) 50%)',
      },
      backgroundSize: {
        'grid': '50px 50px',
        'scanline': '100% 4px',
      },
    },
  },
  plugins: [],
}
export default config
