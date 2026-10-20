import { memo, useMemo } from 'react';
import { seeded } from '@/lib/id';
import type { SeasonLook } from '../palette';

const OUT = '#2E221C';

/** 針葉樹：ギザギザの段を積み、右側（日の当たる側）に差し色 */
function Conifer({ seed, snow, lit, dark = '#203A2B', mid = '#2D5038' }: { seed: number; snow: number; lit: string; dark?: string; mid?: string }) {
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
      <path d="M-5 0 L-3.4 -260 L3.4 -260 L5 0 Z" fill="#3B2A20" stroke={OUT} strokeWidth="1.6" />
      {tiers.map(({ yt, yb, w, j }, i) => (
        <g key={i}>
          <path
            d={`M0 ${yt} L${w * 0.45} ${yb - 16} L${w * 0.3} ${yb - 14} L${w} ${yb} L${w * 0.5} ${yb - 6} L0 ${yb + 2} L${-w * 0.55} ${yb - 5} L${-w} ${yb - 1} L${-w * 0.35} ${yb - 15} L${-w * 0.5} ${yb - 17} Z`}
            fill={i % 2 ? dark : mid}
            stroke={OUT}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d={`M${2 + j * 3} ${yt + 10} L${w * 0.45} ${yb - 16} L${w * 0.3} ${yb - 14} L${w} ${yb} L${w * 0.55} ${yb - 9} Z`} fill={lit} opacity={0.55 + j * 0.35} />
          <path d={`M${-w * 0.7} ${yb - 6} l8 -8 M${-w * 0.45} ${yb - 4} l9 -9 M${-w * 0.2} ${yb - 2} l8 -8`} stroke="#0E1A12" strokeWidth="1.4" opacity="0.35" strokeLinecap="round" />
          {snow > 0 && <path d={`M0 ${yt} L${w * 0.42} ${yb - 18} L${w * 0.1} ${yb - 22} L${-w * 0.45} ${yb - 19} Z`} fill="#F4F7FB" opacity={snow} />}
        </g>
      ))}
    </g>
  );
}

