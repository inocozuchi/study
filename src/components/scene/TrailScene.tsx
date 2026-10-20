import { useEffect, useRef } from 'react';
import { GROUND_BY_STAGE, LAND_TINT_BY_STAGE, mix, rgba, skyAt, type RGB, type SkyPalette } from '@/lib/scene';
import { seeded } from '@/lib/id';
import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';

export type TravelerMood = 'walk' | 'stand' | 'rest' | 'alert';

export interface TrailSceneProps {
  /** 0..24 */
  hour: number;
  /** 0..4（小数で補間） */
  stage: number;
  mood: TravelerMood;
  /** 地面の高さ（画面比） */
  groundAt?: number;
  /** 旅人の x 位置（画面比） */
  travelerAt?: number;
  className?: string;
}

// ───────────────────────── 定数 ─────────────────────────

interface LayerDef {
  base: number;
  amp: number;
  par: number;
  period: number;
  sharp: number;
  depth: number;
  phases: number[];
  sink: number;
  seed: number;
}

const FREQS = [1, 2, 3, 5, 8];
const AMPS = [0.42, 0.26, 0.16, 0.1, 0.06];

function makeLayers(): LayerDef[] {
  const r = seeded(4242);
  const defs: Omit<LayerDef, 'phases' | 'seed'>[] = [
    { base: 0.5, amp: 0.24, par: 0.035, period: 2200, sharp: 0.85, depth: 0.22, sink: 0.04 },
    { base: 0.56, amp: 0.19, par: 0.08, period: 1700, sharp: 0.7, depth: 0.42, sink: 0.08 },
    { base: 0.62, amp: 0.13, par: 0.17, period: 1300, sharp: 0.45, depth: 0.64, sink: 0.13 },
    { base: 0.67, amp: 0.085, par: 0.36, period: 1100, sharp: 0.25, depth: 0.84, sink: 0.18 },
  ];
  return defs.map((d, i) => ({ ...d, seed: 100 + i * 17, phases: FREQS.map(() => r() * Math.PI * 2) }));
}

const LAYERS = makeLayers();
const TREE_DENSITY = [0.28, 0.95, 0.3, 0.06, 0];
const SNOW_COL: RGB = [238, 244, 252];

function ridge(L: LayerDef, xw: number) {
  let v = 0;
  for (let k = 0; k < FREQS.length; k++) {
    const s = Math.sin((xw / L.period) * FREQS[k] * Math.PI * 2 + L.phases[k]);
    const smoothV = (s + 1) / 2;
    const peakV = 1 - Math.abs(s);
    v += AMPS[k] * (smoothV + (peakV - smoothV) * L.sharp);
  }
  return v;
}

