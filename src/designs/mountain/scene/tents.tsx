import type { ReactElement } from 'react';

/**
 * 選べるテント。どれも viewBox "-70 -62 140 70"（地面 y=0、中心 x=0）に描き、
 * 草原では Baked でクレヨンのフィルタごと画像に焼く。縁は塗りより少し濃いパステル色。
 */
export interface TentStyle {
  name: string;
  art: ReactElement;
}

const edge = { strokeLinejoin: 'round' as const, strokeDasharray: '7 1.6' };

export const TENTS: TentStyle[] = [
  {
    name: 'ドーム',
    art: (
      <g>
        <ellipse cx="2" cy="1" rx="48" ry="4" fill="#4A3426" opacity="0.16" />
        <path d="M-44 0 Q-41 -44 0 -48 Q41 -44 46 0 Z" fill="#E9C07A" />
        <path d="M0 -48 Q41 -44 46 0 L18 0 Q20 -30 0 -48 Z" fill="#CFA262" />
        <path d="M-44 0 Q-41 -44 0 -48 L-6 -46 Q-36 -40 -38 0 Z" fill="#F3D594" />
        <path d="M-20 0 Q-18 -30 0 -32 Q16 -30 18 0 Z" fill="#8FBFAE" />
        <path d="M-15 0 Q-13 -24 0 -26 Q12 -24 13 0 Z" fill="#5E7F8F" />
        <path d="M-44 0 Q-41 -44 0 -48 Q41 -44 46 0 Z" stroke="#B88E52" strokeWidth="1.8" fill="none" {...edge} />
        <path d="M24 -36 l6 -6 M28 -28 l8 -8 M32 -20 l9 -9 M36 -12 l8 -8" stroke="#A9834F" strokeWidth="1" opacity="0.45" strokeLinecap="round" />
        <path d="M0 -48 L-2 -55 M-38 -6 L-62 2 M42 -6 L64 2" stroke="#9A7A5E" strokeWidth="1" />
      </g>
    ),
  },
  {
    name: '三角',
    art: (
      <g>
        <ellipse cx="2" cy="1" rx="50" ry="4" fill="#4A3426" opacity="0.16" />
        <path d="M-46 0 L0 -50 L46 0 Z" fill="#D98A6C" />
        <path d="M0 -50 L46 0 L14 0 Z" fill="#B96F55" />
        <path d="M-46 0 L0 -50 L-6 -42 L-36 0 Z" fill="#E8A88C" />
        <path d="M-16 0 L0 -30 L16 0 Z" fill="#F4ECDC" />
        <path d="M-10 0 L0 -20 L10 0 Z" fill="#6E5646" />
        <path d="M-46 0 L0 -50 L46 0 Z" stroke="#A9654D" strokeWidth="1.8" fill="none" {...edge} />
        <path d="M14 -18 l6 -6 M20 -10 l8 -8 M26 -3 l7 -7" stroke="#9C5A44" strokeWidth="1" opacity="0.45" strokeLinecap="round" />
        <path d="M0 -50 L0 -57 M-46 0 L-64 2 M46 0 L64 2 M0 -50 L-30 -2 M0 -50 L30 -2" stroke="#9A7A5E" strokeWidth="0.9" opacity="0.8" />
      </g>
    ),
  },
  {
    name: 'ティピー',
    art: (
      <g>
        <ellipse cx="2" cy="1" rx="40" ry="3.6" fill="#4A3426" opacity="0.16" />
        <path d="M-4 -54 L-10 -61 M4 -54 L11 -61 M0 -54 L1 -62" stroke="#8C705C" strokeWidth="2" strokeLinecap="round" />
        <path d="M-36 0 L0 -54 L36 0 Z" fill="#F1E6CC" />
        <path d="M0 -54 L36 0 L12 0 Z" fill="#DCCDAE" />
        <path d="M-24.7 -17 L24.7 -17 L28.7 -11 L-28.7 -11 Z" fill="#8FBFAE" />
        <path d="M-15.3 -31 L15.3 -31 L17.9 -27 L-17.9 -27 Z" fill="#E39A8A" />
        <path d="M-14 0 Q-6 -16 0 -26 Q6 -16 14 0 Z" fill="#6E8F86" />
        <path d="M0 -26 Q-4 -12 -14 0 L-18 0 Q-8 -14 0 -26 Z" fill="#F1E6CC" />
        <path d="M-36 0 L0 -54 L36 0 Z" stroke="#BBA982" strokeWidth="1.8" fill="none" {...edge} />
        <path d="M-36 0 L-58 2 M36 0 L58 2" stroke="#9A7A5E" strokeWidth="0.9" opacity="0.8" />
      </g>
    ),
  },
];

export function tentAt(i: number | undefined) {
  return TENTS[Math.max(0, Math.min(TENTS.length - 1, i ?? 0))];
}
