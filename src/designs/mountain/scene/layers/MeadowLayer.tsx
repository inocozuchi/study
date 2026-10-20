import { memo, useMemo, type MutableRefObject } from 'react';
import { seeded } from '@/lib/id';
import type { StageLayout } from '../layout';
import type { MeadowPalette, SeasonLook } from '../palette';
import { HikerRig, type HikerRefs } from '../HikerRig';
import { Baked } from '../Baked';
import { DogRig, type DogRefs } from '../DogRig';
import { HIKER_PALETTES } from '../HikerRig';
import { tentAt } from '../tents';

export interface MeadowRefs {
  backTrack: HTMLDivElement | null;
  texTrack: HTMLDivElement | null;
  dog: HTMLDivElement | null;
  camp: HTMLDivElement | null;
  seat: HTMLDivElement | null;
}

/** テクスチャの繰り返し長（斜面に沿った px） */
export const TEX_TILE = 480;
export const BACK_TILE = 720;

/** 斜面座標 (u: 斜面に沿った距離, v: 稜線からの深さ) に並ぶ草・花・筆跡 */
function makeTexture(depth: number, pal: MeadowPalette, seed: number, dots: string[]) {
  const r = seeded(seed);
  const items: { u: number; v: number; kind: number; s: number; f: number }[] = [];
  const n = Math.round((depth / 200) * 70);
  for (let i = 0; i < n; i++) {
    const v = 3 + Math.pow(r(), 1.5) * depth;
    items.push({ u: r() * TEX_TILE, v, kind: Math.floor(r() * 10), s: 0.6 + (v / depth) * 1.3, f: r() });
  }
  return { items: items.sort((a, b) => a.v - b.v), pal, dots };
}

function TextureTile({ items, pal, dots, offset }: { items: ReturnType<typeof makeTexture>['items']; pal: MeadowPalette; dots: string[]; offset: number }) {
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
            <circle cx={u} cy={v - 6.5 * s} r={1.8 * s} fill={dots[Math.floor(f * dots.length) % dots.length]} stroke="#2E221C" strokeWidth={0.4 * s} />
            <circle cx={u} cy={v - 6.5 * s} r={0.7 * s} fill="#E9B63A" />
          </g>
        );
      })}
    </g>
  );
}