function hash(n: number, seed: number) {
  const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const sstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
function stageLerp(arr: number[], stage: number) {
  const i = Math.max(0, Math.min(arr.length - 2, Math.floor(stage)));
  return lerp(arr[i], arr[i + 1], clamp01(stage - i));
}
function stageMix(arr: RGB[], stage: number) {
  const i = Math.max(0, Math.min(arr.length - 2, Math.floor(stage)));
  return mix(arr[i], arr[i + 1], clamp01(stage - i));
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
}

interface Cloud {
  x: number;
  y: number;
  s: number;
  speed: number;
  puffs: { dx: number; dy: number; r: number }[];
}

function makeClouds(): Cloud[] {
  const r = seeded(77);
  return Array.from({ length: 8 }, (_, i) => ({
    x: r() * 1.4,
    y: 0.08 + r() * 0.32,
    s: 0.6 + r() * 0.9,
    speed: 0.004 + r() * 0.01 + (i % 3) * 0.002,
    puffs: Array.from({ length: 5 + Math.floor(r() * 3) }, (_, k) => ({
      dx: (k - 3) * 22 + r() * 14,
      dy: -Math.sin((k / 6) * Math.PI) * 14 + r() * 6,
      r: 22 + r() * 22 * Math.sin(((k + 0.5) / 7) * Math.PI),
    })),
  }));
}

function makeStars() {
  const r = seeded(9);
  return Array.from({ length: 160 }, () => ({ x: r(), y: Math.pow(r(), 1.4) * 0.62, r: 0.4 + r() * 1.1, tw: r() * 6, sp: 0.6 + r() * 2 }));
}

// ───────────────────────── コンポーネント ─────────────────────────

export function TrailScene({ hour, stage, mood, groundAt = 0.66, travelerAt = 0.36, className }: TrailSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const props = useRef({ hour, stage, mood, groundAt, travelerAt, reduced });
  props.current = { hour, stage, mood, groundAt, travelerAt, reduced };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0, dpr = 1;
    let raf = 0;
    let last = performance.now();

    const st = {
      t: 0,
      hour: props.current.hour,
      stage: props.current.stage,
      walk: 0,
      camp: props.current.mood === 'rest' ? 1 : 0,
      alert: 0,
      scroll: 0,
      phase: 0,
      px: 0,
      py: 0,
      tpx: 0,
      tpy: 0,
      shoot: null as null | { x: number; y: number; vx: number; vy: number; life: number },
      nextShoot: 6,
    };
    const clouds = makeClouds();
    const stars = makeStars();
    const embers: Particle[] = [];
    const snow: Particle[] = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random(), vx: 0, vy: 0, life: 0, max: 0, r: 0.6 + Math.random() * 1.8 }));
    const flies = Array.from({ length: 16 }, (_, i) => ({ x: Math.random(), y: 0.55 + Math.random() * 0.3, ph: i * 1.7 }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const onPointer = (e: PointerEvent) => {
      st.tpx = (e.clientX / window.innerWidth) * 2 - 1;
      st.tpy = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (W === 0 || H === 0) return;
      const p = props.current;

      // 状態をなめらかに追従
      st.t += dt;
      let dh = p.hour - st.hour;
      if (dh > 12) dh -= 24;
      if (dh < -12) dh += 24;
      st.hour = (st.hour + dh * Math.min(1, dt * 1.5) + 24) % 24;
      st.stage = lerp(st.stage, p.stage, Math.min(1, dt * 1.2));
      st.walk = lerp(st.walk, p.mood === 'walk' ? 1 : 0, Math.min(1, dt * 3));
      st.camp = lerp(st.camp, p.mood === 'rest' ? 1 : 0, Math.min(1, dt * 2.2));
      st.alert = lerp(st.alert, p.mood === 'alert' ? 1 : 0, Math.min(1, dt * 6));
      st.scroll += dt * 22 * st.walk;
      st.phase += dt * 5.2 * st.walk;
      const parK = p.reduced ? 0 : 1;
      st.px = lerp(st.px, st.tpx * parK, Math.min(1, dt * 2));
      st.py = lerp(st.py, st.tpy * parK, Math.min(1, dt * 2));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, W, H, dt, p, st);
    };

    // ───────── 描画 ─────────
    const draw = (c: CanvasRenderingContext2D, W: number, H: number, dt: number, p: typeof props.current, s: typeof st) => {
      const pal = skyAt(s.hour);
      const stageF = s.stage;
      const summit = sstep(3.4, 4.2, stageF);

      // 空
      const g = c.createLinearGradient(0, 0, 0, H * 0.72);
      g.addColorStop(0, rgba(pal.top));
      g.addColorStop(0.55, rgba(pal.mid));
      g.addColorStop(1, rgba(pal.bot));
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);

      // 星
      if (pal.night > 0.05) {
        for (const star of stars) {
          const a = pal.night * (0.45 + 0.55 * Math.sin(s.t * star.sp + star.tw)) * 0.9;
          if (a <= 0.02) continue;
          c.fillStyle = `rgba(255,255,255,${a})`;
          c.beginPath();
          c.arc(star.x * W + s.px * -3, star.y * H + s.py * -2, star.r, 0, Math.PI * 2);
          c.fill();
        }
        // 流れ星
        s.nextShoot -= dt;
        if (s.nextShoot <= 0 && !s.shoot && !p.reduced) {
          s.shoot = { x: W * (0.2 + Math.random() * 0.7), y: H * (0.05 + Math.random() * 0.2), vx: -W * 0.6, vy: H * 0.25, life: 0.8 };
          s.nextShoot = 9 + Math.random() * 16;
        }
        if (s.shoot) {
          const sh = s.shoot;
          sh.life -= dt;
          sh.x += sh.vx * dt;
          sh.y += sh.vy * dt;
          const tail = c.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * 0.12, sh.y - sh.vy * 0.12);
          tail.addColorStop(0, `rgba(255,255,255,${0.9 * pal.night * Math.max(0, sh.life)})`);
          tail.addColorStop(1, 'rgba(255,255,255,0)');
          c.strokeStyle = tail;
          c.lineWidth = 1.4;
          c.beginPath();
          c.moveTo(sh.x, sh.y);
          c.lineTo(sh.x - sh.vx * 0.12, sh.y - sh.vy * 0.12);
          c.stroke();
          if (sh.life <= 0) s.shoot = null;
        }
      }

      drawCelestial(c, W, H, s.hour, pal, s.px, s.py);
      drawClouds(c, W, H, dt, pal, clouds, p.reduced, 1 - summit * 0.4);

      // 山レイヤー
      const landTint = mix(pal.land, mix(stageMix(LAND_TINT_BY_STAGE, stageF), pal.land, pal.night * 0.85), 0.55);
      const snowAmt = clamp01((stageF - 1.3) / 2.2);
      const treeDensity = stageLerp(TREE_DENSITY, stageF);
      LAYERS.forEach((L, li) => {
        const offset = s.scroll * L.par + s.px * L.depth * 14;
        const yShift = summit * L.sink * H + s.py * L.depth * 5;
        const color = mix(pal.haze, landTint, L.depth);
        const yTop = (L.base - L.amp) * H + yShift;
        const yBase = L.base * H + yShift;
        const grad = c.createLinearGradient(0, yTop, 0, H);
        const snowFrac = (li === 0 ? 0.22 : 0) + snowAmt * (0.5 - li * 0.07);
        const snowCol = mix(mix(color, SNOW_COL, 0.3 + 0.62 * pal.light), pal.sun, (1 - pal.night) * 0.12);
        if (snowFrac > 0.01) {
          const f = Math.min(0.6, snowFrac) * ((yBase - yTop) / (H - yTop));
          grad.addColorStop(0, rgba(snowCol));
          grad.addColorStop(f, rgba(snowCol));
          grad.addColorStop(Math.min(0.99, f + 0.04), rgba(color));
        } else grad.addColorStop(0, rgba(color));
        grad.addColorStop(1, rgba(mix(color, pal.haze, 0.35)));
        c.fillStyle = grad;
        c.beginPath();
        c.moveTo(0, H);
        for (let x = 0; x <= W + 4; x += 4) {
          const y = yBase - L.amp * H * ridge(L, x + offset);
          c.lineTo(x, y);
        }
        c.lineTo(W, H);
        c.closePath();
        c.fill();

        // 樹林
        if (li >= 2 && treeDensity > 0.02) {
          const spacing = li === 2 ? 9 : 13;
          const n0 = Math.floor(offset / spacing) - 1;
          const n1 = Math.ceil((offset + W) / spacing) + 1;
          const treeCol = mix(color, [8, 14, 18], 0.35 + 0.1 * li);
          c.fillStyle = rgba(treeCol);
          for (let n = n0; n <= n1; n++) {
            const hsh = hash(n, L.seed);
            if (hsh > treeDensity) continue;
            const xw = n * spacing + hash(n, L.seed + 3) * spacing;
            const x = xw - offset;
            const rv = ridge(L, xw);
            if (rv > 0.62 + treeDensity * 0.25) continue; // 森林限界
            const y = yBase - L.amp * H * rv + 1;
            const th = (li === 2 ? 0.024 : 0.036) * H * (0.65 + hash(n, L.seed + 7) * 0.7);
            drawConifer(c, x, y, th);
          }
        }

        // 霧（尾根道ステージ）
        if (li === 1 || li === 2) {
          const fog = sstep(1.4, 2.2, stageF) * (1 - sstep(2.8, 3.5, stageF)) + (li === 1 ? summit * 0 : 0);
          if (fog > 0.01) {
            const fy = yBase - L.amp * H * 0.15;
            const fg = c.createLinearGradient(0, fy - H * 0.06, 0, fy + H * 0.05);
            const fc = mix(pal.haze, [255, 255, 255], 0.35 * pal.light);
            fg.addColorStop(0, rgba(fc, 0));
            fg.addColorStop(0.5, rgba(fc, 0.45 * fog));
            fg.addColorStop(1, rgba(fc, 0));
            c.fillStyle = fg;
            c.fillRect(0, fy - H * 0.06, W, H * 0.11);
          }
        }

        // 雲海（山頂ステージ）：中景の上にかかる
        if (li === 1 && summit > 0.01) drawCloudSea(c, W, H, s.t, pal, summit, yBase + H * 0.02);
      });

      drawForeground(c, W, H, dt, p, s, pal, stageF, embers, snow, flies);

      // ビネット
      const vg = c.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(3,5,12,${0.35 + pal.night * 0.2})`);
      c.fillStyle = vg;
      c.fillRect(0, 0, W, H);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden />;
}

// ───────────────────────── 描画部品 ─────────────────────────

function drawCelestial(c: CanvasRenderingContext2D, W: number, H: number, hour: number, pal: SkyPalette, px: number, py: number) {
  const horizon = H * 0.62;
  // 太陽 5:30–18:30
  const sunT = (hour - 5.5) / 13;
  if (sunT > -0.05 && sunT < 1.05) {
    const x = W * (0.08 + 0.84 * sunT) - px * 6;
    const y = horizon - Math.sin(clamp01(sunT) * Math.PI) * H * 0.56 - py * 4;
    const r = Math.min(W, H) * 0.045;
    const glow = c.createRadialGradient(x, y, 0, x, y, r * 7);
    glow.addColorStop(0, rgba(pal.sun, 0.55));
    glow.addColorStop(0.25, rgba(pal.sun, 0.18));
    glow.addColorStop(1, rgba(pal.sun, 0));
    c.fillStyle = glow;
    c.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
    c.fillStyle = rgba(mix(pal.sun, [255, 255, 255], 0.5), 0.95);
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  // 月 18:00–6:30
  const mh = hour < 12 ? hour + 24 : hour;
  const moonT = (mh - 18) / 12.5;
  if (moonT > -0.05 && moonT < 1.05 && pal.night > 0.1) {
    const x = W * (0.1 + 0.8 * moonT) - px * 5;
    const y = horizon - Math.sin(clamp01(moonT) * Math.PI) * H * 0.44 - py * 3;
    const r = Math.min(W, H) * 0.032;
    const a = pal.night;
    const glow = c.createRadialGradient(x, y, 0, x, y, r * 6);
    glow.addColorStop(0, `rgba(200,215,255,${0.28 * a})`);
    glow.addColorStop(1, 'rgba(200,215,255,0)');
    c.fillStyle = glow;
    c.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
    c.fillStyle = `rgba(240,240,228,${0.95 * a})`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    // 欠け
    c.fillStyle = rgba(mix(pal.top, pal.mid, 0.5), 0.92 * a);
    c.beginPath();
    c.arc(x + r * 0.45, y - r * 0.25, r * 0.92, 0, Math.PI * 2);
    c.fill();
  }
}

function drawClouds(c: CanvasRenderingContext2D, W: number, H: number, dt: number, pal: SkyPalette, clouds: Cloud[], reduced: boolean, alphaK: number) {
  const base = mix(mix(pal.bot, [255, 255, 255], 0.65), pal.mid, pal.night * 0.7);
  const shade = mix(base, pal.mid, 0.35);
  for (const cl of clouds) {
    if (!reduced) cl.x -= cl.speed * dt * 0.6;
    if (cl.x < -0.35) cl.x = 1.3;
    const cx = cl.x * W;
    const cy = cl.y * H;
    const sc = cl.s * Math.min(1.2, W / 600 + 0.4);
    const a = (0.55 - pal.night * 0.32) * alphaK;
    for (const pf of cl.puffs) {
      const x = cx + pf.dx * sc;
      const y = cy + pf.dy * sc;
      const r = pf.r * sc;
      const gr = c.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
      gr.addColorStop(0, rgba(base, a));
      gr.addColorStop(0.6, rgba(shade, a * 0.6));
      gr.addColorStop(1, rgba(shade, 0));
      c.fillStyle = gr;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
  }
}

function drawCloudSea(c: CanvasRenderingContext2D, W: number, H: number, t: number, pal: SkyPalette, amt: number, y0: number) {
  const col = mix(mix([255, 255, 255], pal.bot, 0.35), pal.mid, pal.night * 0.75);
  const top = y0 - H * 0.03;
  const g = c.createLinearGradient(0, top - H * 0.04, 0, top + H * 0.2);
  g.addColorStop(0, rgba(col, 0));
  g.addColorStop(0.35, rgba(col, 0.85 * amt));
  g.addColorStop(1, rgba(mix(col, pal.haze, 0.3), 0.95 * amt));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, H);
  for (let x = 0; x <= W + 6; x += 6) {
    const y = top + Math.sin(x / 70 + t * 0.15) * 5 + Math.sin(x / 23 - t * 0.25) * 2.5;
    c.lineTo(x, y);
  }
  c.lineTo(W, H);
  c.closePath();
  c.fill();
  // 雲のもこもこ
  for (let i = 0; i < 9; i++) {
    const x = ((i / 9) * W * 1.2 + t * 6) % (W * 1.2) - W * 0.1;
    const y = top + 6 + Math.sin(i * 2.1) * 6;
    const r = H * 0.05 * (0.8 + (i % 3) * 0.25);
    const gr = c.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(col, 0.7 * amt));
    gr.addColorStop(1, rgba(col, 0));
    c.fillStyle = gr;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
}

function drawConifer(c: CanvasRenderingContext2D, x: number, y: number, h: number) {
  const w = h * 0.42;
  c.beginPath();
  c.moveTo(x, y - h);
  c.lineTo(x + w * 0.55, y - h * 0.55);
  c.lineTo(x + w * 0.32, y - h * 0.55);
  c.lineTo(x + w, y);
  c.lineTo(x - w, y);
  c.lineTo(x - w * 0.32, y - h * 0.55);
  c.lineTo(x - w * 0.55, y - h * 0.55);
  c.closePath();
  c.fill();
}

type SceneState = {
  t: number;
  walk: number;
  camp: number;
  alert: number;
  scroll: number;
  phase: number;
  px: number;
  py: number;
};

function drawForeground(
  c: CanvasRenderingContext2D,
  W: number,
  H: number,
  dt: number,
  p: { groundAt: number; travelerAt: number; reduced: boolean; mood: TravelerMood },
  s: SceneState,
  pal: SkyPalette,
  stageF: number,
  embers: Particle[],
  snow: Particle[],
  flies: { x: number; y: number; ph: number }[],
) {
  const G = H * p.groundAt;
  const Tx = W * p.travelerAt;
  const size = Math.max(34, Math.min(62, H * 0.06));
  const k = size / 46;
  const slope = 0.085 * (1 - s.camp * 0.75);
  const scroll = s.scroll;
  const groundY = (x: number) => {
    const xw = x + scroll;
    return G + (Tx - x) * slope + (Math.sin(xw / 90) * 3 + Math.sin(xw / 37 + 1) * 1.5) * k * (1 - s.camp * 0.6);
  };

  const groundBase = stageMix(GROUND_BY_STAGE, stageF);
  const ground = mix(mix(groundBase, pal.land, 0.25), [6, 9, 18], pal.night * 0.78);
  const gg = c.createLinearGradient(0, G - W * slope * 0.7, 0, H);
  gg.addColorStop(0, rgba(mix(ground, pal.sun, (1 - pal.night) * 0.08)));
  gg.addColorStop(1, rgba(mix(ground, [4, 6, 12], 0.55)));
  c.fillStyle = gg;
  c.beginPath();
  c.moveTo(0, H);
  for (let x = 0; x <= W + 4; x += 4) c.lineTo(x, groundY(x));
  c.lineTo(W, H);
  c.closePath();
  c.fill();
  // 稜線のハイライト
  c.strokeStyle = rgba(mix(ground, [255, 255, 255], 0.25 + 0.2 * pal.light), 0.5);
  c.lineWidth = 1;
  c.beginPath();
  for (let x = 0; x <= W + 4; x += 4) (x === 0 ? c.moveTo : c.lineTo).call(c, x, groundY(x) + 0.5);
  c.stroke();

  // 地表の小物（草・岩・道標）
  const grassA = 1 - sstep(1.4, 2.2, stageF);
  const rockA = sstep(1.5, 2.3, stageF) * (1 - sstep(2.6, 3.2, stageF)) + sstep(3.6, 4.2, stageF);
  const n0 = Math.floor(scroll / 17) - 1;
  const n1 = Math.ceil((scroll + W) / 17) + 1;
  for (let n = n0; n <= n1; n++) {
    const xw = n * 17 + hash(n, 5) * 17;
    const x = xw - scroll;
    const y = groundY(x);
    const h1 = hash(n, 11);
    if (grassA > 0.02 && h1 < 0.7) {
      c.strokeStyle = rgba(mix(ground, [10, 30, 15], 0.45), grassA);
      c.lineWidth = 1.2;
      const gh = (4 + h1 * 7) * k;
      c.beginPath();
      c.moveTo(x, y + 2);
      c.quadraticCurveTo(x - 1, y - gh * 0.5, x - 2.5 * k, y - gh);
      c.moveTo(x + 1, y + 2);
      c.quadraticCurveTo(x + 1.5, y - gh * 0.6, x + 3 * k, y - gh * 0.85);
      c.stroke();
      if (stageF < 0.8 && h1 < 0.12) {
        c.fillStyle = h1 < 0.06 ? `rgba(255,214,120,${0.9 * pal.light})` : `rgba(255,170,200,${0.85 * pal.light})`;
        c.beginPath();
        c.arc(x - 2.5 * k, y - gh, 1.6 * k, 0, Math.PI * 2);
        c.fill();
      }
    }
    if (rockA > 0.02 && h1 > 0.78) {
      const rw = (5 + hash(n, 13) * 8) * k;
      c.fillStyle = rgba(mix(ground, [20, 22, 30], 0.35), rockA);
      c.beginPath();
      c.moveTo(x - rw, y + 2);
      c.lineTo(x - rw * 0.6, y - rw * 0.6);
      c.lineTo(x + rw * 0.2, y - rw * 0.8);
      c.lineTo(x + rw, y + 2);
      c.closePath();
      c.fill();
    }
  }

  // 道標（歩いているとき通り過ぎていく）
  const postA = 1 - s.camp;
  if (postA > 0.02) {
    const spacing = 620;
    const m0 = Math.floor(scroll / spacing) - 1;
    const m1 = Math.ceil((scroll + W) / spacing) + 1;
    for (let m = m0; m <= m1; m++) {
      const x = m * spacing + 140 - scroll;
      if (x < -40 || x > W + 40) continue;
      const y = groundY(x);
      const post = mix(mix([110, 78, 52], pal.land, 0.3), [8, 10, 18], pal.night * 0.7);
      c.fillStyle = rgba(post, postA);
      c.fillRect(x - 1.5 * k, y - 26 * k, 3 * k, 27 * k);
      c.beginPath();
      c.moveTo(x - 1.5 * k, y - 24 * k);
      c.lineTo(x + 14 * k, y - 24 * k);
      c.lineTo(x + 18 * k, y - 20.5 * k);
      c.lineTo(x + 14 * k, y - 17 * k);
      c.lineTo(x - 1.5 * k, y - 17 * k);
      c.closePath();
      c.fill();
    }
  }

  // ───── キャンプ（休憩） ─────
  const camp = s.camp;
  const fireX = Tx + size * 1.15;
  const fireY = groundY(fireX);
  if (camp > 0.01) {
    // テント
    const tx = Tx + size * 2.55;
    const ty = groundY(tx) + 1;
    const tw = size * 1.05;
    const th = size * 0.95;
    const fabric = mix(mix([214, 116, 74], pal.land, 0.2), [20, 14, 18], pal.night * 0.72);
    c.globalAlpha = camp;
    c.fillStyle = rgba(fabric);
    c.beginPath();
    c.moveTo(tx - tw, ty);
    c.lineTo(tx, ty - th);
    c.lineTo(tx + tw, ty);
    c.closePath();
    c.fill();
    c.fillStyle = rgba(mix(fabric, [0, 0, 0], 0.25));
    c.beginPath();
    c.moveTo(tx, ty - th);
    c.lineTo(tx + tw, ty);
    c.lineTo(tx + tw * 0.55, ty);
    c.closePath();
    c.fill();
    // 入口（夜は灯りがともる）
    const lit = pal.night;
    c.fillStyle = rgba(mix([40, 24, 20], [255, 196, 120], lit * 0.85));
    c.beginPath();
    c.moveTo(tx - tw * 0.3, ty);
    c.lineTo(tx - tw * 0.02, ty - th * 0.62);
    c.lineTo(tx + tw * 0.22, ty);
    c.closePath();
    c.fill();
    c.strokeStyle = rgba(mix(fabric, [255, 255, 255], 0.3), 0.5);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(tx, ty - th);
    c.lineTo(tx + tw * 1.45, ty);
    c.moveTo(tx, ty - th);
    c.lineTo(tx - tw * 1.4, ty);
    c.stroke();

    // 焚き火の光
    const flick = 0.85 + Math.sin(s.t * 9) * 0.06 + Math.sin(s.t * 23) * 0.04;
    c.globalCompositeOperation = 'lighter';
    const lr = size * (2.4 + pal.night * 2.2) * flick;
    const light = c.createRadialGradient(fireX, fireY - size * 0.2, 0, fireX, fireY - size * 0.2, lr);
    light.addColorStop(0, `rgba(255,150,70,${(0.35 + pal.night * 0.35) * camp})`);
    light.addColorStop(0.4, `rgba(255,110,40,${(0.12 + pal.night * 0.14) * camp})`);
    light.addColorStop(1, 'rgba(255,90,30,0)');
    c.fillStyle = light;
    c.fillRect(fireX - lr, fireY - size * 0.2 - lr, lr * 2, lr * 2);
    c.globalCompositeOperation = 'source-over';

    // 薪
    c.strokeStyle = rgba(mix([70, 44, 30], [10, 8, 8], pal.night * 0.5));
    c.lineCap = 'round';
    c.lineWidth = 3.2 * k;
    c.beginPath();
    c.moveTo(fireX - 9 * k, fireY + 1);
    c.lineTo(fireX + 8 * k, fireY - 3 * k);
    c.moveTo(fireX + 9 * k, fireY + 1);
    c.lineTo(fireX - 8 * k, fireY - 3 * k);
    c.stroke();
    // 石
    c.fillStyle = rgba(mix([90, 90, 98], [12, 12, 18], pal.night * 0.6));
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.ellipse(fireX + i * 5 * k, fireY + 1.5, 3 * k, 2 * k, 0, 0, Math.PI * 2);
      c.fill();
    }
    // 炎
    drawFlame(c, fireX, fireY - 2 * k, size * 0.62, s.t, camp);
    c.globalAlpha = 1;

    // 火の粉
    if (!p.reduced && Math.random() < dt * 9 * camp) {
      embers.push({ x: fireX + (Math.random() - 0.5) * 8 * k, y: fireY - size * 0.35, vx: (Math.random() - 0.5) * 10, vy: -(25 + Math.random() * 35) * k, life: 0, max: 1.2 + Math.random() * 1.6, r: 0.8 + Math.random() * 1.3 });
    }
  }
  if (embers.length) {
    c.globalCompositeOperation = 'lighter';
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.life += dt;
      if (e.life > e.max) {
        embers.splice(i, 1);
        continue;
      }
      e.x += (e.vx + Math.sin(e.life * 5 + e.max * 10) * 12) * dt;
      e.y += e.vy * dt;
      const a = (1 - e.life / e.max) * camp;
      c.fillStyle = `rgba(255,${150 + Math.floor(80 * (1 - e.life / e.max))},70,${a})`;
      c.beginPath();
      c.arc(e.x, e.y, e.r * k, 0, Math.PI * 2);
      c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  }

  // ───── 旅人 ─────
  const silhouette = mix(mix([22, 28, 40], pal.land, 0.3), [3, 4, 9], pal.night * 0.6);
  const ty = groundY(Tx);
  // ヘッドランプ（夜の登山中）
  const lamp = pal.night * (1 - camp) * (0.4 + s.walk * 0.6);
  if (lamp > 0.05) {
    c.globalCompositeOperation = 'lighter';
    const hx = Tx + 3 * k;
    const hy = ty - size * 0.9;
    const beam = c.createRadialGradient(hx, hy, 0, hx, hy, size * 3.2);
    beam.addColorStop(0, `rgba(255,240,200,${0.32 * lamp})`);
    beam.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = beam;
    c.beginPath();
    c.moveTo(hx, hy);
    c.arc(hx, hy, size * 3.2, 0.05, 0.75);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'source-over';
  }

  const pose = camp > 0.5 ? 'sit' : 'stand';
  drawTraveler(c, Tx, ty, size, pose, s.phase, s.walk, s.t, silhouette, camp > 0.5 ? camp : 0);

  // マグカップと湯気
  if (camp > 0.3) {
    const mx = Tx + size * 0.5;
    const my = groundY(mx);
    c.globalAlpha = camp;
    c.fillStyle = rgba(mix([200, 90, 60], silhouette, 0.4));
    c.fillRect(mx - 3 * k, my - 7 * k, 6 * k, 7 * k);
    c.strokeStyle = c.fillStyle;
    c.lineWidth = 1.3 * k;
    c.beginPath();
    c.arc(mx + 3.5 * k, my - 3.5 * k, 2 * k, -Math.PI / 2, Math.PI / 2);
    c.stroke();
    c.lineWidth = 1.4 * k;
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const ph = (s.t * 0.55 + i / 3) % 1;
      c.strokeStyle = `rgba(255,255,255,${0.42 * Math.sin(ph * Math.PI) * camp})`;
      c.beginPath();
      const sx = mx + (i - 1) * 1.8 * k;
      const sy = my - 9 * k - ph * 16 * k;
      c.moveTo(sx, sy);
      c.bezierCurveTo(sx + 3 * k, sy - 3 * k, sx - 3 * k, sy - 6 * k, sx + Math.sin(s.t * 2 + i) * 2 * k, sy - 10 * k);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  // 立ち止まり警告
  if (s.alert > 0.02) {
    const bx = Tx + 2 * k;
    const by = ty - size * 1.45 - Math.abs(Math.sin(s.t * 4)) * 4 * k;
    c.globalAlpha = s.alert;
    c.fillStyle = 'rgba(255,210,122,0.95)';
    c.beginPath();
    c.arc(bx, by, 9 * k, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2A1A06';
    c.font = `bold ${13 * k}px -apple-system, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('!', bx, by + 0.5);
    c.globalAlpha = 1;
  }

  // ───── 粒子：雪・ホタル ─────
  const snowA = sstep(2.5, 3.3, stageF) * (1 - sstep(3.4, 4.2, stageF) * 0.8);
  if (snowA > 0.02) {
    c.fillStyle = `rgba(255,255,255,${0.75 * snowA})`;
    const count = Math.floor(snow.length * snowA);
    for (let i = 0; i < count; i++) {
      const f = snow[i];
      if (!p.reduced) {
        f.y += dt * (0.03 + f.r * 0.02);
        f.x += dt * (Math.sin(s.t * 0.7 + i) * 0.01 - 0.008 - s.walk * 0.012 * f.r);
      }
      if (f.y > 1) f.y -= 1.02;
      if (f.x < -0.02) f.x += 1.04;
      if (f.x > 1.02) f.x -= 1.04;
      c.beginPath();
      c.arc(f.x * W, f.y * H, f.r, 0, Math.PI * 2);
      c.fill();
    }
  }
  const flyA = pal.night * (1 - sstep(1.2, 2, stageF));
  if (flyA > 0.05) {
    c.globalCompositeOperation = 'lighter';
    for (const f of flies) {
      const x = (f.x + Math.sin(s.t * 0.3 + f.ph) * 0.03) * W;
      const y = (f.y + Math.cos(s.t * 0.4 + f.ph * 1.3) * 0.02) * H;
      const a = flyA * (0.5 + 0.5 * Math.sin(s.t * 2 + f.ph * 3));
      const gr = c.createRadialGradient(x, y, 0, x, y, 6);
      gr.addColorStop(0, `rgba(220,255,140,${a})`);
      gr.addColorStop(1, 'rgba(220,255,140,0)');
      c.fillStyle = gr;
      c.fillRect(x - 6, y - 6, 12, 12);
    }
    c.globalCompositeOperation = 'source-over';
  }
}

