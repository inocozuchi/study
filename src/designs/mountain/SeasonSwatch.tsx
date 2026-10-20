import { SEASONS } from './scene/palette';
import type { Season } from '@/types';

/** 季節の小さな風景（クレヨン調） */
export function SeasonSwatch({ season, className = '' }: { season: Season; className?: string }) {
  const look = SEASONS[season];
  const sky = season === 'winter' ? ['#9FB8D6', '#E6EEF6'] : season === 'summer' ? ['#2E78C8', '#9ED3F2'] : season === 'sakura' ? ['#7FB6E6', '#F6DCE6'] : season === 'autumn' ? ['#3A7CC4', '#F2D9A8'] : ['#6FAEE6', '#DDEFC8'];
  const id = `sw-${season}`;
  const leaf = look.foliage;
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <g filter="url(#crayon-soft)">
        <rect width="64" height="48" fill={`url(#${id})`} />
        <path d="M0 30 L14 18 L22 24 L34 12 L48 26 L64 20 L64 48 L0 48 Z" fill="#8FA7C2" />
        <path d="M34 12 L29 17 L33 17 L36 15 Z" fill="#F4F7FB" />
        <path d="M0 40 L64 30 L64 48 L0 48 Z" fill={look.meadow.base} stroke="#2E221C" strokeWidth="0.8" />
        <path d="M50 33 L50 22" stroke="#4A3A2E" strokeWidth="1.6" />
        {leaf ? <circle cx="50" cy="20" r="7" fill={leaf.base} stroke="#2E221C" strokeWidth="0.8" /> : <path d="M50 24 l-5 -6 M50 22 l5 -5" stroke="#4A3A2E" strokeWidth="1" />}
        {look.dots.slice(0, 3).map((c, i) => <circle key={i} cx={12 + i * 9} cy={42 - i} r="1.4" fill={c} />)}
        {season === 'winter' && [8, 22, 40, 56].map((x, i) => <circle key={x} cx={x} cy={8 + i * 5} r="1.2" fill="#fff" />)}
      </g>
    </svg>
  );
}
