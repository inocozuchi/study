import { memo, type MutableRefObject } from 'react';
import type { StageLayout } from '../layout';

export interface LightRefs {
  fire: SVGGElement | null;
  flames: (SVGGElement | null)[];
  glow: SVGCircleElement | null;
  canvas: HTMLCanvasElement | null;
  alert: HTMLDivElement | null;
}

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Layer 6：差し込む光、焚き火の発光、舞う光の粒・花びら、紙のような質感 */
export const LightLayer = memo(function LightLayer({ L, day, refs }: { L: StageLayout; day: number; refs: MutableRefObject<LightRefs> }) {
  const { W, H, k } = L;
  const fx = L.fireX;
  const fy = L.ground(fx);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* ゴッドレイ（右上から斜めに） */}
      <div className="absolute inset-0" style={{ opacity: day * 0.9, transition: 'opacity 2s', mixBlendMode: 'screen' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 70% at 92% -5%, rgba(255,236,190,0.42), rgba(255,236,190,0) 60%)' }} />
        {[
          { r: 28, w: 9, o: 0.5, d: 0 },
          { r: 36, w: 5, o: 0.35, d: -2 },
          { r: 44, w: 12, o: 0.28, d: -4 },
          { r: 53, w: 6, o: 0.32, d: -1 },
          { r: 62, w: 10, o: 0.2, d: -3 },
        ].map((ray, i) => (
          <div
            key={i}
            className="ft-ray absolute"
            style={{
              right: '-10%',
              top: '-12%',
              width: `${ray.w}vmax`,
              height: '150vmax',
              transformOrigin: '50% 0',
              transform: `rotate(${ray.r}deg)`,
              background: `linear-gradient(180deg, rgba(255,240,205,${ray.o}) 0%, rgba(255,240,205,${ray.o * 0.4}) 45%, rgba(255,240,205,0) 80%)`,
              // 縁のぼかしはマスクで作る（filter: blur は毎フレーム計算になる）
              WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 50%, transparent)',
              maskImage: 'linear-gradient(90deg, transparent, #000 50%, transparent)',
              willChange: 'opacity',
              animationDelay: `${ray.d}s`,
            }}
          />
        ))}
      </div>

      {/* 焚き火（夜でも暗くならないよう、ティントより上で描く） */}
      <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <radialGradient id="ft-fireglow">
            <stop offset="0" stopColor="#FFB45A" stopOpacity="0.55" />
            <stop offset="0.35" stopColor="#FF8A3C" stopOpacity="0.22" />
            <stop offset="1" stopColor="#FF7A30" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g ref={(el) => { refs.current.fire = el; }} opacity="0">
          <circle ref={(el) => { refs.current.glow = el; }} cx={fx} cy={fy - 10 * k} r={90 * k} fill="url(#ft-fireglow)" style={{ mixBlendMode: 'screen' }} />
          <g transform={`translate(${fx} ${fy}) scale(${k})`}>
            {/* 石と薪 */}
            {[-12, -6, 0, 6, 12].map((x) => (
              <ellipse key={x} cx={x} cy="0.5" rx="3.8" ry="2.6" fill={x % 12 ? '#6E6A72' : '#58545C'} />
            ))}
            <path d="M-12 -1 L11 -6" stroke="#5B3A26" strokeWidth="3.6" strokeLinecap="round" />
            <path d="M12 -1 L-10 -6.5" stroke="#6E472E" strokeWidth="3.6" strokeLinecap="round" />
            {/* 炎（毎フレーム揺らぐ 3 層） */}
            {[
              { c: '#FF6A2A', d: 'M-9 -3 Q-11 -16 -3 -24 Q-4 -30 0 -36 Q4 -28 7 -22 Q12 -14 9 -3 Z' },
              { c: '#FFA640', d: 'M-6 -3 Q-8 -13 -1 -19 Q0 -25 2 -28 Q4 -21 6 -16 Q8 -10 6 -3 Z' },
              { c: '#FFE6A0', d: 'M-3.4 -3 Q-4.4 -9 0 -13 Q3 -10 3.6 -6.4 Q4 -4 3.2 -3 Z' },
            ].map((f, i) => (
              <g key={i} ref={(el) => { refs.current.flames[i] = el; }}>
                <path d={f.d} fill={f.c} />
              </g>
            ))}
          </g>
        </g>
      </svg>

      {/* 粒子（光の粒・花びら・雪・ホタル・火の粉） */}
      <canvas ref={(el) => { refs.current.canvas = el; }} className="absolute inset-0 h-full w-full" />

      {/* よそ見の警告 */}
      <div
        ref={(el) => { refs.current.alert = el; }}
        className="absolute grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-sun text-[18px] font-black text-night-950 shadow-glass"
        style={{ left: L.hx + 4 * k, top: L.gy - 140 * k, opacity: 0, transform: 'scale(0.4)' }}
      >
        !
      </div>

      {/* 紙・絵の具のような粒状感 */}
      <div className="absolute inset-0 opacity-[0.16] mix-blend-overlay" style={{ backgroundImage: GRAIN, transform: 'translateZ(0)' }} />
    </div>
  );
});
