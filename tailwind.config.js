/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // iOS のカーブ：初速が速く最後にスッと収まる（既定・ease-out）と、わずかに弾むバネ（spring）
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.22, 1, 0.36, 1)',
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
        ios: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      colors: {
        // アプリ本体の配色（index.css の変数。ライト／ダークで入れ替わる）
        page: 'rgb(var(--c-page) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        sunken: 'rgb(var(--c-sunken) / <alpha-value>)',
        fill: 'rgb(var(--c-fill) / <alpha-value>)',
        line: { DEFAULT: 'rgb(var(--c-line) / <alpha-value>)', strong: 'rgb(var(--c-line-strong) / <alpha-value>)' },
        fg: { DEFAULT: 'rgb(var(--c-fg) / <alpha-value>)', 2: 'rgb(var(--c-fg2) / <alpha-value>)', 3: 'rgb(var(--c-fg3) / <alpha-value>)' },
        accent: { DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)', ink: 'rgb(var(--c-accent-ink) / <alpha-value>)', soft: 'rgb(var(--c-accent-soft) / <alpha-value>)' },
        danger: { DEFAULT: 'rgb(var(--c-danger) / <alpha-value>)', ink: 'rgb(var(--c-danger-ink) / <alpha-value>)', soft: 'rgb(var(--c-danger-soft) / <alpha-value>)' },
        display: { DEFAULT: 'rgb(var(--c-display) / <alpha-value>)', on: 'rgb(var(--c-on-display) / <alpha-value>)' },
        // ここから下はシーン・登山デザイン用（テーマで変わらない）
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
        // 紙（キャンバス地）とインク、デニム
        paper: { DEFAULT: '#F5EEDC', 2: '#EDE3CC', 3: '#E2D5B8' },
        ink: { DEFAULT: '#3A2E28', soft: '#6E5D52', faint: '#A39283' },
        denim: { DEFAULT: '#24395A', deep: '#17253D', light: '#3B5683' },
        crayon: { blue: '#3E86C9', green: '#3E8C68', red: '#D9573B', yellow: '#F2B33D', pink: '#E68FA8', brown: '#4A3A34' },
      },
      fontFamily: {
        sans: ['var(--font-text)'],
        // 登山デザインの文字もフォント設定に従う
        maru: ['var(--font-text)'],
        digits: ['var(--font-digits)'],
        rounded: ['"SF Pro Rounded"', 'ui-rounded', '-apple-system', '"Hiragino Maru Gothic ProN"', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        glass: '0 20px 60px -20px rgba(0,0,0,0.55), inset 0 1px 0 0 rgba(255,255,255,0.10)',
        float: '0 24px 48px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
        glow: '0 0 40px -6px var(--glow, rgba(255,138,76,0.6))',
      },
      // 角丸は 3 段階 + ピル：小さな部品 9px / カード・ボタン 13px / 重ねて出す窓 20px
      borderRadius: { '4xl': '2rem', chip: '9px', card: '13px', sheet: '20px' },
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
