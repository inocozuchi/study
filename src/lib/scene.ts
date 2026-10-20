import type { SkyOverride } from '@/types';

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function rgba(c: RGB, a = 1) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}

interface SkyKey {
  h: number;
  top: string;
  mid: string;
  bot: string;
  land: string;
  haze: string;
  night: number;
}

const KEYS: SkyKey[] = [
  { h: 0, top: '#04060F', mid: '#0A1129', bot: '#18203F', land: '#070B18', haze: '#1A2244', night: 1 },
  { h: 4.6, top: '#060A1C', mid: '#121A3A', bot: '#2B2852', land: '#0A0E20', haze: '#282A50', night: 0.95 },
  { h: 5.6, top: '#1E2A5C', mid: '#6E5784', bot: '#F5A27C', land: '#1E1B33', haze: '#8A6A8C', night: 0.35 },
  { h: 6.8, top: '#4A7FC0', mid: '#A9C4E0', bot: '#FFDDB8', land: '#2B3B4C', haze: '#B6C3D4', night: 0 },
  { h: 9, top: '#2C78D2', mid: '#6BB0EE', bot: '#D2EBFC', land: '#24394C', haze: '#A9C7E2', night: 0 },
  { h: 13, top: '#2770CC', mid: '#5CA6EE', bot: '#C4E4FB', land: '#22384A', haze: '#A5C6E6', night: 0 },
  { h: 16, top: '#3577C2', mid: '#7DB3E2', bot: '#EDE6D2', land: '#2A3646', haze: '#BDC6CF', night: 0 },
  { h: 17.6, top: '#2C4C8C', mid: '#C77A92', bot: '#FFB46E', land: '#2C2438', haze: '#C98A8A', night: 0.05 },
  { h: 18.6, top: '#1B2558', mid: '#6C4280', bot: '#F0805E', land: '#1D1830', haze: '#7A4A6E', night: 0.35 },
  { h: 19.6, top: '#0C1336', mid: '#2B2558', bot: '#5D3C6C', land: '#0D0F24', haze: '#3A2E58', night: 0.8 },
  { h: 21, top: '#050917', mid: '#0D1431', bot: '#1C2246', land: '#080C1C', haze: '#1E2548', night: 1 },
  { h: 24, top: '#04060F', mid: '#0A1129', bot: '#18203F', land: '#070B18', haze: '#1A2244', night: 1 },
];

const PARSED = KEYS.map((k) => ({
  h: k.h,
  top: hexToRgb(k.top),
  mid: hexToRgb(k.mid),
  bot: hexToRgb(k.bot),
  land: hexToRgb(k.land),
  haze: hexToRgb(k.haze),
  night: k.night,
}));

export interface SkyPalette {
  top: RGB;
  mid: RGB;
  bot: RGB;
  land: RGB;
  haze: RGB;
  /** 0=昼 1=夜 */
  night: number;
  /** 地表の明るさ 0..1 */
  light: number;
  sun: RGB;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

export function skyAt(hour: number): SkyPalette {
  const h = ((hour % 24) + 24) % 24;
  let i = 0;
  while (i < PARSED.length - 2 && PARSED[i + 1].h <= h) i++;
  const a = PARSED[i];
  const b = PARSED[i + 1];
  const t = smooth((h - a.h) / (b.h - a.h));
  const night = a.night + (b.night - a.night) * t;
  // 太陽色：地平線付近は橙
  const sunHeight = Math.sin(((h - 6) / 12) * Math.PI);
  const sun = mix(hexToRgb('#FF9E5E'), hexToRgb('#FFF6DD'), Math.max(0, Math.min(1, sunHeight * 2.2)));
  return {
    top: mix(a.top, b.top, t),
    mid: mix(a.mid, b.mid, t),
    bot: mix(a.bot, b.bot, t),
    land: mix(a.land, b.land, t),
    haze: mix(a.haze, b.haze, t),
    night,
    light: 1 - night * 0.82,
    sun,
  };
}

export function hourFor(sky: SkyOverride, now = new Date()): number {
  switch (sky) {
    case 'dawn':
      return 6.1;
    case 'day':
      return 11.5;
    case 'sunset':
      return 18.1;
    case 'night':
      return 22.5;
    default:
      return now.getHours() + now.getMinutes() / 60;
  }
}

export function timeOfDayLabel(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  if (h < 4.5) return '星空';
  if (h < 7) return '夜明け';
  if (h < 11) return '朝';
  if (h < 16) return '昼';
  if (h < 19) return '夕暮れ';
  if (h < 21) return '宵';
  return '星空';
}
