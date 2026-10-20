import { forwardRef, memo, useMemo } from 'react';
import { Baked } from '../Baked';
import { seeded } from '@/lib/id';

interface Band {
  ridge: string;
  facets: string[];
  snow: string[];
  snowSh: string[];
}

/** 周期 P で継ぎ目なく繰り返す峰々を生成 */
function makeBand(P: number, H: number, seed: number, topMin: number, topMax: number, base: number, count: number): Band {
  const r = seeded(seed);
  const pts: { x: number; y: number; summit: boolean }[] = [];
  const saddleY = () => H * (base - 0.06 - r() * 0.05);
  const y0 = saddleY();
  pts.push({ x: 0, y: y0, summit: false });
  for (let i = 0; i < count; i++) {
    const cx = ((i + 0.5) / count) * P + (r() - 0.5) * (P / count) * 0.5;
    pts.push({ x: cx, y: H * (topMin + r() * (topMax - topMin)), summit: true });
    if (i < count - 1) pts.push({ x: ((i + 1) / count) * P + (r() - 0.5) * 30, y: saddleY(), summit: false });
  }
  pts.push({ x: P, y: y0, summit: false });

  const baseY = H * base;
  const ridge = `M0 ${H} L${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')} L${P} ${H} Z`;
  const facets: string[] = [];
  const snow: string[] = [];
  const snowSh: string[] = [];
  pts.forEach((p, i) => {
    if (!p.summit) return;
    const L = pts[i - 1];
    const R = pts[i + 1];
    const hgt = baseY - p.y;
    // 右からの日差しを受ける斜面（筆で置いたような面）
    const qx = p.x + (R.x - p.x) * (0.12 + r() * 0.15);
    facets.push(`M${p.x} ${p.y} L${R.x} ${R.y} L${R.x - 6} ${baseY} L${qx} ${baseY} Z`);
    const mx = p.x - (p.x - L.x) * 0.45;
    facets.push(`M${p.x} ${p.y} L${mx} ${p.y + hgt * 0.55} L${mx + 10} ${p.y + hgt * 0.58} L${p.x + 4} ${p.y + hgt * 0.2} Z`);
    // 万年雪
    const s = 0.22 + r() * 0.16;
    const lx = p.x - (p.x - L.x) * s;
    const ly = p.y + (L.y - p.y) * s;
    const rx = p.x + (R.x - p.x) * (s + 0.06);
    const ry = p.y + (R.y - p.y) * (s + 0.06);
    const j = hgt * 0.06;
    snow.push(`M${p.x} ${p.y} L${rx} ${ry} L${rx - 8} ${ry + j * 0.4} L${p.x + (rx - p.x) * 0.55} ${ry - j * 0.2} L${p.x + 2} ${ry + j} L${p.x - (p.x - lx) * 0.4} ${ly + j * 0.3} L${lx} ${ly} Z`);
    snowSh.push(`M${p.x} ${p.y} L${p.x - (p.x - lx) * 0.9} ${ly - j * 0.2} L${p.x - (p.x - lx) * 0.4} ${ly + j * 0.3} L${p.x + 1} ${ly + j * 0.8} Z`);
  });
  return { ridge, facets, snow, snowSh };
}

/** Layer 2：空気遠近法で青く霞む遠景の山脈。一度キャンバスに焼き、トラックを translate して極めてゆっくり流す */
export const MountainLayer = memo(
  forwardRef<HTMLDivElement, { W: number; H: number; snow: number }>(function MountainLayer({ W, H, snow }, ref) {
    const P = Math.max(W, 900);
    const { far, near } = useMemo(
      () => ({
        far: makeBand(P, H, 11, 0.33, 0.43, 0.64, 5),
        near: makeBand(P, H, 23, 0.42, 0.5, 0.68, 4),
      }),
      [P, H],
    );
    const snowAmt = Math.max(0.85, snow);
    const tile = (
      <svg width={P} height={H} viewBox={`0 0 ${P} ${H}`} className="block shrink-0">
        <defs>
          <linearGradient id="ft-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.45" stopColor="#CFE0EE" stopOpacity="0" />
            <stop offset="0.7" stopColor="#CFE0EE" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <g filter="url(#crayon)">
        {/* 遠い稜線：大気の青灰色 */}
        <path d={far.ridge} fill="#9DB3CB" />
        {far.facets.map((d, i) => <path key={i} d={d} fill={i % 2 ? '#8AA1BC' : '#BFD0E1'} />)}
        {far.snow.map((d, i) => <path key={i} d={d} fill="#EEF3F8" opacity={snowAmt} />)}
        {far.snowSh.map((d, i) => <path key={i} d={d} fill="#C6D4E4" opacity={snowAmt} />)}
        <rect x="0" y="0" width={P} height={H} fill="url(#ft-haze)" />
        {/* 手前の稜線 */}
        <path d={near.ridge} fill="#6F8DAF" />
        {near.facets.map((d, i) => <path key={i} d={d} fill={i % 2 ? '#5E7B9E' : '#93AECB'} />)}
        {near.snow.map((d, i) => <path key={i} d={d} fill="#F3F6FA" opacity={snowAmt} />)}
        {near.snowSh.map((d, i) => <path key={i} d={d} fill="#B9C9DB" opacity={snowAmt} />)}
        <rect x="0" y={H * 0.5} width={P} height={H * 0.5} fill="url(#ft-haze)" opacity="0.7" />
        </g>
      </svg>
    );
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div ref={ref} className="h-full will-change-transform" style={{ width: P * 2 }}>
          <Baked width={P} height={H} repeat={2} bakeKey={snowAmt}>
            {tile}
          </Baked>
        </div>
      </div>
    );
  }),
);