function drawFlame(c: CanvasRenderingContext2D, x: number, y: number, h: number, t: number, a: number) {
  const layers: Array<[string, number, number]> = [
    ['rgba(255,96,40,', 1, 0.85],
    ['rgba(255,160,60,', 0.72, 0.9],
    ['rgba(255,232,170,', 0.42, 0.95],
  ];
  c.globalCompositeOperation = 'lighter';
  layers.forEach(([col, scale, alpha], li) => {
    for (let i = -1; i <= 1; i++) {
      const ph = t * (7 + li * 2 + i) + i * 2.1 + li;
      const fh = h * scale * (0.72 + 0.22 * Math.sin(ph) + 0.08 * Math.sin(ph * 2.7)) * (i === 0 ? 1 : 0.7);
      const fw = h * 0.22 * scale;
      const bx = x + i * fw * 0.6;
      const tipX = bx + Math.sin(ph * 1.3) * fw * 0.5;
      c.fillStyle = `${col}${alpha * a})`;
      c.beginPath();
      c.moveTo(bx - fw, y);
      c.quadraticCurveTo(bx - fw * 0.9, y - fh * 0.55, tipX, y - fh);
      c.quadraticCurveTo(bx + fw * 0.9, y - fh * 0.55, bx + fw, y);
      c.closePath();
      c.fill();
    }
  });
  c.globalCompositeOperation = 'source-over';
}

