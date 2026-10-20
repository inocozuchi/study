import { hexToRgb, mix, rgba, skyAt, type RGB } from '@/lib/scene';

export interface MeadowPalette {
  base: string;
  lt: string;
  sh: string;
  strokeLt: string;
  strokeDk: string;
  back: string;
  backSh: string;
}

/** 登山ステージ別の草原（地面）の色：麓の黄金色 → 樹林 → 尾根 → 雪 → 山頂の夕映え */
export const MEADOW: MeadowPalette[] = [
  { base: '#E3B043', lt: '#F4CF68', sh: '#C08A2C', strokeLt: '#FBE29A', strokeDk: '#A87320', back: '#C99A3A', backSh: '#A97B2B' },
  { base: '#C2A63F', lt: '#DCC662', sh: '#918530', strokeLt: '#EADC8C', strokeDk: '#6F6A24', back: '#8F8A3A', backSh: '#6E6B2C' },
  { base: '#C9A86A', lt: '#DEC28A', sh: '#9E8458', strokeLt: '#EBD9B0', strokeDk: '#7D6848', back: '#9C8E7A', backSh: '#7E7262' },
  { base: '#EAEEF2', lt: '#FFFFFF', sh: '#C3CEDB', strokeLt: '#FFFFFF', strokeDk: '#A9B5C5', back: '#D2DAE3', backSh: '#B3C0CF' },
  { base: '#E8B868', lt: '#F6D592', sh: '#C48B4A', strokeLt: '#FCE7B8', strokeDk: '#A86E3A', back: '#D0A36A', backSh: '#B0844F' },
];

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

export function stageSky(hour: number): StageSky {
  const p = skyAt(hour);
  const h = ((hour % 24) + 24) % 24;
  const sunH = Math.sin(((h - 6) / 12) * Math.PI);
  const glow = (1 - p.night) * (1 - Math.max(0, Math.min(1, sunH * 2.4)));
  // 日中は深いセルリアンの空へ寄せる（朝夕・夜はそのまま）
  const k = (1 - p.night) * (1 - glow) * 0.75;
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
