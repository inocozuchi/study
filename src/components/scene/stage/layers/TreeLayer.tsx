import { memo, useMemo } from 'react';
import { seeded } from '@/lib/id';

/** 針葉樹：ギザギザの段を積み、右側（日の当たる側）にオレンジの差し色 */
function Conifer({ seed, snow, dark = '#203A2B', mid = '#2D5038', lit = '#D98A2E' }: { seed: number; snow: number; dark?: string; mid?: string; lit?: string }) {
  const tiers = useMemo(() => {
    const r = seeded(seed);
    const n = 9;
    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1);
      const yt = -300 + i * 29 - r() * 6;
      const yb = yt + 52 + r() * 8;
      const w = 10 + t * 46 + r() * 6;
      return { yt, yb, w, j: r() };
    });
  }, [seed]);
  return (
    <g>
      <path d="M-5 0 L-3.4 -260 L3.4 -260 L5 0 Z" fill="#3B2A20" />
      {tiers.map(({ yt, yb, w, j }, i) => (
        <g key={i}>
          <path d={`M0 ${yt} L${w * 0.45} ${yb - 16} L${w * 0.3} ${yb - 14} L${w} ${yb} L${w * 0.5} ${yb - 6} L0 ${yb + 2} L${-w * 0.55} ${yb - 5} L${-w} ${yb - 1} L${-w * 0.35} ${yb - 15} L${-w * 0.5} ${yb - 17} Z`} fill={i % 2 ? dark : mid} />
          <path d={`M${2 + j * 3} ${yt + 10} L${w * 0.45} ${yb - 16} L${w * 0.3} ${yb - 14} L${w} ${yb} L${w * 0.55} ${yb - 9} Z`} fill={lit} opacity={0.55 + j * 0.35} />
          {snow > 0 && <path d={`M0 ${yt} L${w * 0.42} ${yb - 18} L${w * 0.1} ${yb - 22} L${-w * 0.45} ${yb - 19} Z`} fill="#F4F7FB" opacity={snow} />}
        </g>
      ))}
    </g>
  );
}

/** 白樺：白い幹に黒い節、黄金色の葉の塊 */
function Birch({ seed, h = 320, snow }: { seed: number; h?: number; snow: number }) {
  const { marks, blobs } = useMemo(() => {
    const r = seeded(seed);
    const marks = Array.from({ length: 14 }, () => ({ y: -r() * h * 0.9, w: 3 + r() * 5, s: r() > 0.5 ? 1 : -1 }));
    const blob = (cx: number, cy: number, rx: number, ry: number) => {
      const n = 14;
      const pts = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const k = 0.78 + r() * 0.34;
        return `${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)}`;
      });
      return `M${pts.join(' L')} Z`;
    };
    const blobs = [
      [0, -h * 0.86, 62, 44],
      [-34, -h * 0.7, 48, 34],
      [30, -h * 0.66, 52, 36],
      [-6, -h * 0.55, 44, 30],
    ].map(([cx, cy, rx, ry]) => ({ d: blob(cx, cy, rx, ry), hi: blob(cx + rx * 0.22, cy - ry * 0.25, rx * 0.62, ry * 0.55), sh: blob(cx - rx * 0.2, cy + ry * 0.3, rx * 0.7, ry * 0.45) }));
    return { marks, blobs };
  }, [seed, h]);
  return (
    <g>
      <path d={`M-5.5 0 Q-7 ${-h * 0.5} -2.4 ${-h} L2.4 ${-h} Q3 ${-h * 0.5} 5.5 0 Z`} fill="#ECE5D4" />
      <path d={`M1.6 0 Q2.6 ${-h * 0.5} 1 ${-h} L2.4 ${-h} Q3 ${-h * 0.5} 5.5 0 Z`} fill="#C9C0AC" />
      {marks.map((m, i) => (
        <path key={i} d={`M${m.s > 0 ? -5 : 1} ${m.y} l${m.w} ${m.s * 0.8} l0 1.4 l${-m.w} 0 Z`} fill="#2C2A28" />
      ))}
      <path d={`M0 ${-h * 0.6} Q-18 ${-h * 0.68} -30 ${-h * 0.74} M0 ${-h * 0.52} Q16 ${-h * 0.58} 32 ${-h * 0.62}`} stroke="#5B4A3C" strokeWidth="2.4" fill="none" />
      {blobs.map((b, i) => (
        <g key={i}>
          <path d={b.d} fill="#E4B23A" />
          <path d={b.sh} fill="#BE8A22" opacity="0.8" />
          <path d={b.hi} fill="#F6D86A" />
          {snow > 0 && <path d={b.hi} fill="#F7F9FC" opacity={snow * 0.85} />}
        </g>
      ))}
    </g>
  );
}

/** Layer 3：画面の左右からフレームインする木々（風でわずかに揺れる） */
export const TreeLayer = memo(function TreeLayer({ W, H, stage }: { W: number; H: number; stage: number }) {
  const snow = stage >= 3 ? 0.9 : 0;
  const narrow = W < 600;
  const s = Math.max(0.85, Math.min(1.7, H / 640)) * (narrow ? 0.74 : 1);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`}>
        {/* 揺れる要素にフィルタをかけると毎フレーム再計算になるため、木は形そのものをギザギザに描く */}
        <g>
          {/* 左 */}
          <g transform={`translate(${W * (narrow ? 0.1 : 0.08)} ${H * 0.68}) scale(${s * 0.95})`}>
            <g className="ft-sway" style={{ animationDuration: '7.5s' }}>
              <Birch seed={5} h={310} snow={snow} />
            </g>
          </g>
          <g transform={`translate(${W * (narrow ? -0.02 : 0.02)} ${H * 0.74}) scale(${s * 1.25})`}>
            <g className="ft-sway" style={{ animationDuration: '9s', animationDelay: '-2s' }}>
              <Conifer seed={7} snow={snow} />
            </g>
          </g>
          {/* 右 */}
          <g transform={`translate(${W * (narrow ? 0.92 : 0.9)} ${H * 0.64}) scale(${s * 0.75})`}>
            <g className="ft-sway" style={{ animationDuration: '8s', animationDelay: '-4s' }}>
              <Conifer seed={13} snow={snow} dark="#25402F" mid="#36583C" lit="#E3A03A" />
            </g>
          </g>
          <g transform={`translate(${W * (narrow ? 1.04 : 0.97)} ${H * 0.7}) scale(${s * 1.1})`}>
            <g className="ft-sway" style={{ animationDuration: '6.8s', animationDelay: '-1s' }}>
              <Birch seed={17} h={330} snow={snow} />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
});
