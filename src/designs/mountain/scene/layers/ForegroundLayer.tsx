import { forwardRef, memo, useMemo } from 'react';
import { seeded } from '@/lib/id';
import type { SeasonLook } from '../palette';

export const FG_TILE = 560;

/** Layer 5：カメラの目の前にある草花（被写界深度で大きくボケる） */
export const ForegroundLayer = memo(
  forwardRef<HTMLDivElement, { W: number; H: number; look: SeasonLook }>(function ForegroundLayer({ W, H, look }, ref) {
    const h = Math.round(Math.min(170, H * 0.2));
    const tiles = Math.ceil(W / FG_TILE) + 1;
    const snowy = look.snow > 0;
    const plants = useMemo(() => {
      const r = seeded(404);
      const items: { x: number; kind: 'daisy' | 'blade' | 'leaf'; s: number; d: number; dur: number }[] = [];
      for (let i = 0; i < 18; i++) {
        const kind = i % 3 === 0 ? 'daisy' : i % 3 === 1 ? 'blade' : 'leaf';
        items.push({ x: r() * FG_TILE, kind, s: 0.5 + r() * 0.42, d: -r() * 5, dur: 3.2 + r() * 2.6 });
      }
      return items;
    }, []);

    const tile = (key: number) => (
      <svg key={key} width={FG_TILE} height={h} viewBox={`0 0 ${FG_TILE} ${h}`} className="block shrink-0 overflow-visible">
        {plants.map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${h + 6}) scale(${p.s})`}>
            <g className="ft-sway-big" style={{ animationDuration: `${p.dur}s`, animationDelay: `${p.d}s` }}>
              {p.kind === 'daisy' && (
                <>
                  <path d="M0 0 Q-4 -60 2 -110" stroke="#2F5A3C" strokeWidth="4" fill="none" />
                  <path d="M0 -40 Q-22 -60 -30 -46 Q-16 -44 0 -36 Z" fill="#3C6B45" />
                  <g transform="translate(2 -112)">
                    {Array.from({ length: 11 }, (_, k) => (
                      <ellipse key={k} cx="0" cy="-14" rx="5.4" ry="14" fill={look.flower.petal} opacity={k % 2 ? 1 : 0.85} transform={`rotate(${(k * 360) / 11})`} />
                    ))}
                    <circle r="8" fill={look.flower.center} />
                    <circle r="4" cx="-2" cy="-2" fill="#FAD267" />
                  </g>
                </>
              )}
              {p.kind === 'blade' && (
                <>
                  <path d="M-10 0 Q-12 -80 6 -150 Q-2 -80 4 0 Z" fill={snowy ? '#41566A' : '#2B4A3A'} />
                  <path d="M4 0 Q20 -70 40 -110 Q18 -60 16 0 Z" fill={snowy ? '#56708A' : '#3D6A48'} />
                  <path d="M-4 0 Q-30 -50 -44 -84 Q-20 -46 -14 0 Z" fill={snowy ? "#8FA2B8" : look.meadow.sh} />
                </>
              )}
              {p.kind === 'leaf' && (
                <>
                  <path d="M0 0 Q-30 -40 -12 -96 Q4 -50 10 0 Z" fill={look.foliage?.sh ?? "#7C8DA2"} />
                  <path d="M-12 -96 Q-4 -50 4 -4" stroke="#B66A1E" strokeWidth="2" fill="none" />
                  <path d="M12 0 Q36 -30 30 -70 Q14 -36 20 0 Z" fill={look.foliage?.base ?? "#A9B8C9"} />
                </>
              )}
            </g>
          </g>
        ))}
      </svg>
    );

    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-visible" style={{ height: h, filter: 'blur(3px)' }}>
        <div ref={ref} className="flex h-full will-change-transform" style={{ width: FG_TILE * tiles }}>
          {Array.from({ length: tiles }, (_, i) => tile(i))}
        </div>
      </div>
    );
  }),
);
