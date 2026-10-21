import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { trainSound } from '@/audio/trainSound';
import { VIEWS, assets, isNight, trainLayout, url, viewFor, type TrainLayout, type TrainView } from './views';

/** 駅名標に出す文字 */
export interface StationSign {
  name: string;
  /** 駅名の上の小さな読み（かな。なければローマ字） */
  reading: string;
  prev: string;
  next: string;
}

export interface TrainStageProps {
  hour: number;
  /** 走っているか（集中中で一時停止していない） */
  moving: boolean;
  express: boolean;
  /** 雨の景色にする */
  rain: boolean;
  paused?: boolean;
  /** 走行音に速さを伝える */
  sound: boolean;
  /** 止まっている（止まる）駅。あれば駅のホームへ滑り込んで、ホームの真ん中で止まる（休憩・終着・出発前） */
  station?: StationSign | null;
  /** 集中の 1 回が終わるまでの ms と、そこで止まる駅。終わる瞬間に止まるよう、早めにブレーキをかけ始める */
  approach?: { inMs: number; sign: StationSign } | null;
}

/** 巡航の速さ（普通 = 1。特急は 1.65 倍で流れる） */
const CRUISE = { local: 1, express: 1.65 };
/** 加速（1 秒あたり）。普通は約 10 秒、特急は約 12 秒で巡航に届く */
const ACCEL = { local: 0.11, express: 0.15 };
/** ブレーキ（1 秒あたり） */
const BRAKE = 0.2;
/** 巡航 = 1 のときの流れる速さ（px/秒）。中景 : 遠景 = 10 : 1.5 */
const SPEED = { mid: 60, sky: 9, fence: 150 };
/** 電柱が窓を横切る時間（秒）と、次の電柱までの間隔（秒） */
const POLE_PASS = 0.4;
const POLE_GAP: [number, number] = [2, 5];
/** 景色の切り替え（ふわっと重ねる）時間 */
const FADE_MS = 1600;

/** 窓の中での各層の高さ・位置（窓の高さに対する割合） */
const GEO = {
  mid: { h: 0.64 },
  fence: { h: 0.3, sink: 0.04 },
  pole: { h: 1.55, top: -0.3 },
};

/** 車内（最前面）の色：外の明るさに合わせる */
function frameMood(view: TrainView, night: boolean) {
  if (view === 'night') return { filter: 'brightness(0.4) saturate(0.85)', tint: '#14204F', tintOpacity: 0.42 };
  if (view === 'rain') return night ? { filter: 'grayscale(0.15) brightness(0.45)', tint: '#14204F', tintOpacity: 0.4 } : { filter: 'grayscale(0.15) brightness(0.85)', tint: '#2D4A66', tintOpacity: 0.18 };
  if (view === 'sunset') return { filter: 'saturate(1.08) brightness(0.96)', tint: 'linear-gradient(180deg, #FF9A4A, #D9483B)', tintOpacity: 0.3 };
  return { filter: 'none', tint: '#000', tintOpacity: 0 };
}

interface Tracks {
  sky: HTMLDivElement | null;
  mid: HTMLDivElement | null;
  fence: HTMLDivElement | null;
  pole: HTMLDivElement | null;
  station: HTMLDivElement | null;
}

/** 窓の高さに合わせたときの駅のホームの幅（px） */
const stationW = (v: TrainView, wh: number) => (assets.sets[v].station.width / assets.sets[v].station.height) * wh;

/**
 * 列車の車窓：アニメ美術の画像を重ねた視差スクロール。
 *   遠景（空）/ 中景（田園）/ 近景（フェンス・電柱）を窓の形に切り抜いた中で流し、
 *   最前面に車内の絵（frame-table：窓ガラスが透過）を固定する。
 * 動かすのは各層の transform だけ（1 本の requestAnimationFrame）。
 * 時間帯・天気が変わったら、新しい組をふわっと重ねてから古い組を外す。
 *
 * 駅に止まるとき（station / approach）：駅のホーム（station.webp）を窓の右の外から流し込み、
 * 一定の減速度でブレーキをかける。減速度は「いまの速さから、ちょうど距離 D でホームの真ん中に止まる」ように決める
 *   D = (窓の幅 + ホームの幅) / 2、減速度 = 流れる速さ × v² / (2D)
 * 発車すると、ホームは加速に合わせて左へ流れ去る。
 */
