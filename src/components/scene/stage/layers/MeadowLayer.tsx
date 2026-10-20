import { memo, useMemo, type MutableRefObject } from 'react';
import { seeded } from '@/lib/id';
import type { StageLayout } from '../layout';
import type { MeadowPalette } from '../palette';
import { HikerRig, type HikerRefs } from '../HikerRig';
import { DogRig, type DogRefs } from '../DogRig';

export interface MeadowRefs {
  backTrack: HTMLDivElement | null;
  texTrack: HTMLDivElement | null;
  dog: HTMLDivElement | null;
  camp: SVGGElement | null;
  seat: SVGGElement | null;
}

/** テクスチャの繰り返し長（斜面に沿った px） */
export const TEX_TILE = 480;
export const BACK_TILE = 720;

/** 斜面座標 (u: 斜面に沿った距離, v: 稜線からの深さ) に並ぶ草・花・筆跡 */
function makeTexture(depth: number, pal: MeadowPalette, seed: number) {
  const r = seeded(seed);
  const items: { u: number; v: number; kind: number; s: number; f: number }[] = [];
  const n = Math.round((depth / 200) * 70);
  for (let i = 0; i < n; i++) {
    const v = 3 + Math.pow(r(), 1.5) * depth;
    items.push({ u: r() * TEX_TILE, v, kind: Math.floor(r() * 10), s: 0.6 + (v / depth) * 1.3, f: r() });
  }
  return { items: items.sort((a, b) => a.v - b.v), pal };
}

function TextureTile({ items, pal, offset }: { items: ReturnType<typeof makeTexture>['items']; pal: MeadowPalette; offset: number }) {
  return (
    <g transform={`translate(${offset} 0)`}>
      {items.map((it, i) => {
        const { u, v, s, f } = it;
        if (it.kind <= 3) {
          // 斜めの筆跡（草の流れ）
          return <path key={i} d={`M${u} ${v} q${8 * s} ${-2 * s} ${16 * s} ${-1 * s}`} stroke={f > 0.5 ? pal.strokeLt : pal.strokeDk} strokeWidth={1.6 * s} strokeLinecap="round" opacity={0.55} fill="none" />;
        }
        if (it.kind <= 7) {
          // 草むら
          return (
            <path
              key={i}
              d={`M${u} ${v} l${-2 * s} ${-8 * s} l${3 * s} ${6 * s} l${1 * s} ${-10 * s} l${1.6 * s} ${9 * s} l${3 * s} ${-7 * s} l${-1 * s} ${9 * s} Z`}
              fill={f > 0.45 ? pal.strokeDk : pal.sh}
              opacity={0.75}
            />
          );
        }
        // 小さな花
        return (
          <g key={i}>
            <path d={`M${u} ${v} l0 ${-6 * s}`} stroke={pal.strokeDk} strokeWidth={0.9 * s} />
            <circle cx={u} cy={v - 6.5 * s} r={1.8 * s} fill={f > 0.5 ? '#FFFFFF' : '#F08A3C'} />
            <circle cx={u} cy={v - 6.5 * s} r={0.7 * s} fill="#E9B63A" />
          </g>
        );
      })}
    </g>
  );
}

