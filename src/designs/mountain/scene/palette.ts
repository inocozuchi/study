import { hexToRgb, mix, rgba, skyAt, type RGB } from '@/lib/scene';

import type { Season } from '@/types';

export interface MeadowPalette {
  base: string;
  lt: string;
  sh: string;
  strokeLt: string;
  strokeDk: string;
  back: string;
  backSh: string;
}

export interface SeasonLook {
  label: string;
  meadow: MeadowPalette;
  /** 広葉樹の葉（null で冬の裸木） */
  foliage: { base: string; sh: string; hi: string } | null;
  coniferLit: string;
  /** 木・山に雪が積もる */
  snow: number;
  /** 舞うもの */
  particle: 'petal' | 'leaf' | 'snow' | 'sakura' | 'seed';
  /** 前景の花 */
  flower: { petal: string; center: string };
  /** 草原に散る花の色 */
  dots: string[];
  /** 空の調整（セルリアンへの寄せ具合） */
  skyBlue: number;
}

export const SEASONS: Record<Season, SeasonLook> = {
  spring: {
    label: '春',
    meadow: { base: '#A9CB5E', lt: '#C8E07E', sh: '#7FA545', strokeLt: '#E2F0A8', strokeDk: '#5E8636', back: '#8FB35A', backSh: '#6E9446' },
    foliage: { base: '#9BCB5A', sh: '#6F9E3E', hi: '#C9E68A' },
    coniferLit: '#9BC25A', snow: 0, particle: 'seed',
    flower: { petal: '#FFFFFF', center: '#F2B632' }, dots: ['#FFFFFF', '#F5D04E', '#F3A6C0'], skyBlue: 0.65,
  },
  summer: {
    label: '夏',
    meadow: { base: '#6FAE4A', lt: '#93C962', sh: '#4C8836', strokeLt: '#B8DE86', strokeDk: '#356A27', back: '#5E9A48', backSh: '#467A38' },
    foliage: { base: '#4E9A44', sh: '#2F6E30', hi: '#7DBF5C' },
    coniferLit: '#7FB04A', snow: 0, particle: 'seed',
    flower: { petal: '#FFFFFF', center: '#F2B632' }, dots: ['#FFFFFF', '#F2C94C'], skyBlue: 0.9,
  },
  autumn: {
    label: '秋',
    meadow: { base: '#E3B043', lt: '#F4CF68', sh: '#C08A2C', strokeLt: '#FBE29A', strokeDk: '#A87320', back: '#C99A3A', backSh: '#A97B2B' },
    foliage: { base: '#E4B23A', sh: '#BE8A22', hi: '#F6D86A' },
    coniferLit: '#D98A2E', snow: 0, particle: 'leaf',
    flower: { petal: '#FFFFFF', center: '#F2B632' }, dots: ['#FFFFFF', '#F08A3C'], skyBlue: 0.75,
  },
  winter: {
    label: '冬',
    meadow: { base: '#EEF1F4', lt: '#FFFFFF', sh: '#C6D0DC', strokeLt: '#FFFFFF', strokeDk: '#A9B5C5', back: '#D7DEE6', backSh: '#B5C2D1' },
    foliage: null,
    coniferLit: '#5E8A6A', snow: 0.95, particle: 'snow',
    flower: { petal: '#E8EEF6', center: '#C9D4E2' }, dots: ['#FFFFFF'], skyBlue: 0.55,
  },
  sakura: {
    label: '桜',
    meadow: { base: '#B8CF6A', lt: '#D4E38E', sh: '#8DAA4E', strokeLt: '#EEF3BC', strokeDk: '#6C8A3C', back: '#A6BE70', backSh: '#869E58' },
    foliage: { base: '#F2A9C0', sh: '#D97F9F', hi: '#FBD3E0' },
    coniferLit: '#9BC25A', snow: 0, particle: 'sakura',
    flower: { petal: '#FBD3E0', center: '#F2B632' }, dots: ['#FFFFFF', '#F7B6CB', '#F5D04E'], skyBlue: 0.7,
  },
};

export const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter', 'sakura'];

const CERULEAN = { top: hexToRgb('#1D5AA3'), mid: hexToRgb('#4A90CF'), bot: hexToRgb('#BFE0EE') };

export interface StageSky {
  top: string;
  mid: string;
  bot: string;
  night: number;
  /** 0..1 夕焼け・朝焼けの強さ */
  glow: number;
  sun: string;
  /** 太陽（月）の位置 0..1 */
  sunX: number;
  sunY: number;
}

export function stageSky(hour: number, blue = 0.75): StageSky {
  const p = skyAt(hour);
  const h = ((hour % 24) + 24) % 24;
  const sunH = Math.sin(((h - 6) / 12) * Math.PI);
  const glow = (1 - p.night) * (1 - Math.max(0, Math.min(1, sunH * 2.4)));
  // 日中は深いセルリアンの空へ寄せる（朝夕・夜はそのまま）
  const k = (1 - p.night) * (1 - glow) * blue;
  const c = (a: RGB, b: RGB) => rgba(mix(a, b, k));
  const dayT = Math.max(0, Math.min(1, (h - 5.5) / 13));
  return {
    top: c(p.top, CERULEAN.top),
    mid: c(p.mid, CERULEAN.mid),
    bot: c(p.bot, CERULEAN.bot),
    night: p.night,
    glow,
    sun: rgba(p.sun),
    sunX: 0.62 + 0.26 * Math.sin(dayT * Math.PI * 0.5 + 0.3),
    sunY: 0.2 - 0.12 * Math.max(0, sunH),
  };
}
