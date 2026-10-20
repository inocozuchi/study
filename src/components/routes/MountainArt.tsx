import { useId } from 'react';

const SKY: [string, string][] = [
  ['#86C3F2', '#FFE6C4'],
  ['#5FA4DE', '#CDEBD8'],
  ['#7387A6', '#D2D9E3'],
  ['#3F78C8', '#DCEBFA'],
  ['#2C3A80', '#FFB487'],
];
const LAND: [string, string, string][] = [
  ['#8FBF8A', '#5E9A62', '#3F7A4C'],
  ['#5E9E78', '#2F6E4E', '#1E4F38'],
  ['#8D97A8', '#5C6678', '#404858'],
  ['#A9BED6', '#6F86A4', '#4D6382'],
  ['#7A6F8E', '#544B6C', '#3A3352'],
];

// 麓から山頂へのつづら折り
const TRAIL: [number, number][] = [
  [28, 132], [78, 120], [62, 108], [118, 96], [102, 84], [152, 70], [140, 58], [178, 44], [170, 36], [204, 24],
];

function pointAt(t: number): [number, number] {
  const segs = TRAIL.slice(1).map((p, i) => {
    const a = TRAIL[i];
    return { a, b: p, len: Math.hypot(p[0] - a[0], p[1] - a[1]) };
  });
  const total = segs.reduce((s, x) => s + x.len, 0);
  let d = Math.max(0, Math.min(1, t)) * total;
  for (const s of segs) {
    if (d <= s.len) {
      const k = d / s.len;
      return [s.a[0] + (s.b[0] - s.a[0]) * k, s.a[1] + (s.b[1] - s.a[1]) * k];
    }
    d -= s.len;
  }
  return TRAIL[TRAIL.length - 1];
}

function partialTrail(t: number) {
  const pts: [number, number][] = [TRAIL[0]];
  const segs = TRAIL.slice(1).map((p, i) => ({ a: TRAIL[i], b: p, len: Math.hypot(p[0] - TRAIL[i][0], p[1] - TRAIL[i][1]) }));
  const total = segs.reduce((s, x) => s + x.len, 0);
  let d = Math.max(0, Math.min(1, t)) * total;
  for (const s of segs) {
    if (d >= s.len) {
      pts.push(s.b);
      d -= s.len;
    } else {
      const k = d / s.len;
      pts.push([s.a[0] + (s.b[0] - s.a[0]) * k, s.a[1] + (s.b[1] - s.a[1]) * k]);
      break;
    }
  }
  return pts.map((p) => p.join(',')).join(' ');
}

/** ステージごとに姿を変える山のイラスト */
export function MountainArt({ stage, color, progress, summited, className = '', showTrail = true }: { stage: number; color: string; progress?: number; summited?: boolean; className?: string; showTrail?: boolean }) {
  const id = useId().replace(/:/g, '');
  const s = Math.max(0, Math.min(4, stage));
  const [sk0, sk1] = SKY[s];
  const [far, mid, near] = LAND[s];
  const snow = s >= 2;
  const trees = s <= 1 ? 14 : s === 2 ? 5 : 0;
  const pos = progress != null ? pointAt(progress) : null;

  return (
    <svg viewBox="0 0 320 140" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sk0} />
          <stop offset="1" stopColor={sk1} />
        </linearGradient>
        <linearGradient id={`mtn-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mid} />
          <stop offset="1" stopColor={near} />
        </linearGradient>
        <radialGradient id={`sun-${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF4D8" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFF4D8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="320" height="140" fill={`url(#sky-${id})`} />
      {s === 4 ? (
        <circle cx="60" cy="58" r="30" fill={`url(#sun-${id})`} />
      ) : (
        <circle cx={s === 0 ? 52 : 270} cy={s === 0 ? 46 : 30} r="22" fill={`url(#sun-${id})`} opacity={s === 2 ? 0.4 : 0.85} />
      )}
      {/* 遠景 */}
      <path d="M0 96 L40 70 L70 82 L110 56 L150 78 L190 60 L230 74 L270 50 L320 72 L320 140 L0 140Z" fill={far} opacity="0.75" />
      {snow && <path d="M110 56 L102 62 L112 64 L118 61Z M270 50 L262 56 L272 58 L278 55Z" fill="#fff" opacity="0.85" />}
      {/* 主峰 */}
      <path d="M-10 140 L60 104 L120 84 L160 58 L204 22 L238 54 L270 70 L330 100 L330 140Z" fill={`url(#mtn-${id})`} />
      {snow && (
        <path
          d={s >= 3 ? 'M204 22 L176 46 L188 44 L194 50 L204 42 L214 50 L222 46 L232 50 Z' : 'M204 22 L190 34 L198 34 L204 38 L210 33 L218 36 Z'}
          fill="#F4F8FF"
        />
      )}
      {s === 3 && <path d="M150 64 L160 58 L172 62 L162 66Z M232 52 L244 58 L236 60Z" fill="#F4F8FF" opacity="0.8" />}
      {/* 樹林 */}
      {Array.from({ length: trees }, (_, i) => {
        const x = 8 + i * (s <= 1 ? 22 : 60) + (i % 3) * 6;
        const y = 132 - (i % 4) * 4;
        const h = 12 + (i % 3) * 4;
        return <path key={i} d={`M${x} ${y - h} L${x + 5} ${y} L${x - 5} ${y}Z`} fill={near} opacity={0.95} />;
      })}
      {/* 霧 */}
      {s === 2 && <rect x="0" y="78" width="320" height="22" fill="#fff" opacity="0.28" rx="11" />}
      {/* 雲海 */}
      {s === 4 && (
        <g fill="#FFE9DA" opacity="0.92">
          <path d="M0 112 Q20 100 40 110 T80 108 T120 112 T160 106 T200 112 T240 106 T280 112 T320 106 L320 140 L0 140Z" />
          <ellipse cx="60" cy="112" rx="40" ry="10" />
          <ellipse cx="250" cy="110" rx="50" ry="10" />
        </g>
      )}
      {/* 登山道 */}
      {showTrail && (
        <>
          <polyline points={TRAIL.map((p) => p.join(',')).join(' ')} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.6" strokeDasharray="2 4" strokeLinecap="round" />
          {progress != null && progress > 0 && <polyline points={partialTrail(progress)} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />}
        </>
      )}
      {summited && (
        <g>
          <path d="M204 22 L204 6" stroke="#fff" strokeWidth="1.5" />
          <path d="M204 6 L216 10 L204 14Z" fill={color} />
        </g>
      )}
      {pos && !summited && (
        <g>
          <circle cx={pos[0]} cy={pos[1]} r="7" fill={color} opacity="0.3" />
          <circle cx={pos[0]} cy={pos[1]} r="3.6" fill="#fff" stroke={color} strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