function drawTraveler(
  c: CanvasRenderingContext2D,
  x: number,
  yG: number,
  size: number,
  pose: 'stand' | 'sit',
  phase: number,
  walk: number,
  t: number,
  color: RGB,
  fireLight: number,
) {
  const u = size / 10;
  const col = rgba(color);
  c.strokeStyle = col;
  c.fillStyle = col;
  c.lineCap = 'round';
  c.lineJoin = 'round';

  if (pose === 'stand') {
    const bob = walk * Math.abs(Math.sin(phase)) * 0.35 * u + (1 - walk) * Math.sin(t * 1.6) * 0.08 * u;
    const lean = 0.16 * walk + 0.03;
    const hipX = x;
    const hipY = yG - 4.6 * u - bob + walk * 0.25 * u;

    // 脚
    c.lineWidth = 1.05 * u;
    for (const off of [Math.PI, 0]) {
      const ph = phase + off;
      const thigh = Math.sin(ph) * 0.5 * walk;
      const knee = Math.max(0, Math.cos(ph)) * 0.7 * walk;
      const kx = hipX + Math.sin(thigh) * 2.4 * u;
      const ky = hipY + Math.cos(thigh) * 2.4 * u;
      const shin = thigh - knee;
      const fx = kx + Math.sin(shin) * 2.3 * u;
      const fy = Math.min(yG, ky + Math.cos(shin) * 2.3 * u);
      c.globalAlpha = off === Math.PI ? 0.75 : 1;
      c.beginPath();
      c.moveTo(hipX, hipY);
      c.lineTo(kx, ky);
      c.lineTo(fx, fy);
      c.lineTo(fx + 0.8 * u, fy);
      c.stroke();
    }
    c.globalAlpha = 1;

    // 胴
    const shX = hipX + Math.sin(lean) * 3.4 * u;
    const shY = hipY - Math.cos(lean) * 3.4 * u;
    c.lineWidth = 1.9 * u;
    c.beginPath();
    c.moveTo(hipX, hipY);
    c.lineTo(shX, shY);
    c.stroke();

    // ザック
    c.save();
    c.translate((hipX + shX) / 2 - 1.25 * u, (hipY + shY) / 2 - 0.3 * u);
    c.rotate(lean);
    roundRect(c, -1.0 * u, -1.7 * u, 2.0 * u, 3.3 * u, 0.6 * u);
    c.fill();
    c.beginPath();
    c.ellipse(0, -2.0 * u, 1.05 * u, 0.5 * u, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // 腕とストック
    const swing = -Math.sin(phase) * 0.45 * walk;
    const hx = shX + Math.sin(swing + 0.35) * 2.6 * u;
    const hy = shY + Math.cos(swing + 0.35) * 2.6 * u;
    c.lineWidth = 0.85 * u;
    c.beginPath();
    c.moveTo(shX, shY);
    c.lineTo(hx, hy);
    c.stroke();
    c.lineWidth = 0.35 * u;
    c.beginPath();
    c.moveTo(hx - 0.2 * u, hy - 1.1 * u);
    c.lineTo(hx + 1.0 * u + walk * Math.sin(phase) * 0.6 * u, yG);
    c.stroke();

    // 頭と帽子
    const headX = shX + Math.sin(lean) * 1.2 * u + 0.15 * u;
    const headY = shY - 1.15 * u;
    c.beginPath();
    c.arc(headX, headY, 0.85 * u, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 0.4 * u;
    c.beginPath();
    c.moveTo(headX - 1.4 * u, headY - 0.45 * u);
    c.lineTo(headX + 1.5 * u, headY - 0.55 * u);
    c.stroke();
    c.beginPath();
    c.ellipse(headX, headY - 0.75 * u, 0.85 * u, 0.55 * u, 0, Math.PI, 0);
    c.fill();
  } else {
    // 座った姿：丸太に腰かけて焚き火を見つめる
    const logY = yG - 1.1 * u;
    c.fillStyle = rgba(mix([92, 60, 40], color, 0.5));
    roundRect(c, x - 2.4 * u, logY - 0.2 * u, 4.4 * u, 1.3 * u, 0.6 * u);
    c.fill();
    c.fillStyle = col;
    // 置いたザック
    roundRect(c, x - 4.6 * u, yG - 3.1 * u, 2.1 * u, 3.1 * u, 0.6 * u);
    c.fill();

    const breathe = Math.sin(t * 1.4) * 0.08 * u;
    const hipX = x;
    const hipY = logY - 0.4 * u;
    // 脚
    c.lineWidth = 1.05 * u;
    c.beginPath();
    c.moveTo(hipX, hipY);
    c.lineTo(hipX + 2.4 * u, hipY - 0.2 * u);
    c.lineTo(hipX + 2.7 * u, yG);
    c.lineTo(hipX + 3.4 * u, yG);
    c.stroke();
    // 胴（やや前傾）
    const lean = 0.18;
    const shX = hipX + Math.sin(lean) * 3.3 * u;
    const shY = hipY - Math.cos(lean) * 3.3 * u + breathe;
    c.lineWidth = 1.9 * u;
    c.beginPath();
    c.moveTo(hipX, hipY);
    c.lineTo(shX, shY);
    c.stroke();
    // 腕（膝の上へ）
    c.lineWidth = 0.85 * u;
    c.beginPath();
    c.moveTo(shX, shY);
    c.lineTo(shX + 1.6 * u, shY + 1.6 * u);
    c.lineTo(hipX + 2.8 * u, hipY - 0.9 * u);
    c.stroke();
    // 頭
    const headX = shX + 0.5 * u;
    const headY = shY - 1.15 * u;
    c.beginPath();
    c.arc(headX, headY, 0.85 * u, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(headX, headY - 0.6 * u, 0.9 * u, 0.6 * u, 0, Math.PI, 0);
    c.fill();

    // 炎に照らされるリムライト
    if (fireLight > 0) {
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = `rgba(255,140,60,${0.35 * fireLight})`;
      c.lineWidth = 0.5 * u;
      c.beginPath();
      c.arc(headX, headY, 0.85 * u, -Math.PI / 2.2, Math.PI / 2.2);
      c.moveTo(shX + 0.9 * u, shY);
      c.lineTo(hipX + 0.9 * u, hipY);
      c.stroke();
      c.globalCompositeOperation = 'source-over';
    }
  }
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

