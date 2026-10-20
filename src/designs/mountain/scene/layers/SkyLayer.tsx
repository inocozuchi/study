import { memo, useMemo } from 'react';
import { seeded } from '@/lib/id';
import { Baked } from '../Baked';
import type { StageSky } from '../palette';

/** Layer 1：空のグラデーション、太陽/月、モコモコの入道雲、鳥、星 */
export const SkyLayer = memo(function SkyLayer({ sky, stage, W }: { sky: StageSky; stage: number; W: number }) {
  const day = 1 - sky.night;
  const stars = useMemo(() => {
    const r = seeded(31);
    return Array.from({ length: 90 }, (_, i) => ({ x: r() * 100, y: Math.pow(r(), 1.3) * 60, s: 0.6 + r() * 1.6, g: i % 3 }));
  }, []);
  // 雲の色：昼は白、夕は桃色、夜は群青
  const cloudLit = sky.night > 0.5 ? '#4A5A86' : sky.glow > 0.35 ? '#FFE3CF' : '#FBF6EA';
  const cloudSh = sky.night > 0.5 ? '#2E3A62' : sky.glow > 0.35 ? '#D9A9A4' : '#C9D7E4';

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(180deg, ${sky.top} 0%, ${sky.mid} 52%, ${sky.bot} 78%)`, transition: 'background 2s' }}>
      {/* 星：3 つの群に分け、群ごとに div の opacity で瞬かせる（星 1 つずつ動かすと毎フレーム描き直しになる） */}
      {sky.night > 0.02 && (
        <div className="absolute inset-0" style={{ opacity: sky.night, transition: 'opacity 2s' }}>
          {[0, 1, 2].map((g) => (
            <svg key={g} className="ft-twinkle absolute inset-0 h-full w-full" style={{ animationDelay: `${-g}s` }} preserveAspectRatio="none" viewBox="0 0 100 100">
              {stars.filter((s) => s.g === g).map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.s * 0.12} fill="#fff" />
              ))}
            </svg>
          ))}
        </div>
      )}

      {/* 太陽：位置は transform で動かす（left/top だと動くたびに描き直しになる） */}
      <div className="absolute inset-0" style={{ transform: `translate3d(${sky.sunX * 100}%, ${sky.sunY * 100}%, 0)`, transition: 'transform 2s' }}>
        <div
          className="absolute left-0 top-0 h-[44vmin] w-[44vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: `radial-gradient(circle, ${sky.sun} 0%, rgba(255,240,210,0.35) 12%, rgba(255,240,210,0) 62%)`,
            opacity: day * 0.95,
            transition: 'opacity 2s',
          }}
        />
        <div
          className="absolute left-0 top-0 h-[7vmin] w-[7vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: '#FFF6E2', opacity: day * 0.9, boxShadow: '0 0 40px 10px rgba(255,236,200,0.6)' }}
        />
      </div>
      <div
        className="absolute left-[24%] top-[13%] h-[6vmin] w-[6vmin] rounded-full"
        style={{ background: '#F2EEDC', opacity: sky.night * 0.95, boxShadow: '0 0 50px 14px rgba(200,215,255,0.25), inset -1.6vmin -0.6vmin 0 0 rgba(30,40,80,0.9)' }}
      />

      {/* 入道雲（ゆっくり流れる） */}
      <Cumulus className="top-[20%]" width={Math.min(W * 0.78, 560)} lit={cloudLit} sh={cloudSh} seed={1} duration={260} delay={-60} />
      <Cumulus className="top-[30%]" width={Math.min(W * 0.54, 380)} lit={cloudLit} sh={cloudSh} seed={2} duration={200} delay={-150} />
      <Cumulus className="top-[9%]" width={Math.min(W * 0.36, 260)} lit={cloudLit} sh={cloudSh} seed={3} duration={170} delay={-20} opacity={0.75} />
      {stage >= 4 && <Cumulus className="top-[42%]" width={Math.min(W * 0.9, 680)} lit={cloudLit} sh={cloudSh} seed={4} duration={300} delay={-100} />}

      {/* 遠くの鳥 */}
      <div className="ft-fly absolute top-[17%]" style={{ opacity: day, animationDuration: '46s', animationDelay: '-8s' }}>
        {[0, 1, 2].map((i) => (
          <Bird key={i} x={i * 22 + (i % 2) * 6} y={i * 7 - (i === 2 ? 12 : 0)} delay={i * 0.17} />
        ))}
      </div>
      <div className="ft-fly absolute top-[25%]" style={{ opacity: day * 0.8, animationDuration: '64s', animationDelay: '-40s' }}>
        <Bird x={0} y={0} delay={0.3} scale={0.7} />
        <Bird x={16} y={6} delay={0} scale={0.6} />
      </div>
    </div>
  );
});

function Cumulus({ className, width, lit, sh, seed, duration, delay, opacity = 1 }: { className: string; width: number; lit: string; sh: string; seed: number; duration: number; delay: number; opacity?: number }) {
  const { base, light, id } = useMemo(() => {
    const r = seeded(seed * 97);
    // 底が平らで上へ盛り上がる入道雲
    const base: [number, number, number][] = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = 30 + t * 240;
      const tower = Math.sin(t * Math.PI) * (0.75 + r() * 0.5);
      base.push([x, 150 - tower * 60 - r() * 10, 26 + tower * 34 + r() * 10]);
    }
    base.push([150 + (r() - 0.5) * 40, 70 - r() * 20, 46 + r() * 10]);
    base.push([110 + r() * 20, 96, 40]);
    base.push([195 + r() * 20, 92, 42]);
    const light = base.map(([x, y, rr]) => [x + rr * 0.28, y - rr * 0.32, rr * 0.82] as [number, number, number]);
    return { base, light, id: `cu${seed}` };
  }, [seed]);
  const w = Math.round(width);
  const h = Math.round((width * 180) / 300);
  return (
    <div className={`ft-drift absolute left-0 ${className}`} style={{ width: w, animationDuration: `${duration}s`, animationDelay: `${delay}s`, opacity }}>
      {/* 雲は色が 3 通り（昼・夕・夜）しかないので、色ごとに焼き込む */}
      <Baked width={w} height={h} bakeKey={lit + sh}>
        <svg viewBox="0 0 300 180">
          <defs>
            <clipPath id={id}>
              {base.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
            </clipPath>
          </defs>
          <g filter="url(#crayon)">
            <g clipPath={`url(#${id})`}>
              <rect x="0" y="0" width="300" height="168" fill={sh} />
              {light.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={lit} />)}
              <rect x="0" y="150" width="300" height="30" fill={sh} opacity="0.65" />
            </g>
          </g>
        </svg>
      </Baked>
    </div>
  );
}

function Bird({ x, y, delay, scale = 1 }: { x: number; y: number; delay: number; scale?: number }) {
  return (
    <svg width={22 * scale} height={12 * scale} viewBox="-11 -6 22 12" className="absolute overflow-visible" style={{ left: x, top: y }}>
      <g className="ft-flap" style={{ animationDelay: `${delay}s` }}>
        <path d="M0 0 Q-5 -5 -10 -1 Q-5 -2.5 0 1.4 Q5 -2.5 10 -1 Q5 -5 0 0 Z" fill="#20324F" />
      </g>
    </svg>
  );
}
