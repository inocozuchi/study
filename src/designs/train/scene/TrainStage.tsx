import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { skyAt, rgba } from '@/lib/scene';
import { trainSound } from '@/audio/trainSound';
import { LAYER_SPEED, TILE, trainLayout, type TrainLayout } from './layout';
import { CROSSING_W, CloudTiles, CountryLights, CountryTiles, Crossing, MountainTiles, SIGNAL_W, STATION_W, SignalStop, Station, TrackTiles } from './outside';
import { Interior } from './Interior';

/** 止まる場所の種類：出発駅（ホーム）・途中の駅（休憩）・信号場（一時停止）・終着駅（旅の終わり） */
export type StopKind = 'origin' | 'station' | 'signal' | 'terminal';

export interface StopInfo {
  kind: StopKind;
  name: string;
  roman: string;
  prev: string;
  next: string;
}

export interface TrainStageProps {
  hour: number;
  /** 走っているか（集中中で一時停止していない） */
  moving: boolean;
  express: boolean;
  /** 止まるときにどこへ止まるか */
  stop: StopInfo;
  paused?: boolean;
  /** 走行音に速さを伝える */
  sound: boolean;
}

/** 巡航の速さ（普通 = 1。特急は 1.65 倍で流れる） */
const CRUISE = { local: 1, express: 1.65 };
/** 加速（1 秒あたり）。普通は約 10 秒、特急は約 12 秒で巡航に届く */
const ACCEL = { local: 0.11, express: 0.15 };
/** ブレーキ（1 秒あたり）。止まる位置から逆算して、駅の真ん中にぴたりと止める */
const BRAKE = 0.16;
/** レールの継ぎ目（ガタンゴトン）の間隔と、2 つめの音までの距離（線路ぎわの px） */
const JOINT = 1100;
const JOINT_GAP = 150;
const CROSSING_EVERY = 4200;

/**
 * 列車の車窓：5 層の視差スクロール。
 *   L1 空と雲 / L2 遠くの山 / L3 田園・集落 / L4 線路ぎわ（電柱・踏切・駅） / L5 車内の窓枠
 * 1 本の requestAnimationFrame で、各層の transform だけを書き換える（30fps まで）。
 * 速さ v は加速・減速し、止まるときは駅（または信号場）が窓の真ん中に来るよう逆算してブレーキをかける。
 */