export const MeadowLayer = memo(function MeadowLayer({
  L,
  look,
  refs,
  hikerRefs,
  dogRefs,
  hikerBoxRef,
  hikerLook = 0,
  tent = 0,
}: {
  L: StageLayout;
  hikerLook?: number;
  tent?: number;
  look: SeasonLook;
  refs: MutableRefObject<MeadowRefs>;
  hikerRefs: MutableRefObject<HikerRefs>;
  dogRefs: MutableRefObject<DogRefs>;
  hikerBoxRef: MutableRefObject<HTMLDivElement | null>;
}) {
  const pal = look.meadow;
  const { W, H, tan, angleDeg, hx, gy, k, ground } = L;
  const depth = H - ground(W) + 40;
  const tex = useMemo(() => makeTexture(depth, pal, 77, look.dots), [depth, pal, look.dots]);
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

  const nBack = Math.ceil((W + back.P) / back.P);
  const seasonKey = look.label;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* 奥の丘（焼き込んだタイルを流す） */}
      <div className="absolute inset-0">
        <div ref={(el) => { refs.current.backTrack = el; }} className="h-full will-change-transform" style={{ width: back.P * nBack }}>
          <Baked width={back.P} height={H} repeat={nBack} bakeKey={seasonKey}>
            <svg viewBox={`0 0 ${back.P} ${H}`}>
              <g filter="url(#crayon)">
                <path d={back.d} fill={pal.back} />
                {/* 空気遠近法：奥の丘を青く霞ませる */}
                <path d={back.d} fill="#9DB8D6" opacity="0.3" />
                {back.trees.map((t, j) => (
                  <path key={j} d={`M${t.x} ${t.y - t.h} L${t.x + t.h * 0.3} ${t.y} L${t.x - t.h * 0.3} ${t.y} Z`} fill={pal.backSh} />
                ))}
              </g>
            </svg>
          </Baked>
        </div>
      </div>

      {/* 斜面（静的。焼き込み） */}
      <Baked width={W} height={H} bakeKey={seasonKey} className="absolute inset-0">
        <svg viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id="ft-slope" gradientUnits="userSpaceOnUse" x1="0" y1={ground(W)} x2="0" y2={H}>
              <stop offset="0" stopColor={pal.lt} />
              <stop offset="0.18" stopColor={pal.base} />
              <stop offset="1" stopColor={pal.sh} />
            </linearGradient>
          </defs>
          <g filter="url(#crayon)">
            <path d={slope} fill="url(#ft-slope)" />
            {/* 筆で置いた大きな陰影の帯 */}
            <path d={`M0 ${ground(0) + 70} L${W} ${ground(W) + 46} L${W} ${ground(W) + 110} Q${W * 0.5} ${ground(W * 0.5) + 150} 0 ${ground(0) + 130} Z`} fill={pal.sh} opacity="0.35" />
            <path d={`M${W * 0.15} ${ground(W * 0.15) + 18} L${W * 0.8} ${ground(W * 0.8) + 10} L${W * 0.75} ${ground(W * 0.75) + 26} Z`} fill={pal.lt} opacity="0.55" />
            <path d={`M0 ${ground(0)} L${W} ${ground(W)}`} stroke={pal.lt} strokeWidth="3" opacity="0.8" />
          </g>
        </svg>
      </Baked>

      {/* キャンプ（休憩中だけ現れる。濃さは div の opacity だけを毎フレーム変える） */}
      <div
        ref={(el) => { refs.current.camp = el; }}
        className="absolute"
        style={{ left: tentX - 70 * k, top: tentY - 62 * k, width: 140 * k, height: 70 * k, opacity: 0 }}
      >
        <Baked width={Math.round(140 * k)} height={Math.round(70 * k)} bakeKey={tent}>
          <svg viewBox="-70 -62 140 70">
            <g filter="url(#crayon)">{tentAt(tent).art}</g>
          </svg>
        </Baked>
      </div>

      {/* 草の質感（斜面に沿って後ろへ流れる） */}
      <div className="absolute left-0" style={{ top: ground(0), width: stripLen, height: depth, transform: `rotate(${-angleDeg}deg)`, transformOrigin: '0 0' }}>
        <div ref={(el) => { refs.current.texTrack = el; }} className="will-change-transform" style={{ width: stripLen + TEX_TILE, height: depth }}>
          <svg width={stripLen + TEX_TILE} height={depth} className="block overflow-visible">
            {Array.from({ length: tiles + 1 }, (_, i) => (
              <TextureTile key={i} items={tex.items} pal={pal} dots={tex.dots} offset={i * TEX_TILE} />
            ))}
          </svg>
        </div>
      </div>

      {/* 丸太の腰かけと地面のマグ（休憩中だけ現れる） */}
      <div
        ref={(el) => { refs.current.seat = el; }}
        className="absolute"
        style={{ left: hx - 34 * k, top: L.ground(hx) - 24 * k, width: 52 * k, height: 26 * k, opacity: 0 }}
      >
        <Baked width={Math.round(52 * k)} height={Math.round(26 * k)}>
          <svg viewBox="-34 -24 52 26">
            <g filter="url(#crayon)">
              <rect x="-15" y="-11" width="26" height="11" rx="5.5" fill="#7A5134" stroke="#2E221C" strokeWidth="1.2" />
              <rect x="-14" y="-10.4" width="24" height="3" rx="1.5" fill="#9A6B45" />
              <ellipse cx="10.4" cy="-5.5" rx="3" ry="5.5" fill="#C99A6A" stroke="#2E221C" strokeWidth="1" />
              <path d="M10.4 -5.5 m-1.2 0 a1.2 1.6 0 1 1 1.2 1.6" stroke="#8A6040" strokeWidth="0.6" fill="none" />
            </g>
          </svg>
        </Baked>
        {/* マグと湯気（小さな SVG だけが動く） */}
        <svg className="absolute overflow-visible" style={{ left: 12 * k - 8 * k, top: L.ground(hx - 22 * k) - (L.ground(hx) - 24 * k) - 20 * k, width: 16 * k, height: 20 * k }} viewBox="-8 -20 16 20">
          <rect x="-3" y="-7" width="6" height="7" rx="1.2" fill="#3B3F46" stroke="#2E221C" strokeWidth="0.8" />
          <path d="M3 -5.4 Q5.6 -3.8 3 -1.8" stroke="#3B3F46" strokeWidth="1.2" fill="none" />
          <g className="ft-steam" opacity="0.75">
            <path d="M-1 -9 Q-2.4 -12 -0.8 -14 Q0.6 -16 -0.6 -18.6" stroke="#fff" strokeWidth="0.9" fill="none" strokeLinecap="round" />
            <path d="M1.6 -9.6 Q0.6 -12 1.8 -13.6 Q2.8 -15 2 -16.8" stroke="#fff" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* ハイカー */}
      <div ref={hikerBoxRef} className="absolute left-0 top-0" style={{ transform: `translate3d(${hx - 45 * k}px, ${gy - 118 * k}px, 0)` }}>
        <svg width={105 * k} height={124 * k} viewBox="-45 -118 105 124" className="block overflow-visible">
          <HikerRig refs={hikerRefs} palette={HIKER_PALETTES[hikerLook] ?? HIKER_PALETTES[0]} />
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
