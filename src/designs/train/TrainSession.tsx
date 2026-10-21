import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { Check, Music, Pointer } from 'lucide-react';
import { useTimer } from '@/store/TimerStore';
import { useApp } from '@/store/AppStore';
import { fmtDuration, fmtTimer, MIN } from '@/lib/time';
import { springBouncy } from '@/lib/motion';
import { destinationOf, stopFor } from './stations';
import { CLASSES, classOf } from './booking/line';
import type { TrainClass } from '@/types';
import type { DesignSessionProps } from '../types';

const HOLD_MS = 1100;

/** 方向幕の種別の色（特急は赤、急行は朱、快速は緑、普通は紺） */
const ROLL: Record<TrainClass, string> = { local: '#2E3A52', rapid: '#3E5A3A', kyuko: '#A2582C', express: '#8E3A30' };

/** 方向幕：種別と行き先 */
export function RollSign({ cls, goal, className = '' }: { cls: TrainClass; goal: string; className?: string }) {
  return (
    <span className={`tr-roll inline-flex items-stretch overflow-hidden rounded-[6px] text-[#1F2328] ${className}`}>
      <span className="grid place-items-center px-2.5 text-[15px] font-extrabold tracking-[0.2em] text-[#F4EEDD]" style={{ background: ROLL[cls] }}>
        {CLASSES[cls].label}
      </span>
      <span className="max-w-[56vw] truncate px-3 py-1 text-[17px] font-extrabold tracking-[0.12em]">{goal}<span className="ml-0.5 text-[13px]">行</span></span>
    </span>
  );
}

/** 列車デザイン：集中中・休憩中の HUD。タップで停車（休憩）、長押しで終着（旅を終える） */
export function TrainSession({ onMusic, onEnd }: DesignSessionProps) {
  const t = useTimer();
  const { timer } = t;
  const { settings, subjectById } = useApp();
  const subject = subjectById(timer.subjectId);
  const [hint, setHint] = useState(true);
  const [hold, setHold] = useState<{ x: number; y: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const cls = classOf(timer.booking?.cls ?? settings.trainClass);

  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(false), 5000);
    return () => clearTimeout(id);
  }, [hint]);

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  const cancel = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHold(null);
  };
  const onDown = (e: RPointerEvent) => {
    if (e.target !== e.currentTarget) return;
    start.current = { x: e.clientX, y: e.clientY };
    setHold({ x: e.clientX, y: e.clientY });
    holdTimer.current = setTimeout(() => {
      navigator.vibrate?.(30);
      setHold(null);
      onEnd();
    }, HOLD_MS);
  };
  const onMove = (e: RPointerEvent) => {
    if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 14) cancel();
  };
  const onUp = () => {
    const tapped = holdTimer.current != null;
    cancel();
    if (!tapped) return;
    if (timer.phase === 'focus') {
      navigator.vibrate?.(10);
      t.finishFocus();
    } else setHint(true);
  };

  // 退場中は表示を固定する（中身が入れ替わると退場が止まる）
  const present = useIsPresent();
  const frozen = useRef({ phase: timer.phase, hint });
  if (present) frozen.current = { phase: timer.phase, hint };
  const rest = frozen.current.phase === 'break';
  const waiting = frozen.current.phase === 'idle';
  const showHint = frozen.current.hint;
  // 予約した旅は集中中なら到着までの残り（休憩中は休憩の残り）
  const shown = waiting ? 0 : timer.phase === 'focus' && t.journeyRemainingMs != null ? t.journeyRemainingMs : t.remainingMs ?? t.elapsedMs;
  const stop = stopFor(timer, settings, false, t.journeyFocusMs / MIN);
  const label = rest ? `${stop.name} 停車中` : waiting ? `${stop.name} 停車中` : timer.running ? subject?.name ?? '集中' : '信号待ち';

  return (
    <div
      className="absolute inset-0 touch-none select-none"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 上部：音楽・方向幕と時間・完了 */}
      <div className="pointer-events-none flex items-start justify-between px-5 pt-safe">
        <motion.button transition={springBouncy} onClick={onMusic} aria-label="サウンド" className="tr-btn pointer-events-auto mt-2 grid h-12 w-12 place-items-center">
          <Music size={20} />
        </motion.button>
        <div className="mt-2 flex flex-col items-center">
          <RollSign cls={cls} goal={destinationOf(timer, settings)} />
          <button onClick={() => !rest && !waiting && t.toggle()} className="pointer-events-auto mt-3 text-center" aria-label={timer.running ? '一時停止' : '再開'}>
            <span className="tabular block font-digits text-[40px] font-semibold leading-none tracking-wider text-[#F4EEDD] [text-shadow:0_2px_0_rgba(0,0,0,0.45),0_0_18px_rgba(0,0,0,0.3)]">{fmtTimer(shown)}</span>
            <span className="mt-1.5 inline-block rounded-full bg-black/35 px-2.5 py-0.5 text-[11px] font-bold text-[#F4EEDD]/90">{label}</span>
          </button>
        </div>
        <motion.button
          transition={springBouncy}
          onClick={() => (rest ? t.skipBreak() : waiting ? t.start() : t.finishFocus())}
          aria-label={rest ? '休憩を終えて発車' : waiting ? '発車' : '集中を完了して停車'}
          className="tr-btn pointer-events-auto mt-2 grid h-12 w-12 place-items-center"
        >
          <Check size={22} strokeWidth={3} />
        </motion.button>
      </div>

      {/* 下部：停車中のカード / ヒント */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <AnimatePresence mode="wait">
          {rest || waiting ? (
            <motion.div key="rest" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={springBouncy} className="pointer-events-auto mx-auto flex max-w-md items-center overflow-hidden rounded-[10px] tr-card">
              <span className="min-w-0 flex-1 px-4 py-2.5 leading-tight">
                <span className="block text-[19px] font-extrabold tracking-[0.12em]">{stop.name}</span>
                <span className="mt-0.5 block text-[12px] font-semibold text-[#6B7076]">停車中 · ここまで {fmtDuration(t.journeyFocusMs / MIN)}</span>
              </span>
              <motion.button onClick={() => (rest ? t.skipBreak() : t.start())} className="self-stretch bg-[#7A2830] px-5 text-[16px] font-extrabold tracking-[0.1em] text-[#F4EEDD]">
                発車
              </motion.button>
            </motion.div>
          ) : (
            showHint && (
              <motion.div key="hint" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={springBouncy} className="mx-auto flex max-w-md items-center gap-3 rounded-full bg-[#F4EEDD] p-1.5 pr-5 text-[#1F2328] shadow-[0_14px_30px_-12px_rgba(0,0,0,0.6)]">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#7A2830] text-[#F4EEDD]">
                  <Pointer size={19} />
                </span>
                <span className="text-[14px] font-bold">タップで停車（休憩）· 長押しで終着</span>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      {/* 長押しの進行リング */}
      <AnimatePresence>
        {hold && (
          <motion.svg key="hold" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="pointer-events-none fixed h-24 w-24" style={{ left: hold.x - 48, top: hold.y - 48 }} viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="38" fill="rgba(246,236,210,0.16)" stroke="rgba(246,236,210,0.35)" strokeWidth="6" />
            <motion.circle
              cx="48"
              cy="48"
              r="38"
              fill="none"
              stroke="#B8955A"
              strokeWidth="6"
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
              strokeDasharray={2 * Math.PI * 38}
              initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: HOLD_MS / 1000, ease: 'linear' }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  );
}
