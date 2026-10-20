import { useEffect, useMemo, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import { computeLayout, type StageLayout } from './layout';
import { MEADOW, stageSky } from './palette';
import { applyHikerPose, type HikerRefs } from './HikerRig';
import { applyDogPose, type DogRefs } from './DogRig';
import { blendDog, blendPose, clamp01, dogLie, dogTrot, lerp, sitPose, smooth, walkPose } from './rigMath';
import { SkyLayer } from './layers/SkyLayer';
import { MountainLayer } from './layers/MountainLayer';
import { TreeLayer } from './layers/TreeLayer';
import { BACK_TILE, MeadowLayer, TEX_TILE, type MeadowRefs } from './layers/MeadowLayer';
import { FG_TILE, ForegroundLayer } from './layers/ForegroundLayer';
import { LightLayer, type LightRefs } from './layers/LightLayer';

export type TravelerMood = 'walk' | 'stand' | 'rest' | 'alert';

export interface TrailStageProps {
  /** 0..24 */
  hour: number;
  /** 登山ステージ 0..4 */
  stage: number;
  mood: TravelerMood;
}

/** 歩行サイクルの長さ（秒）と 1 歩の歩幅（リグ単位）。地面の流れる速さはここから導く */
const CYCLE = 1.15;
const STRIDE = 26;
const GROUND_SPEED = STRIDE / (0.6 * CYCLE);

/**
 * 6 層のマルチレイヤー背景 + 骨格アニメーションのハイカーと犬。
 *   L1 空 / L2 遠景の山 / L3 両脇の木 / L4 草原の斜面とキャラクター / L5 前景ボケ / L6 光と粒子
 * 1 本の requestAnimationFrame で関節と各トラックの transform だけを書き換える。
 */
export function TrailStage({ hour, stage, mood }: TrailStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ W: 0, H: 0 });
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = rootRef.current!;
    const ro = new ResizeObserver(([e]) => setSize({ W: Math.round(e.contentRect.width), H: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const L = useMemo<StageLayout | null>(() => (size.W && size.H ? computeLayout(size.W, size.H) : null), [size.W, size.H]);
  const sky = stageSky(hour);
  const st = Math.max(0, Math.min(4, Math.round(stage)));
  const pal = MEADOW[st];

  const mountainRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);
  const hikerBoxRef = useRef<HTMLDivElement | null>(null);
  const meadowRefs = useRef<MeadowRefs>({ backTrack: null, texTrack: null, dog: null, camp: null, seat: null });
  const hikerRefs = useRef<HikerRefs>({});
  const dogRefs = useRef<DogRefs>({});
  const lightRefs = useRef<LightRefs>({ fire: null, flames: [], glow: null, canvas: null, alert: null });

  const live = useRef({ mood, stage: st, night: sky.night, reduced });
  live.current = { mood, stage: st, night: sky.night, reduced };

  useEffect(() => {
    if (!L) return;
    const s = {
      t: 0,
      phase: 0,
      dogPhase: 0,
      w: live.current.mood === 'walk' ? 1 : 0,
      camp: live.current.mood === 'rest' ? 1 : 0,
      alert: 0,
      scroll: 0,
    };
    const canvas = lightRefs.current.canvas;
    const ctx = canvas?.getContext('2d') ?? null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas) {
      canvas.width = L.W * dpr;
      canvas.height = L.H * dpr;
    }
    const particles = createParticles(L);
    let last = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { mood, night, reduced, stage } = live.current;
      s.t += dt;
      s.w = lerp(s.w, mood === 'walk' ? 1 : 0, Math.min(1, dt * 2.6));
      s.camp = lerp(s.camp, mood === 'rest' ? 1 : 0, Math.min(1, dt * 1.5));
      s.alert = lerp(s.alert, mood === 'alert' ? 1 : 0, Math.min(1, dt * 7));
      s.phase = (s.phase + dt / CYCLE) % 1;
      s.dogPhase = (s.dogPhase + dt / 0.46) % 1;
      // 地面は足の接地速度と同じ速さで流れる → 足が滑らない
      const speed = GROUND_SPEED * s.w * (1 - s.camp) * L.k;
      s.scroll += speed * dt;

      // ── トラック（合成レイヤーの translate だけ） ──
      const mod = (v: number, m: number) => ((v % m) + m) % m;
      if (mountainRef.current) mountainRef.current.style.transform = `translate3d(${-mod(s.scroll * 0.035, Math.max(L.W, 900))}px,0,0)`;
      const m = meadowRefs.current;
      if (m.backTrack) m.backTrack.style.transform = `translate3d(${-mod(s.scroll * 0.28, BACK_TILE)}px,0,0)`;
      if (m.texTrack) m.texTrack.style.transform = `translate3d(${-mod(s.scroll, TEX_TILE)}px,0,0)`;
      if (fgRef.current) fgRef.current.style.transform = `translate3d(${-mod(s.scroll * 1.7, FG_TILE)}px,0,0)`;

      // ── ハイカー ──
      const sitK = smooth(clamp01(s.camp));
      const walk = walkPose(s.phase, s.w, L.tan, s.t);
      const pose = sitK > 0.001 ? blendPose(walk, sitPose(L.tan, s.t), sitK) : walk;
      pose.head += s.alert * -10 + s.alert * Math.sin(s.t * 3) * 6;
      applyHikerPose(hikerRefs.current, pose);

      // ── 犬：少し手前を駆けていく / 焚き火のそばで伏せる ──
      const lie = smooth(clamp01(s.camp));
      const dPose = blendDog(dogTrot(s.dogPhase, s.w * (1 - lie), s.t), dogLie(s.t), lie);
      applyDogPose(dogRefs.current, dPose);
      const dxWalk = L.hx + 54 * L.k + Math.sin(s.t * 0.45) * 7 * L.k * s.w;
      const dxRest = L.hx - 38 * L.k;
      const dx = lerp(dxWalk, dxRest, lie);
      const dy = L.ground(dx) + L.near * (1 - lie * 0.6);
      if (m.dog) m.dog.style.transform = `translate3d(${dx}px,${dy}px,0)`;

      // ── キャンプ ──
      if (m.camp) m.camp.setAttribute('opacity', String(clamp01((s.camp - 0.15) / 0.6)));
      if (m.seat) m.seat.setAttribute('opacity', String(clamp01(s.camp * 2)));
      const lr = lightRefs.current;
      const fireK = clamp01((s.camp - 0.25) / 0.5);
      if (lr.fire) lr.fire.setAttribute('opacity', String(fireK));
      if (fireK > 0) {
        lr.flames.forEach((f, i) => {
          if (!f) return;
          const sc = fireK * (0.9 + 0.12 * Math.sin(s.t * (9 + i * 3) + i) + 0.06 * Math.sin(s.t * 23 + i * 2));
          const sk = 6 * Math.sin(s.t * (4 + i) + i * 1.7);
          f.setAttribute('transform', `scale(${(0.95 + 0.06 * Math.sin(s.t * 7 + i)) * fireK} ${sc}) skewX(${sk})`);
        });
        if (lr.glow) lr.glow.setAttribute('r', String(L.k * (80 + night * 60) * (0.94 + 0.06 * Math.sin(s.t * 11))));
      }
      if (lr.alert) {
        lr.alert.style.opacity = String(s.alert);
        lr.alert.style.transform = `translate(-50%, ${-Math.abs(Math.sin(s.t * 4)) * 5}px) scale(${0.4 + 0.6 * s.alert})`;
      }

      // ── 粒子 ──
      if (ctx) drawParticles(ctx, dpr, L, particles, dt, s, { night, stage, reduced, fire: fireK });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [L]);

  return (
    <div ref={rootRef} className={`ft-stage absolute inset-0 overflow-hidden ${reduced ? 'ft-reduced' : ''}`}>
      {/* 筆のかすれ（輪郭をわずかに揺らす） */}
      <svg width="0" height="0" className="absolute">
        <filter id="ft-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="3.2" />
        </filter>
      </svg>
      {L && (
        <>
          <SkyLayer sky={sky} stage={st} />
          <MountainLayer ref={mountainRef} W={L.W} H={L.H} stage={st} />
          <TreeLayer W={L.W} H={L.H} stage={st} />
          <MeadowLayer L={L} pal={pal} refs={meadowRefs} hikerRefs={hikerRefs} dogRefs={dogRefs} hikerBoxRef={hikerBoxRef} />
          <ForegroundLayer ref={fgRef} W={L.W} H={L.H} stage={st} />
          {/* 時間帯のティント：夜は群青、朝夕は暖色 */}
          <div className="pointer-events-none absolute inset-0" style={{ background: '#16204A', mixBlendMode: 'multiply', opacity: sky.night * 0.82, transition: 'opacity 2s' }} />
          <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, #FF9A5A, #FF7A6A)', mixBlendMode: 'soft-light', opacity: sky.glow * 0.6, transition: 'opacity 2s' }} />
          <LightLayer L={L} day={1 - sky.night} refs={lightRefs} />
        </>
      )}
    </div>
  );
}

// ───────────────────────── 粒子 ─────────────────────────

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  rot: number;
  life: number;
  max: number;
  hue: number;
}

