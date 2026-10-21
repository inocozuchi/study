import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { AppWindow, AudioLines, Clock3, Coffee, Layers, Map as MapIcon, Maximize2, Music, Navigation, Pause, Play, PlaneLanding, VolumeX } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { hourFor } from '@/lib/scene';
import { useTimer } from '@/store/TimerStore';
import { MIN, fmtTimer } from '@/lib/time';
import { clampZoom } from './FlightMap';
import { flightCam, setFlightView, useFlightView } from './view';
import { WindowView, windowUrls } from './WindowView';
import { decodeAll } from '@/lib/preload';
import type { DesignSessionProps } from '../types';

const HOLD_MS = 1100;

/** 大きな数字と小さな単位（1h 22m / 22m 08s） */
function Duration({ ms, big = 'text-[34px]' }: { ms: number; big?: string }) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts: [string, string][] = h ? [[String(h), 'h'], [String(m), 'm']] : [[String(m), 'm'], [String(s % 60).padStart(2, '0'), 's']];
  return (
    <span className="fl-num flex items-baseline gap-1">
      {parts.map(([v, u]) => (
        <span key={u} className="flex items-baseline">
          <span className={`${big} font-bold leading-none tracking-tight`}>{v}</span>
          <span className="ml-0.5 text-[14px] font-semibold text-white/45">{u}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * 航空デザイン：フライト中の HUD（地図は背景のシーン）。
 *  - 地図をタップで休憩、どこでも 1.1 秒の長押しで着陸（旅を終える）。ドラッグで地図を動かし、2 本指で拡大・縮小
 *  - 左上：一時停止・機内の音・表示の切り替え・音楽。右上：ルート全体・機体を追う・地図のレイヤー・窓の外
 *  - 下：残り時間と残り距離（1 km ずつ減る）
 */
export function FlightSession({ onMusic, onEnd }: DesignSessionProps) {
  const t = useTimer();
  const { timer } = t;
  const { settings, updateSettings } = useApp();
  const view = useFlightView();
  const [hold, setHold] = useState<{ x: number; y: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: boolean; start: { x: number; y: number }; pinch: { d: number; zoom: number } | null }>({ moved: false, start: { x: 0, y: 0 }, pinch: null });

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);
  // 機窓ビューの画像は先に読み込んでおく（切り替えた瞬間に白い窓を見せない）
  useEffect(() => {
    void decodeAll(windowUrls());
  }, []);

  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHold(null);
  };

  const onDown = (e: RPointerEvent) => {
    if (e.target !== e.currentTarget) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    flightCam.cx.stop();
    flightCam.cy.stop();
    flightCam.zoom.stop();
    if (pointers.current.size === 1) {
      gesture.current = { moved: false, start: { x: e.clientX, y: e.clientY }, pinch: null };
      setHold({ x: e.clientX, y: e.clientY });
      holdTimer.current = setTimeout(() => {
        navigator.vibrate?.(30);
        setHold(null);
        pointers.current.clear();
        onEnd();
      }, HOLD_MS);
    } else {
      cancelHold();
      const [a, b] = [...pointers.current.values()];
      gesture.current = { moved: true, start: gesture.current.start, pinch: { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: flightCam.zoom.get() } };
    }
  };
  const onMove = (e: RPointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const g = gesture.current;
    if (pointers.current.size >= 2 && g.pinch) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...pointers.current.values()];
      flightCam.zoom.set(clampZoom((g.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, g.pinch.d)));
      if (view.camera !== 'free') setFlightView({ camera: 'free' });
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (!g.moved && Math.hypot(e.clientX - g.start.x, e.clientY - g.start.y) < 10) return;
    if (!g.moved) {
      g.moved = true;
      cancelHold();
      if (view.camera !== 'free') setFlightView({ camera: 'free' });
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const z = flightCam.zoom.get();
    flightCam.cx.set(flightCam.cx.get() - dx / z);
    flightCam.cy.set(flightCam.cy.get() - dy / z);
  };
  const onUp = (e: RPointerEvent) => {
    const had = pointers.current.delete(e.pointerId);
    const tapped = had && holdTimer.current != null && !gesture.current.moved;
    cancelHold();
    if (!tapped) return;
    if (timer.phase === 'focus') {
      navigator.vibrate?.(10);
      t.finishFocus();
    }
  };

  // 退場中は表示を固定する
  const present = useIsPresent();
  const frozen = useRef({ phase: timer.phase, running: timer.running });
  if (present) frozen.current = { phase: timer.phase, running: timer.running };
  const { phase, running } = frozen.current;
  const rest = phase === 'break';
  const waiting = phase === 'idle';

  const b = timer.booking;
  const km = b ? Math.max(0, Math.ceil(b.km * (1 - (t.journeyProgress ?? 0)))) : null;
  const remaining = t.journeyRemainingMs ?? t.remainingMs ?? t.elapsedMs;
  const status = rest ? '休憩中 · 巡航高度で待機' : waiting ? '待機中' : running ? `${b?.from ?? ''} → ${b?.to ?? ''} · 巡航中` : '一時停止中';

  return (
    <div className="fl-root absolute inset-0 touch-none select-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onContextMenu={(e) => e.preventDefault()}>
      {/* 大きな時計（表示の切り替え） */}
      <AnimatePresence>
        {view.clock && (
          <motion.div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#050608]/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-white/55">{rest ? '休憩の残り' : '到着まで'}</p>
              <p className="fl-num mt-1 text-[76px] font-bold leading-none tracking-tight">{fmtTimer(rest ? t.remainingMs ?? 0 : remaining)}</p>
              {b && <p className="fl-num mt-2 text-[15px] text-white/60">{b.from} → {b.to} · {km?.toLocaleString()} km</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{view.window && <WindowView seat={b?.seat} hour={hourFor(settings.sky, new Date())} />}</AnimatePresence>

      {/* 上の真ん中：レーダー地図 ⇄ 機窓ビュー（いつでもワンタップで切り替え） */}
      <ViewSwitch window={view.window} onChange={(w) => setFlightView({ window: w })} />

      {/* 左上 */}
      <div className="pointer-events-none absolute left-4 top-[calc(var(--safe-top)+1px)] z-40 flex flex-col gap-2.5">
        <GlassButton label={running ? '一時停止' : '再開'} onClick={() => (phase === 'focus' ? t.toggle() : rest ? t.skipBreak() : t.start())}>
          {phase === 'focus' && running ? <Pause size={18} fill="currentColor" strokeWidth={0} /> : <Play size={18} fill="currentColor" strokeWidth={0} />}
        </GlassButton>
        <GlassButton label={settings.flightCabin ? '機内の音を消す' : '機内の音を鳴らす'} active={settings.flightCabin} onClick={() => updateSettings({ flightCabin: !settings.flightCabin })}>
          {settings.flightCabin ? <AudioLines size={18} /> : <VolumeX size={18} />}
        </GlassButton>
        <GlassButton label="大きな時計" active={view.clock} onClick={() => setFlightView({ clock: !view.clock })}>
          <Clock3 size={18} />
        </GlassButton>
        <GlassButton label="サウンド" onClick={onMusic}>
          <Music size={17} />
        </GlassButton>
      </div>

      {/* 右上 */}
      {/* 右上：地図の操作（機窓ビューの間は隠す） */}
      <div className={`fl-glass absolute right-4 top-[calc(var(--safe-top)+1px)] z-30 flex flex-col rounded-full transition-opacity duration-300 ${view.window ? 'pointer-events-none opacity-0' : 'pointer-events-auto'}`} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
        {[
          { key: 'route', label: 'ルート全体', on: view.camera === 'route', Icon: Maximize2, act: () => setFlightView({ camera: 'route' }) },
          { key: 'plane', label: '機体を追う', on: view.camera === 'plane', Icon: Navigation, act: () => setFlightView({ camera: 'plane' }) },
          { key: 'layer', label: '地図のレイヤー', on: view.layer === 'lines', Icon: Layers, act: () => setFlightView({ layer: view.layer === 'dark' ? 'lines' : 'dark' }) },
        ].map(({ key, label, on, Icon, act }) => (
          <button key={key} onClick={act} aria-label={label} aria-pressed={on} className={`btn-icon fl-btn ${on ? 'bg-white/20 text-[#FFD60A]' : ''}`}>
            <Icon size={17} />
          </button>
        ))}
      </div>

      {/* 下：計器 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]">
        {/* 役割がひと目で分かる 2 つのボタン：休憩（巡航で待機）/ 長押しで着陸。休憩中は「ここで着陸」 */}
        <div className="pointer-events-auto mx-auto mb-2.5 grid max-w-md grid-cols-2 gap-2" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          {rest ? (
            <HoldButton onDone={onEnd} className="col-span-2 h-11 rounded-full">
              <PlaneLanding size={16} /> ここで旅を終える（長押しで着陸）
            </HoldButton>
          ) : (
            !waiting && (
              <>
                <button
                  onClick={() => {
                    navigator.vibrate?.(10);
                    t.finishFocus();
                  }}
                  className="fl-glass flex h-12 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold"
                >
                  <Coffee size={16} /> 休憩する
                </button>
                <HoldButton onDone={onEnd} className="h-12 rounded-full">
                  <PlaneLanding size={16} /> 長押しで着陸
                </HoldButton>
              </>
            )
          )}
        </div>
        <div className="fl-glass pointer-events-auto rounded-[26px] px-5 pb-3.5 pt-3" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <p className="fl-num truncate text-[12px] font-semibold text-[#FF9F0A]">{status}</p>
          <div className="mt-1.5 flex items-end justify-between">
            <div>
              <p className="text-[11.5px] text-white/50">{rest ? '休憩の残り' : '残り時間'}</p>
              <Duration ms={rest ? t.remainingMs ?? 0 : remaining} />
            </div>
            {rest || waiting ? (
              <button onClick={() => (rest ? t.skipBreak() : t.start())} className="fl-cta h-11 px-5 text-[15px]">
                離陸
              </button>
            ) : (
              <div className="text-right">
                <p className="text-[11.5px] text-white/50">残り距離</p>
                <p className="fl-num flex items-baseline justify-end">
                  <span className="text-[34px] font-bold leading-none tracking-tight">{km?.toLocaleString() ?? '—'}</span>
                  <span className="ml-1 text-[14px] font-semibold text-white/45">km</span>
                </p>
              </div>
            )}
          </div>
          {b && (
            <div className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-white/12">
              <div className="h-full rounded-full bg-white transition-[width] duration-1000 ease-linear" style={{ width: `${(t.journeyProgress ?? 0) * 100}%` }} />
            </div>
          )}
          {!b && <p className="mt-1 text-[11px] text-white/45">集中 {Math.round(t.journeyFocusMs / MIN)} 分</p>}
        </div>
      </div>

      {/* 長押しの進行リング */}
      <AnimatePresence>
        {hold && (
          <motion.svg key="hold" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="pointer-events-none fixed z-40 h-24 w-24" style={{ left: hold.x - 48, top: hold.y - 48 }} viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="38" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" strokeWidth="6" />
            <motion.circle cx="48" cy="48" r="38" fill="none" stroke="#FF9F0A" strokeWidth="6" strokeLinecap="round" transform="rotate(-90 48 48)" strokeDasharray={2 * Math.PI * 38} initial={{ strokeDashoffset: 2 * Math.PI * 38 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: HOLD_MS / 1000, ease: 'linear' }} />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  );
}

/** レーダー地図 ⇄ 機窓ビュー：大きなピルのセグメント。選択の面は index × 100% の x で滑る（layoutId は使わない） */
function ViewSwitch({ window: on, onChange }: { window: boolean; onChange: (w: boolean) => void }) {
  const items = [
    { w: false, label: 'レーダー地図', Icon: MapIcon },
    { w: true, label: '機窓ビュー', Icon: AppWindow },
  ];
  return (
    <div
      className="fl-glass pointer-events-auto absolute left-1/2 top-[calc(var(--safe-top)+1px)] z-40 flex h-[42px] w-[min(230px,52vw)] -translate-x-1/2 rounded-full p-1"
      role="tablist"
      aria-label="表示の切り替え"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <motion.span className="absolute bottom-1 left-1 top-1 rounded-full bg-white/20" style={{ width: 'calc(50% - 4px)' }} initial={false} animate={{ x: on ? '100%' : '0%' }} />
      {items.map(({ w, label, Icon }) => (
        <button key={label} role="tab" aria-selected={on === w} onClick={() => onChange(w)} className={`relative z-10 flex flex-1 items-center justify-center gap-1 text-[12.5px] font-semibold ${on === w ? 'text-[#FFD60A]' : 'text-white/70'}`}>
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  );
}

/** 長押し（1.1 秒）で決まるボタン。押している間、左からアンバーの帯が満ちていく。途中で離すと取り消し */
function HoldButton({ onDone, className = '', children }: { onDone: () => void; className?: string; children: ReactNode }) {
  const [held, setHeld] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHeld(false);
  };
  useEffect(() => stop, []);
  return (
    <button
      onPointerDown={() => {
        setHeld(true);
        timer.current = setTimeout(() => {
          timer.current = null;
          setHeld(false);
          navigator.vibrate?.(30);
          onDone();
        }, HOLD_MS);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className={`fl-glass relative flex items-center justify-center gap-1.5 overflow-hidden text-[14px] font-semibold text-[#FFD60A] ${className}`}
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 bg-[#FF9F0A]/35" style={{ width: held ? '100%' : '0%', transition: held ? `width ${HOLD_MS}ms linear` : 'width 200ms ease-out' }} />
      <span className="relative flex items-center gap-1.5">{children}</span>
    </button>
  );
}

function GlassButton({ label, onClick, active = false, children }: { label: string; onClick: () => void; active?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      aria-label={label}
      aria-pressed={active}
      className={`btn-icon fl-btn fl-glass pointer-events-auto ${active ? 'text-[#FFD60A]' : ''}`}
    >
      {children}
    </button>
  );
}