export const MeadowLayer = memo(function MeadowLayer({
  L,
  pal,
  refs,
  hikerRefs,
  dogRefs,
  hikerBoxRef,
}: {
  L: StageLayout;
  pal: MeadowPalette;
  refs: MutableRefObject<MeadowRefs>;
  hikerRefs: MutableRefObject<HikerRefs>;
  dogRefs: MutableRefObject<DogRefs>;
  hikerBoxRef: MutableRefObject<HTMLDivElement | null>;
}) {
  const { W, H, tan, angleDeg, hx, gy, k, ground } = L;
  const depth = H - ground(W) + 40;
  const tex = useMemo(() => makeTexture(depth, pal, 77), [depth, pal]);
  const stripLen = W / Math.cos(Math.atan(tan)) + 40;
  const tiles = Math.ceil(stripLen / TEX_TILE) + 1;

  // 奥の丘（ゆっくり流れる周期的な稜線）
  const back = useMemo(() => {
    const r = seeded(5);
    const P = BACK_TILE;
    const ph = [r() * 6, r() * 6, r() * 6];
    const top = (x: number) => H * 0.56 - 18 * Math.sin((x / P) * Math.PI * 2 + ph[0]) - 9 * Math.sin((x / P) * Math.PI * 6 + ph[1]) - 4 * Math.sin((x / P) * Math.PI * 10 + ph[2]);
    let d = `M0 ${H}`;
    for (let x = 0; x <= P; x += 12) d += ` L${x} ${top(x).toFixed(1)}`;
    d += ` L${P} ${H} Z`;
    const trees = Array.from({ length: 9 }, () => {
      const x = r() * P;
      return { x, y: top(x) + 2, h: 14 + r() * 16 };
    });
    return { d, trees, P };
  }, [H]);

  const slope = `M0 ${ground(0)} L${W} ${ground(W)} L${W} ${H} L0 ${H} Z`;
  const tentX = L.tentX;
  const tentY = ground(tentX);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* 奥の丘 */}
      <div className="absolute inset-0">
        <div ref={(el) => { refs.current.backTrack = el; }} className="flex h-full will-change-transform" style={{ width: back.P * Math.ceil((W + back.P) / back.P) }}>
          {Array.from({ length: Math.ceil((W + back.P) / back.P) }, (_, i) => (
            <svg key={i} width={back.P} height={H} viewBox={`0 0 ${back.P} ${H}`} className="block shrink-0">
              <path d={back.d} fill={pal.back} style={{ transition: 'fill 1.5s' }} />
              {/* 空気遠近法：奥の丘を青く霞ませる */}
              <path d={back.d} fill="#9DB8D6" opacity="0.3" />
              {back.trees.map((t, j) => (
                <path key={j} d={`M${t.x} ${t.y - t.h} L${t.x + t.h * 0.3} ${t.y} L${t.x - t.h * 0.3} ${t.y} Z`} fill={pal.backSh} style={{ transition: 'fill 1.5s' }} />
              ))}
            </svg>
          ))}
        </div>
      </div>

      {/* 斜面（静的） */}
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="ft-slope" gradientUnits="userSpaceOnUse" x1="0" y1={ground(W)} x2="0" y2={H}>
            <stop offset="0" stopColor={pal.lt} />
            <stop offset="0.18" stopColor={pal.base} />
            <stop offset="1" stopColor={pal.sh} />
          </linearGradient>
        </defs>
        <g filter="url(#ft-rough)">
          <path d={slope} fill="url(#ft-slope)" />
          {/* 筆で置いた大きな陰影の帯 */}
          <path d={`M0 ${ground(0) + 70} L${W} ${ground(W) + 46} L${W} ${ground(W) + 110} Q${W * 0.5} ${ground(W * 0.5) + 150} 0 ${ground(0) + 130} Z`} fill={pal.sh} opacity="0.35" />
          <path d={`M${W * 0.15} ${ground(W * 0.15) + 18} L${W * 0.8} ${ground(W * 0.8) + 10} L${W * 0.75} ${ground(W * 0.75) + 26} Z`} fill={pal.lt} opacity="0.55" />
          <path d={`M0 ${ground(0)} L${W} ${ground(W)}`} stroke={pal.lt} strokeWidth="3" opacity="0.8" />
        </g>

        {/* キャンプ（休憩中だけ現れる） */}
        <g ref={(el) => { refs.current.camp = el; }} opacity="0">
          <g transform={`translate(${tentX} ${tentY}) scale(${k})`}>
            <ellipse cx="2" cy="1" rx="48" ry="4" fill="#2A1A0A" opacity="0.2" />
            <path d="M-44 0 Q-41 -44 0 -48 Q41 -44 46 0 Z" fill="#E7A83A" />
            <path d="M0 -48 Q41 -44 46 0 L18 0 Q20 -30 0 -48 Z" fill="#C88626" />
            <path d="M-44 0 Q-41 -44 0 -48 L-6 -46 Q-36 -40 -38 0 Z" fill="#F1C35C" />
            <path d="M-20 0 Q-18 -30 0 -32 Q16 -30 18 0 Z" fill="#3E8A55" />
            <path d="M-15 0 Q-13 -24 0 -26 Q12 -24 13 0 Z" fill="#1F3D57" />
            <path d="M-44 0 Q-41 -44 0 -48 Q41 -44 46 0" stroke="#4A3626" strokeWidth="1.4" fill="none" />
            <path d="M0 -48 L-2 -55 M-38 -6 L-62 2 M42 -6 L64 2" stroke="#4A3626" strokeWidth="1" />
          </g>
        </g>
      </svg>

      {/* 草の質感（斜面に沿って後ろへ流れる） */}
      <div className="absolute left-0" style={{ top: ground(0), width: stripLen, height: depth, transform: `rotate(${-angleDeg}deg)`, transformOrigin: '0 0' }}>
        <div ref={(el) => { refs.current.texTrack = el; }} className="will-change-transform" style={{ width: stripLen + TEX_TILE, height: depth }}>
          <svg width={stripLen + TEX_TILE} height={depth} className="block overflow-visible">
            {Array.from({ length: tiles + 1 }, (_, i) => (
              <TextureTile key={i} items={tex.items} pal={pal} offset={i * TEX_TILE} />
            ))}
          </svg>
        </div>
      </div>

      {/* 丸太の腰かけ */}
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`}>
        <g ref={(el) => { refs.current.seat = el; }} opacity="0" transform={`translate(${hx} ${gy}) scale(${k})`}>
          <rect x="-15" y="-11" width="26" height="11" rx="5.5" fill="#7A5134" />
          <rect x="-14" y="-10.4" width="24" height="3" rx="1.5" fill="#9A6B45" />
          <ellipse cx="10.4" cy="-5.5" rx="3" ry="5.5" fill="#C99A6A" />
          <path d="M10.4 -5.5 m-1.2 0 a1.2 1.6 0 1 1 1.2 1.6" stroke="#8A6040" strokeWidth="0.6" fill="none" />
        </g>
      </svg>

      {/* ハイカー */}
      <div ref={hikerBoxRef} className="absolute left-0 top-0" style={{ transform: `translate3d(${hx - 45 * k}px, ${gy - 118 * k}px, 0)` }}>
        <svg width={105 * k} height={124 * k} viewBox="-45 -118 105 124" className="block overflow-visible">
          <HikerRig refs={hikerRefs} />
        </svg>
      </div>

      {/* 犬（手前の草原） */}
      <div ref={(el) => { refs.current.dog = el; }} className="absolute left-0 top-0 will-change-transform">
        <svg width={52 * k * 1.2} height={40 * k * 1.2} viewBox="-26 -36 52 40" className="block overflow-visible" style={{ transform: `translate(${-26 * k * 1.2}px, ${-36 * k * 1.2}px)` }}>
          <DogRig refs={dogRefs} />
        </svg>
      </div>
    </div>
  );
});