function createParticles(L: StageLayout) {
  const rnd = Math.random;
  const mk = (n: number, f: () => Partial<P>) => Array.from({ length: n }, () => ({ x: rnd() * L.W, y: rnd() * L.H, vx: 0, vy: 0, r: 1, a: rnd() * 6, rot: rnd() * 6, life: 0, max: 1, hue: rnd(), ...f() }) as P);
  return {
    motes: mk(28, () => ({ x: L.W * (0.3 + rnd() * 0.7), y: L.H * (0.1 + rnd() * 0.65), r: 0.8 + rnd() * 2 })),
    petals: mk(12, () => ({ r: 2.4 + rnd() * 2.4 })),
    snow: mk(70, () => ({ r: 0.7 + rnd() * 1.8 })),
    flies: mk(16, () => ({ y: L.H * (0.5 + rnd() * 0.35), r: 1.4 + rnd() })),
    embers: [] as P[],
  };
}

function drawParticles(
  c: CanvasRenderingContext2D,
  dpr: number,
  L: StageLayout,
  ps: ReturnType<typeof createParticles>,
  dt: number,
  s: { t: number; w: number; camp: number },
  env: { night: number; stage: number; reduced: boolean; fire: number },
) {
  const { W, H } = L;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  if (env.reduced) dt *= 0.3;
  const day = 1 - env.night;
  const wind = 14 + s.w * 26;
  const wrap = (p: P) => {
    if (p.x < -20) p.x += W + 40;
    if (p.x > W + 20) p.x -= W + 40;
    if (p.y < -20) p.y += H + 40;
    if (p.y > H + 20) p.y -= H + 40;
  };

  // 光の粒（日差しの中を漂う）
  if (day > 0.05) {
    c.globalCompositeOperation = 'lighter';
    for (const p of ps.motes) {
      p.a += dt;
      p.x -= dt * (6 + s.w * 10);
      p.y -= dt * (3 + Math.sin(p.a * 0.7) * 4);
      wrap(p);
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(p.a * 1.3));
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(255,244,214,${0.75 * tw * day})`);
      g.addColorStop(1, 'rgba(255,244,214,0)');
      c.fillStyle = g;
      c.fillRect(p.x - p.r * 4, p.y - p.r * 4, p.r * 8, p.r * 8);
    }
    c.globalCompositeOperation = 'source-over';
  }

  // 花びら・落ち葉（雪のステージでは雪）
  if (env.stage === 3) {
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (const p of ps.snow) {
      p.a += dt;
      p.y += dt * (18 + p.r * 10);
      p.x -= dt * (wind * 0.5 + Math.sin(p.a) * 6);
      wrap(p);
      c.beginPath();
      c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      c.fill();
    }
  } else {
    for (const p of ps.petals) {
      p.a += dt;
      p.rot += dt * (1.5 + p.hue * 2);
      p.x -= dt * (wind + p.hue * 20);
      p.y += dt * (10 + Math.sin(p.a * 1.6) * 16);
      wrap(p);
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.scale(1, Math.abs(Math.sin(p.rot * 1.3)) * 0.8 + 0.2);
      c.fillStyle = p.hue > 0.6 ? `rgba(255,255,255,${0.85 * (0.4 + day * 0.6)})` : p.hue > 0.3 ? `rgba(240,150,50,${0.9 * (0.4 + day * 0.6)})` : `rgba(232,180,60,${0.9 * (0.4 + day * 0.6)})`;
      c.beginPath();
      c.ellipse(0, 0, p.r * 1.4, p.r * 0.7, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  // ホタル（夜の麓・森）
  if (env.night > 0.4 && env.stage <= 1) {
    c.globalCompositeOperation = 'lighter';
    for (const p of ps.flies) {
      p.a += dt;
      const x = p.x + Math.sin(p.a * 0.5 + p.hue * 9) * 30;
      const y = p.y + Math.cos(p.a * 0.4 + p.hue * 5) * 16;
      const al = env.night * (0.4 + 0.6 * Math.abs(Math.sin(p.a * 1.4 + p.hue * 6)));
      const g = c.createRadialGradient(x, y, 0, x, y, 9);
      g.addColorStop(0, `rgba(222,255,140,${al})`);
      g.addColorStop(1, 'rgba(222,255,140,0)');
      c.fillStyle = g;
      c.fillRect(x - 9, y - 9, 18, 18);
    }
    c.globalCompositeOperation = 'source-over';
  }

  // 火の粉
  if (env.fire > 0.05) {
    const fx = L.fireX;
    const fy = L.ground(fx) - 14 * L.k;
    if (Math.random() < dt * 10 * env.fire) {
      ps.embers.push({ x: fx + (Math.random() - 0.5) * 10, y: fy, vx: (Math.random() - 0.5) * 12, vy: -(28 + Math.random() * 36), r: 0.8 + Math.random() * 1.4, a: 0, rot: 0, life: 0, max: 1.2 + Math.random() * 1.6, hue: Math.random() });
    }
  }
  if (ps.embers.length) {
    c.globalCompositeOperation = 'lighter';
    for (let i = ps.embers.length - 1; i >= 0; i--) {
      const e = ps.embers[i];
      e.life += dt;
      if (e.life > e.max) {
        ps.embers.splice(i, 1);
        continue;
      }
      e.x += (e.vx + Math.sin(e.life * 5 + e.hue * 9) * 14) * dt;
      e.y += e.vy * dt;
      const al = (1 - e.life / e.max) * env.fire;
      c.fillStyle = `rgba(255,${150 + Math.floor(90 * (1 - e.life / e.max))},70,${al})`;
      c.beginPath();
      c.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  }
}