/** 広葉樹（白樺）：白い幹に黒い節、季節の葉の塊。冬は裸木 */
function Birch({ seed, h = 320, look }: { seed: number; h?: number; look: SeasonLook }) {
  const { marks, blobs, twigs } = useMemo(() => {
    const r = seeded(seed);
    const marks = Array.from({ length: 14 }, () => ({ y: -r() * h * 0.9, w: 3 + r() * 5, s: r() > 0.5 ? 1 : -1 }));
    const blob = (cx: number, cy: number, rx: number, ry: number) => {
      const n = 16;
      const pts = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        const k = i % 2 ? 0.72 + r() * 0.16 : 0.9 + r() * 0.2; // 葉先のギザギザ
        return `${(cx + Math.cos(a) * rx * k).toFixed(1)} ${(cy + Math.sin(a) * ry * k).toFixed(1)}`;
      });
      return `M${pts.join(' L')} Z`;
    };
    const blobs = [
      [0, -h * 0.86, 62, 44],
      [-34, -h * 0.7, 48, 34],
      [30, -h * 0.66, 52, 36],
      [-6, -h * 0.55, 44, 30],
    ].map(([cx, cy, rx, ry]) => ({ d: blob(cx, cy, rx, ry), hi: blob(cx + rx * 0.22, cy - ry * 0.25, rx * 0.6, ry * 0.52), sh: blob(cx - rx * 0.2, cy + ry * 0.3, rx * 0.7, ry * 0.45) }));
    const twigs = Array.from({ length: 9 }, (_, i) => {
      const y = -h * (0.45 + i * 0.055);
      const s = i % 2 ? 1 : -1;
      const len = 22 + r() * 34;
      return `M0 ${y} q${s * len * 0.5} ${-len * 0.2} ${s * len} ${-len * 0.6} M${s * len * 0.6} ${y - len * 0.3} l${s * 8} -10`;
    });
    return { marks, blobs, twigs };
  }, [seed, h]);
  const f = look.foliage;
  return (
    <g>
      <path d={`M-5.5 0 Q-7 ${-h * 0.5} -2.4 ${-h} L2.4 ${-h} Q3 ${-h * 0.5} 5.5 0 Z`} fill="#ECE5D4" stroke={OUT} strokeWidth="1.6" />
      <path d={`M1.6 0 Q2.6 ${-h * 0.5} 1 ${-h} L2.4 ${-h} Q3 ${-h * 0.5} 5.5 0 Z`} fill="#C9C0AC" />
      {marks.map((m, i) => (
        <path key={i} d={`M${m.s > 0 ? -5 : 1} ${m.y} l${m.w} ${m.s * 0.8} l0 1.4 l${-m.w} 0 Z`} fill={OUT} />
      ))}
      {f ? (
        <>
          <path d={`M0 ${-h * 0.6} Q-18 ${-h * 0.68} -30 ${-h * 0.74} M0 ${-h * 0.52} Q16 ${-h * 0.58} 32 ${-h * 0.62}`} stroke="#5B4A3C" strokeWidth="2.4" fill="none" />
          {blobs.map((b, i) => (
            <g key={i}>
              <path d={b.d} fill={f.base} stroke={OUT} strokeWidth="1.8" strokeLinejoin="round" />
              <path d={b.sh} fill={f.sh} opacity="0.85" />
              <path d={b.hi} fill={f.hi} />
            </g>
          ))}
        </>
      ) : (
        <>
          {twigs.map((d, i) => <path key={i} d={d} stroke="#4A3A2E" strokeWidth={2.4 - i * 0.12} fill="none" strokeLinecap="round" />)}
          {twigs.slice(0, 6).map((d, i) => <path key={`s${i}`} d={d} stroke="#F4F7FB" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" transform="translate(0 -1.4)" />)}
        </>
      )}
    </g>
  );
}

interface TreeSpec {
  kind: 'conifer' | 'birch';
  x: number;
  y: number;
  scale: number;
  seed: number;
  dur: number;
  delay: number;
  h?: number;
}

/** 1 本ずつ独立した合成レイヤー（div + フィルタ済み SVG）。揺れは div の回転だけなのでフィルタは再計算されない */
function Tree({ t, look }: { t: TreeSpec; look: SeasonLook }) {
  const th = t.h ?? 320;
  const w = 170 * t.scale;
  const hh = (th + 30) * t.scale;
  return (
    <div
      className="ft-sway-div absolute"
      style={{ left: t.x - w / 2, top: t.y - hh, width: w, height: hh, animationDuration: `${t.dur}s`, animationDelay: `${t.delay}s` }}
    >
      <svg width={w} height={hh} viewBox={`-85 ${-th - 30} 170 ${th + 30}`} className="block overflow-visible">
        <g filter="url(#crayon)">
          {t.kind === 'conifer' ? <Conifer seed={t.seed} snow={look.snow} lit={look.coniferLit} /> : <Birch seed={t.seed} h={th} look={look} />}
        </g>
      </svg>
    </div>
  );
}

/** Layer 3：画面の左右からフレームインする木々（風でわずかに揺れる） */
export const TreeLayer = memo(function TreeLayer({ W, H, look }: { W: number; H: number; look: SeasonLook }) {
  const narrow = W < 600;
  const s = Math.max(0.85, Math.min(1.7, H / 640)) * (narrow ? 0.74 : 1);
  const trees: TreeSpec[] = [
    { kind: 'birch', x: W * (narrow ? 0.1 : 0.08), y: H * 0.68, scale: s * 0.95, seed: 5, dur: 7.5, delay: 0, h: 310 },
    { kind: 'conifer', x: W * (narrow ? -0.02 : 0.02), y: H * 0.74, scale: s * 1.25, seed: 7, dur: 9, delay: -2 },
    { kind: 'conifer', x: W * (narrow ? 0.92 : 0.9), y: H * 0.64, scale: s * 0.75, seed: 13, dur: 8, delay: -4 },
    { kind: 'birch', x: W * (narrow ? 1.04 : 0.97), y: H * 0.7, scale: s * 1.1, seed: 17, dur: 6.8, delay: -1, h: 330 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {trees.map((t, i) => <Tree key={i} t={t} look={look} />)}
    </div>
  );
});