export function TrainStage({ hour, moving, express, stop, paused = false, sound }: TrainStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [L, setL] = useState<TrainLayout | null>(null);
  const tracks = useRef<{ clouds: HTMLDivElement | null; mountains: HTMLDivElement | null; country: HTMLDivElement | null; lights: HTMLDivElement | null; track: HTMLDivElement | null; crossing: HTMLDivElement | null; stop: HTMLDivElement | null; sway: HTMLDivElement | null }>({
    clouds: null,
    mountains: null,
    country: null,
    lights: null,
    track: null,
    crossing: null,
    stop: null,
    sway: null,
  });

  // 止まっている場所（窓の外の L4 の世界座標）。変わったときだけ描き直す
  const [shownStop, setShownStop] = useState<(StopInfo & { worldX: number }) | null>(null);

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const live = useRef({ moving, express, stop, sound });
  live.current = { moving, express, stop, sound };

  const state = useRef({
    v: moving ? (express ? CRUISE.express : CRUISE.local) : 0,
    off: { clouds: 0, mountains: 0, country: 0, track: 0 },
    braking: false,
    stopX: null as number | null,
    bump: 0,
    bumpQueue: [] as number[],
    t: 0,
    lastSound: 0,
    written: {} as Record<string, string>,
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

  // はじめから止まっているときは、出発駅を窓の真ん中に置く
  useEffect(() => {
    if (!L) return;
    const s = state.current;
    if (s.v === 0 && s.stopX == null) {
      s.stopX = s.off.track + L.win.w / 2;
      setShownStop({ ...live.current.stop, worldX: s.stopX });
    }
  }, [L]);

  // 止まっている間に行き先が変わった（休憩 → 旅の終わり など）ときは、看板だけ書き換える
  useEffect(() => {
    setShownStop((cur) => (cur && cur.kind !== 'signal' && stop.kind !== 'signal' ? { ...stop, worldX: cur.worldX } : cur));
  }, [stop.kind, stop.name, stop.prev, stop.next]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!L || paused) return;
    const s = state.current;
    const T = tracks.current;
    const cx = L.win.w / 2;
    const k = reduced ? 0.5 : 1;
    let raf = 0;
    let last = performance.now();
    const write = (key: string, el: HTMLElement | null, v: string) => {
      if (!el || s.written[key] === v) return;
      s.written[key] = v;
      el.style.transform = v;
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / 31) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      s.t += dt;
      const cfg = live.current;
      const cls = cfg.express ? 'express' : 'local';
      const target = cfg.moving ? CRUISE[cls] : 0;
      let step: number;
      if (target > 0) {
        s.braking = false;
        if (s.v < target) s.v = Math.min(target, s.v + ACCEL[cls] * dt * (1 - 0.55 * (s.v / target) ** 2));
        else s.v = Math.max(target, s.v - BRAKE * dt);
        step = s.v * LAYER_SPEED.track * dt;
      } else if (s.v > 0) {
        if (!s.braking) {
          // 今の速さで止まれる距離の先に、駅（信号場）を置く
          s.braking = true;
          const speed = s.v * LAYER_SPEED.track;
          const dist = (speed * speed) / (2 * BRAKE * LAYER_SPEED.track);
          s.stopX = s.off.track + dist + cx;
          setShownStop({ ...cfg.stop, worldX: s.stopX });
        }
        const remain = (s.stopX ?? 0) - cx - s.off.track;
        if (remain <= 0.5) {
          step = Math.max(0, remain);
          s.v = 0;
        } else {
          s.v = Math.sqrt(2 * BRAKE * LAYER_SPEED.track * remain) / LAYER_SPEED.track;
          step = Math.min(remain, s.v * LAYER_SPEED.track * dt);
        }
      } else {
        step = 0;
      }
      const ds = (step / LAYER_SPEED.track) * k;
      const prevTrack = s.off.track;
      s.off.track += step * (target > 0 ? k : 1);
      s.off.country += ds * LAYER_SPEED.country;
      s.off.mountains += ds * LAYER_SPEED.mountains;
      // 雲は止まっていてもゆっくり流れる
      s.off.clouds += ds * LAYER_SPEED.clouds + dt * 2;

      const tx = (o: number, tile: number) => `translate3d(${-(o % tile).toFixed(1)}px,0,0)`;
      write('clouds', T.clouds, tx(s.off.clouds, TILE.clouds));
      write('mountains', T.mountains, tx(s.off.mountains, TILE.mountains));
      const country = tx(s.off.country, TILE.country);
      write('country', T.country, country);
      write('lights', T.lights, country);
      write('track', T.track, tx(s.off.track, TILE.track));

      // 踏切（一定の間隔で現れる）
      let crossX = CROSSING_EVERY * 0.5 - (s.off.track % CROSSING_EVERY);
      if (crossX < -CROSSING_W - 40) crossX += CROSSING_EVERY;
      write('crossing', T.crossing, `translate3d(${crossX.toFixed(1)}px,0,0)`);

      // 駅・信号場：窓の真ん中に止まる位置から、いまの位置を出す
      if (s.stopX != null && T.stop) {
        const w = T.stop.dataset.w ? Number(T.stop.dataset.w) : STATION_W;
        const sx = s.stopX - s.off.track - w / 2;
        if (sx < -w - 40 && s.v > 0) {
          s.stopX = null;
          T.stop.style.visibility = 'hidden';
        } else {
          T.stop.style.visibility = '';
          write('stop', T.stop, `translate3d(${sx.toFixed(1)}px,0,0)`);
        }
      }

      // 揺れ：走っている間の小さな上下と、レールの継ぎ目のガタンゴトン
      const vn = s.v / CRUISE.local;
      if (Math.floor(s.off.track / JOINT) !== Math.floor(prevTrack / JOINT)) s.bumpQueue.push(s.t, s.t + JOINT_GAP / Math.max(60, s.v * LAYER_SPEED.track));
      while (s.bumpQueue.length && s.bumpQueue[0] <= s.t) {
        s.bumpQueue.shift();
        s.bump = Math.min(1.6, 0.6 + vn * 0.7);
      }
      s.bump *= Math.exp(-dt * 16);
      const sway = reduced ? 0 : Math.sin(s.t * 2.3) * 0.7 * Math.min(1, vn) + Math.sin(s.t * 5.1) * 0.25 * Math.min(1, vn) + s.bump;
      write('sway', T.sway, `translate3d(0,${sway.toFixed(2)}px,0)`);

      // 走行音（1 秒に 8 回まで）
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

  const sky = skyAt(hour);
  const glow = Math.max(0, 1 - Math.abs(hour - 18) / 1.4) + Math.max(0, 1 - Math.abs(hour - 6) / 1.2);
  const night = sky.night;
  const n = (tile: number) => (L ? Math.ceil(L.win.w / tile) + 1 : 1);

  return (
    <div ref={rootRef} className={`absolute inset-0 overflow-hidden ${reduced || paused ? 'tr-reduced' : ''}`} style={{ background: '#3E2B20' }}>
      {L && (
        <>
          {/* 窓の外（L1〜L4）。窓の形に切り抜く */}
          <div className="absolute overflow-hidden" style={{ left: L.win.x, top: L.win.y, width: L.win.w, height: L.win.h, borderRadius: 18 }}>
            {/* L1 空 */}
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${rgba(sky.top)} 0%, ${rgba(sky.mid)} 45%, ${rgba(sky.bot)} 62%)`, transition: 'background 2s' }} />
            <div ref={(el) => { tracks.current.clouds = el; }} className="absolute left-0 top-0 will-change-transform" style={{ opacity: 1 - night * 0.6 }}>
              <CloudTiles h={L.win.h} hz={L.horizon} n={n(TILE.clouds)} />
            </div>
            {/* L2 遠くの山 */}
            <div ref={(el) => { tracks.current.mountains = el; }} className="absolute left-0 top-0 will-change-transform">
              <MountainTiles h={L.win.h} hz={L.horizon} n={n(TILE.mountains)} />
            </div>
            {/* L3 田園 */}
            <div ref={(el) => { tracks.current.country = el; }} className="absolute left-0 top-0 will-change-transform">
              <CountryTiles h={L.win.h} hz={L.horizon} n={n(TILE.country)} />
            </div>
            {/* 時間帯の色（タイルは描き直さず、半透明を重ねる） */}
            <div className="pointer-events-none absolute inset-0" style={{ background: '#0E1631', opacity: night * 0.62, transition: 'opacity 2s' }} />
            <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,150,90,0), #FF9A5C)', opacity: Math.min(1, glow) * 0.2, transition: 'opacity 2s' }} />
            <div ref={(el) => { tracks.current.lights = el; }} className="pointer-events-none absolute left-0 top-0 will-change-transform" style={{ opacity: Math.max(0, night - 0.2) * 1.25, transition: 'opacity 2s' }}>
              <CountryLights h={L.win.h} hz={L.horizon} n={n(TILE.country)} />
            </div>
            {/* L4 線路ぎわ */}
            <div className="absolute inset-0">
              <div ref={(el) => { tracks.current.track = el; }} className="absolute left-0 top-0 will-change-transform">
                <TrackTiles h={L.win.h} hz={L.horizon} n={n(TILE.track)} />
              </div>
              <div ref={(el) => { tracks.current.crossing = el; }} className="absolute left-0 top-0 will-change-transform">
                <Crossing h={L.win.h} />
              </div>
              {shownStop && (
                <div
                  ref={(el) => { tracks.current.stop = el; }}
                  data-w={shownStop.kind === 'signal' ? SIGNAL_W : STATION_W}
                  className="absolute left-0 top-0 will-change-transform"
                  style={{ transform: `translate3d(${(shownStop.worldX - state.current.off.track - (shownStop.kind === 'signal' ? SIGNAL_W : STATION_W) / 2).toFixed(1)}px,0,0)` }}
                >
                  {shownStop.kind === 'signal' ? <SignalStop h={L.win.h} /> : <Station h={L.win.h} name={shownStop.name} roman={shownStop.roman} prev={shownStop.prev} next={shownStop.next} terminal={shownStop.kind === 'terminal'} />}
                </div>
              )}
              {/* 夜は線路ぎわも暗く */}
              <div className="pointer-events-none absolute inset-0" style={{ background: '#0E1631', opacity: night * 0.45, transition: 'opacity 2s' }} />
            </div>
          </div>

          {/* L5 車内（揺れは外側の div の transform だけ） */}
          <div ref={(el) => { tracks.current.sway = el; }} className="absolute inset-0 will-change-transform">
            {/* ガラスの映り込みと内側の影 */}
            <div
              className="pointer-events-none absolute"
              style={{
                left: L.win.x,
                top: L.win.y,
                width: L.win.w,
                height: L.win.h,
                borderRadius: 18,
                boxShadow: 'inset 0 14px 28px -6px rgba(0,0,0,0.45), inset 0 -10px 22px -10px rgba(0,0,0,0.35), inset 10px 0 22px -12px rgba(0,0,0,0.35), inset -10px 0 22px -12px rgba(0,0,0,0.35)',
                background: 'linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.09) 38%, rgba(255,255,255,0) 46%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.05) 66%, rgba(255,255,255,0) 72%)',
              }}
            />
            <Interior L={L} />
            {/* コーヒーの湯気 */}
            <svg className="pointer-events-none absolute overflow-visible" style={{ left: L.W / 2 + Math.min(250, L.win.w * 0.62) * 0.24 - 10, top: L.win.y + L.win.h + 10 + 24 - 40, width: 20, height: 26 }} viewBox="-10 -26 20 26" aria-hidden>
              <g className="tr-steam" opacity="0.7">
                <path d="M-2 -2 Q-5 -8 -1 -13 Q3 -18 -1 -24" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                <path d="M3 -3 Q1 -8 4 -12 Q6 -16 3 -20" stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" />
              </g>
            </svg>
          </div>
          {/* 天井の灯り（夜ほど暖かく） */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2" style={{ background: 'radial-gradient(60% 50% at 50% 0%, rgba(255,214,150,0.35), rgba(255,214,150,0) 70%)', opacity: 0.25 + night * 0.75, transition: 'opacity 2s' }} />
        </>
      )}
    </div>
  );
}
