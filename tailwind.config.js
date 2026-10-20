/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          950: '#070B17',
          900: '#0C1224',
          800: '#141C34',
          700: '#1E2846',
        },
        ember: { DEFAULT: '#FF8A4C', soft: '#FFB07F', deep: '#E8642A' },
        summit: { DEFAULT: '#8EC5FF', soft: '#BBDCFF', deep: '#5A9FEA' },
        moss: { DEFAULT: '#7FD1A8', soft: '#B2E6CB', deep: '#4FB284' },
        dusk: { DEFAULT: '#C3A6FF', soft: '#DCCBFF' },
        sun: { DEFAULT: '#FFD27A', soft: '#FFE3A8' },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"',
          '"Hiragino Sans"', '"Hiragino Kaku Gothic ProN"', '"Noto Sans JP"', '"Segoe UI"',
          'system-ui', 'sans-serif',
        ],
        rounded: ['"SF Pro Rounded"', 'ui-rounded', '-apple-system', '"Hiragino Maru Gothic ProN"', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 20px 60px -20px rgba(0,0,0,0.55), inset 0 1px 0 0 rgba(255,255,255,0.10)',
        float: '0 24px 48px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
        glow: '0 0 40px -6px var(--glow, rgba(255,138,76,0.6))',
      },
      borderRadius: { '4xl': '2rem' },
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: { shimmer: 'shimmer 3s linear infinite' },
    },
  },
  plugins: [],
};