export function TrainStage({ hour, moving, express, rain, paused = false, sound, station = null, approach = null }: TrainStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [L, setL] = useState<TrainLayout | null>(null);
  const view = viewFor(hour, rain);
  const night = isNight(hour);

  // 表示中の景色の組（切り替えの間は 2 組）
  const [views, setViews] = useState<{ v: TrainView; fade: boolean }[]>([{ v: view, fade: false }]);
  useEffect(() => {
    setViews((cur) => (cur[cur.length - 1].v === view ? cur : [...cur.filter((x) => x.v !== view), { v: view, fade: true }]));
    const id = setTimeout(() => setViews((cur) => cur.slice(-1)), FADE_MS + 200);
    return () => clearTimeout(id);
  }, [view]);

  const tracks = useRef(new Map<TrainView, Tracks>());
  const swayRef = useRef<HTMLDivElement>(null);

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const live = useRef({ moving, express, station: !!station, deadline: null as number | null });
  live.current.moving = moving;
  live.current.express = express;
  live.current.station = !!station;
  // 集中の 1 回が終わる時刻（1 秒ごとに届く値から、フレームの時計に直しておく）
  const approachMs = approach?.inMs ?? null;
  useEffect(() => {
    live.current.deadline = approachMs == null ? null : performance.now() + approachMs;
  }, [approachMs]);
  // 駅名標に出す駅（発車して流れ去る間も、さっきまでの駅名を出しておく）
  const lastSign = useRef<StationSign | null>(station ?? approach?.sign ?? null);
  if (station) lastSign.current = station;
  else if (approach) lastSign.current = approach.sign;
  const sign = lastSign.current;
  const state = useRef({
    v: moving ? (express ? CRUISE.express : CRUISE.local) : 0,
    off: { sky: 0, mid: 0, fence: 0 },
    pole: { x: Infinity, wait: 1 + Math.random() * 2 },
    t: 0,
    bump: 0,
    joint: 0,
    lastSound: 0,
    st: { phase: 'none' as 'none' | 'arriving' | 'stopped' | 'leaving', x: 0, dec: 0 },
  });

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setL(trainLayout(el.clientWidth, el.clientHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ほかの時間帯・天気の画像は、少したってから先に読み込んでおく（切り替えで白く抜けない）
  useEffect(() => {
    const id = setTimeout(() => {
      for (const v of VIEWS) for (const u of [url.sky(v), url.mid(v), url.fence(v), url.pole(v), url.station(v)]) new Image().src = u;
    }, 4000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!L || paused) return;
    const s = state.current;
    const wh = L.win.h;
    const ww = L.win.w;
    const k = reduced ? 0.5 : 1;
    // 1 枚ぶんの横幅（px）。この幅で割った余りだけ動かすと、つなぎ目なく流れ続ける
    const tile = (v: TrainView) => ({
      sky: (assets.sets[v].sky.width / assets.sets[v].sky.height) * wh,
      mid: (assets.sets[v].mid.width / assets.sets[v].mid.height) * wh * GEO.mid.h,
      pole: (assets.sets[v].pole.width / assets.sets[v].pole.height) * wh * GEO.pole.h,
    });
    const fenceTile = (assets.fence.width / assets.fence.height) * wh * GEO.fence.h;
    const poleW = Math.max(...VIEWS.map((v) => tile(v).pole));
    // 駅のホームが窓の外（右）から真ん中まで進む距離
    const D = (ww + Math.max(...VIEWS.map((v) => stationW(v, wh)))) / 2 + 8;
    const stSpeed = SPEED.fence * k;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      s.t += dt;
      const cfg = live.current;
      const cls = cfg.express ? 'express' : 'local';
      const target = cfg.moving ? CRUISE[cls] : 0;
      const st = s.st;
      // 駅に止まりたいか：休憩・終着・出発前、または集中の終わりまでの時間がブレーキの時間を切ったとき
      const left = cfg.deadline == null ? Infinity : (cfg.deadline - now) / 1000;
      const want = cfg.station || (s.v > 0.05 && left <= (2 * D) / (stSpeed * s.v));
      if (want && (st.phase === 'none' || st.phase === 'leaving')) {
        if (s.v < 0.02) {
          st.phase = 'stopped';
          st.x = 0;
          s.v = 0;
        } else {
          st.phase = 'arriving';
          st.x = D;
          st.dec = (stSpeed * s.v * s.v) / (2 * D);
        }
      } else if (!want && (st.phase === 'arriving' || st.phase === 'stopped')) st.phase = 'leaving';

      if (st.phase === 'arriving') {
        const v0 = s.v;
        s.v = Math.max(0, s.v - st.dec * dt);
        st.x -= stSpeed * ((v0 + s.v) / 2) * dt;
        if (s.v === 0) {
          st.phase = 'stopped';
          st.x = 0;
        }
      } else if (st.phase === 'stopped') {
        s.v = 0;
      } else {
        if (s.v < target) s.v = Math.min(target, s.v + ACCEL[cls] * dt * (1 - 0.55 * (s.v / target) ** 2));
        else s.v = Math.max(target, s.v - BRAKE * dt * (0.4 + s.v));
        if (s.v < 0.002) s.v = 0;
      }
      if (st.phase === 'leaving') {
        st.x -= stSpeed * s.v * dt;
        if (st.x < -D) st.phase = 'none';
      }
      const sp = s.v * k;
      s.off.sky += (SPEED.sky * sp + 1.2) * dt; // 雲は止まっていてもわずかに流れる
      s.off.mid += SPEED.mid * sp * dt;
      s.off.fence += SPEED.fence * sp * dt;

      // 電柱：ときどき右から現れ、一瞬で駆け抜ける
      if (s.pole.x === Infinity) {
        if (s.v > 0.25) {
          s.pole.wait -= dt * s.v;
          if (s.pole.wait <= 0) s.pole.x = ww;
        }
      } else {
        s.pole.x -= ((ww + poleW) / Math.max(0.3, POLE_PASS / s.v)) * dt * (reduced ? 0.6 : 1);
        if (s.pole.x < -poleW || s.v === 0) {
          s.pole.x = Infinity;
          s.pole.wait = POLE_GAP[0] + Math.random() * (POLE_GAP[1] - POLE_GAP[0]);
        }
      }

      for (const [v, tr] of tracks.current) {
        const t = tile(v);
        if (tr.sky) tr.sky.style.transform = `translate3d(${-(s.off.sky % t.sky).toFixed(1)}px,0,0)`;
        if (tr.mid) tr.mid.style.transform = `translate3d(${-(s.off.mid % t.mid).toFixed(1)}px,0,0)`;
        if (tr.fence) tr.fence.style.transform = `translate3d(${-(s.off.fence % fenceTile).toFixed(1)}px,0,0)`;
        if (tr.pole) tr.pole.style.transform = s.pole.x === Infinity ? 'translate3d(-9999px,0,0)' : `translate3d(${s.pole.x.toFixed(1)}px,0,0)`;
        if (tr.station) tr.station.style.transform = st.phase === 'none' ? 'translate3d(-99999px,0,0)' : `translate3d(${st.x.toFixed(1)}px,0,0)`;
      }

      // 揺れ：走っている間の小さな上下と、レールの継ぎ目のガタンゴトン
      const vn = Math.min(1, s.v);
      s.joint += SPEED.fence * s.v * dt;
      if (s.joint > 900) {
        s.joint -= 900;
        s.bump = 0.6 + vn * 0.8;
      }
      s.bump *= Math.exp(-dt * 14);
      const sway = reduced ? 0 : Math.sin(s.t * 2.3) * 0.7 * vn + Math.sin(s.t * 5.1) * 0.25 * vn + s.bump;
      if (swayRef.current) swayRef.current.style.transform = `translate3d(0,${sway.toFixed(2)}px,0)`;

      if (now - s.lastSound > 120) {
        s.lastSound = now;
        trainSound.setMotion(s.v / CRUISE[cls], cfg.express);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [L, paused, reduced]);

  useEffect(() => {
    trainSound.setEnabled(sound && !paused);
    return () => trainSound.setEnabled(false);
  }, [sound, paused]);

  const mood = frameMood(view, night);
  const bindTracks = (v: TrainView, t: Partial<Tracks> | null) => {
    const cur = tracks.current.get(v) ?? { sky: null, mid: null, fence: null, pole: null, station: null };
    if (t) tracks.current.set(v, { ...cur, ...t });
    else tracks.current.delete(v);
  };

  return (
    <div ref={rootRef} className={`absolute inset-0 overflow-hidden ${reduced || paused ? 'tr-reduced' : ''}`} style={{ background: assets.frame.edge.top }}>
      {L && (
        <>
          {/* 窓の外：窓の形に切り抜いた中だけで景色が流れる */}
          <div className="absolute overflow-hidden" style={{ left: L.win.x, top: L.win.y, width: L.win.w, height: L.win.h, background: '#8FB7DA' }}>
            {views.map(({ v, fade }) => (
              <ViewLayers key={v} view={v} L={L} fade={fade} part="back" bind={(t) => bindTracks(v, t)} />
            ))}
            {/* 電柱（フェンスより手前、線路のすぐそば） */}
            {views.map(({ v, fade }) => (
              <ViewLayers key={v} view={v} L={L} fade={fade} part="pole" bind={(t) => bindTracks(v, t)} />
            ))}
            {/* 駅のホーム（止まるときだけ右から流れ込む。いちばん手前の景色） */}
            {views.map(({ v, fade }) => (
              <ViewLayers key={v} view={v} L={L} fade={fade} part="station" sign={sign} bind={(t) => bindTracks(v, t)} />
            ))}
            {/* 雨のすじ（雨のときだけ。合成レイヤーで流すだけ） */}
            <div className="tr-rain pointer-events-none absolute -left-[30px] -right-[30px] -top-[140px] bottom-0" style={{ opacity: view === 'rain' ? 0.5 : 0, transition: `opacity ${FADE_MS}ms` }} />
            {/* 雨の夜は外も暗く */}
            <div className="pointer-events-none absolute inset-0" style={{ background: '#0A1030', opacity: view === 'rain' && night ? 0.5 : 0, transition: `opacity ${FADE_MS}ms` }} />
            {/* 窓ガラスを流れる雨粒（雨のときだけ） */}
            {view === 'rain' && <GlassDrops h={L.win.h} />}
          </div>

          {/* 最前面：車内（窓枠・テーブル）。外の明るさに合わせて色を整える */}
          <div ref={swayRef} className="pointer-events-none absolute inset-0 will-change-transform">
            <img
              src={url.frame}
              alt=""
              aria-hidden
              draggable={false}
              decoding="async"
              className="absolute max-w-none select-none"
              style={{ left: L.frame.x, top: L.frame.y, width: L.frame.w, height: L.frame.h, filter: mood.filter, transition: `filter ${FADE_MS}ms` }}
            />
            {/* 色の重ね：車内の絵の形だけに乗せる（窓の外には乗らない） */}
            <div
              className="absolute"
              style={{
                left: L.frame.x,
                top: L.frame.y,
                width: L.frame.w,
                height: L.frame.h,
                background: mood.tint,
                opacity: mood.tintOpacity,
                transition: `opacity ${FADE_MS}ms`,
                WebkitMaskImage: `url(${url.frame})`,
                maskImage: `url(${url.frame})`,
                WebkitMaskSize: '100% 100%',
                maskSize: '100% 100%',
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

/** 横に並べた画像の帯（流すとつなぎ目なく続く）。cover の幅を 1 枚ぶん越えるまで並べる */
function Strip({ src, h, ratio, cover }: { src: string; h: number; ratio: number; cover: number }) {
  const w = ratio * h;
  const n = Math.ceil(cover / w) + 1;
  return (
    <div className="flex" style={{ width: w * n, height: h }}>
      {Array.from({ length: n }, (_, i) => (
        <img key={i} src={src} alt="" aria-hidden draggable={false} decoding="async" className="block max-w-none select-none" style={{ width: w, height: h }} />
      ))}
    </div>
  );
}

/** 1 組の景色。back＝遠景・中景・フェンス、pole＝電柱、station＝駅のホーム。切り替えで後から来た組はふわっと現れる */
function ViewLayers({ view, L, fade, part, bind, sign = null }: { view: TrainView; L: TrainLayout; fade: boolean; part: 'back' | 'pole' | 'station'; bind: (t: Partial<Tracks> | null) => void; sign?: StationSign | null }) {
  const t = useRef<Partial<Tracks>>({});
  useEffect(() => {
    bind(t.current);
    return () => {
      if (part === 'back') bind(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const a = assets.sets[view];
  const wh = L.win.h;
  const midH = wh * GEO.mid.h;
  const poleH = wh * GEO.pole.h;
  if (part === 'station') {
    const sw = stationW(view, wh);
    return (
      <div className={`pointer-events-none absolute inset-0 ${fade ? 'tr-fadein' : ''}`}>
        <div className="absolute top-0 will-change-transform" style={{ left: (L.win.w - sw) / 2, width: sw, height: wh, transform: 'translate3d(-99999px,0,0)' }} ref={(el) => { t.current.station = el; }}>
          <img src={url.station(view)} alt="" aria-hidden draggable={false} decoding="async" className="block h-full w-full max-w-none select-none" />
          {sign && <SignBoard sign={sign} view={view} w={sw} h={wh} />}
        </div>
      </div>
    );
  }
  if (part === 'pole')
    return (
      <div className={`absolute inset-0 ${fade ? 'tr-fadein' : ''}`}>
        <div className="absolute left-0 will-change-transform" style={{ top: wh * GEO.pole.top, transform: 'translate3d(-9999px,0,0)' }} ref={(el) => { t.current.pole = el; }}>
          <img src={url.pole(view)} alt="" aria-hidden draggable={false} decoding="async" className="block max-w-none select-none" style={{ height: poleH, width: (a.pole.width / a.pole.height) * poleH }} />
        </div>
      </div>
    );
  return (
    <div className={`absolute inset-0 ${fade ? 'tr-fadein' : ''}`}>
      <div className="absolute left-0 top-0 will-change-transform" ref={(el) => { t.current.sky = el; }}>
        <Strip src={url.sky(view)} h={wh} ratio={a.sky.width / a.sky.height} cover={L.win.w} />
      </div>
      <div className="absolute left-0 will-change-transform" style={{ top: wh - midH }} ref={(el) => { t.current.mid = el; }}>
        <Strip src={url.mid(view)} h={midH} ratio={a.mid.width / a.mid.height} cover={L.win.w} />
      </div>
      {/* 手前のフェンス（中景より速く流れる。色は時間帯・天気ごとに合わせた画像） */}
      <div className="absolute left-0 will-change-transform" style={{ top: wh * (1 - GEO.fence.h + GEO.fence.sink) }} ref={(el) => { t.current.fence = el; }}>
        <Strip src={url.fence(view)} h={wh * GEO.fence.h} ratio={assets.fence.width / assets.fence.height} cover={L.win.w} />
      </div>
    </div>
  );
}

/** 駅名標（ホーロー看板）の上に、明朝の駅名と前後の駅を刷る。位置は assets.json の看板の割合 */
function SignBoard({ sign, view, w, h }: { sign: StationSign; view: TrainView; w: number; h: number }) {
  const st = assets.sets[view].station;
  const g = st.sign;
  const bw = g.w * w;
  const bh = g.h * h;
  const upper = (g.line - g.y) / g.h;
  // 長い駅名は看板の幅に収まるよう小さくする
  const nameSize = Math.min(bh * upper * 0.62, (bw * 0.84) / Math.max(1, sign.name.length * 1.18));
  const dark = st.ink !== '#EFE6D2';
  return (
    <div
      className="tr-sign-ink absolute select-none"
      style={{ left: g.x * w, top: g.y * h, width: bw, height: bh, color: st.ink, mixBlendMode: dark ? 'multiply' : 'normal', opacity: dark ? 0.92 : 0.86 }}
      aria-label={`${sign.name}駅`}
    >
      <div className="flex flex-col items-center justify-center leading-none" style={{ height: `${upper * 100}%`, paddingTop: bh * 0.04 }}>
        <span className="whitespace-nowrap font-bold" style={{ fontSize: bh * 0.11, letterSpacing: '0.2em', opacity: 0.85 }}>
          {sign.reading}
        </span>
        <span className="mt-[4%] whitespace-nowrap font-extrabold" style={{ fontSize: nameSize, letterSpacing: '0.14em' }}>
          {sign.name}
        </span>
      </div>
      <div className="flex justify-between whitespace-nowrap font-bold" style={{ height: `${(1 - upper) * 100}%`, padding: `${bh * 0.05}px ${bw * 0.07}px 0`, fontSize: bh * 0.13 }}>
        <span>{sign.prev}</span>
        <span>{sign.next}</span>
      </div>
    </div>
  );
}

/** 雨粒の並び（決まった配置。毎回変わらない） */
const DROPS = Array.from({ length: 14 }, (_, i) => {
  const r = (n: number) => {
    const a = Math.sin((i + 1) * n) * 43758.5453;
    return a - Math.floor(a);
  };
  return { x: 4 + r(12.9) * 92, size: 5 + r(78.2) * 6, dur: 5 + r(39.4) * 7, delay: -r(93.1) * 12 };
});
const BEADS = Array.from({ length: 34 }, (_, i) => {
  const r = (n: number) => {
    const a = Math.sin((i + 3) * n) * 12543.1234;
    return a - Math.floor(a);
  };
  return { x: r(17.3) * 100, y: r(41.9) * 100, s: 1.5 + r(7.7) * 3 };
});

/** 窓ガラスを流れる雨粒：止まりかけては流れ落ちる粒と、ガラスに残る小さな水滴（transform だけで動かす） */
function GlassDrops({ h }: { h: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {BEADS.map((b, i) => (
        <span key={i} className="tr-bead" style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.s, height: b.s }} />
      ))}
      {DROPS.map((d, i) => (
        <div key={i} className="tr-drop-lane" style={{ left: `${d.x}%`, height: h, animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }}>
          <div className="tr-drop" style={{ width: d.size, height: d.size * 1.25 }} />
        </div>
      ))}
    </div>
  );
}
