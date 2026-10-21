import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { Check, Coffee, Flag, Music } from 'lucide-react';
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
      <span className="grid place-items-center px-2.5 text-[14px] font-extrabold tracking-[0.2em] text-[#F4EEDD]" style={{ background: ROLL[cls] }}>
        {CLASSES[cls].label}
      </span>
      <span className="max-w-[56vw] truncate px-3 py-1 text-[16px] font-extrabold tracking-[0.12em]">{goal}<span className="ml-0.5 text-[12.5px]">行</span></span>
    </span>
  );
}

/** 列車デザイン：集中中・休憩中の HUD。下の 2 つのボタン（途中駅で休憩 / 長押しで旅を終える）か、画面のタップ（休憩）・長押し（終着） */
export function TrainSession({ onMusic, onEnd }: DesignSessionProps) {
  const t = useTimer();
  const { timer } = t;
  const { settings, subjectById } = useApp();
  const subject = subjectById(timer.subjectId);
  const [hold, setHold] = useState<{ x: number; y: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const cls = classOf(timer.booking?.cls ?? settings.trainClass);

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
    }
  };

  // 退場中は表示を固定する（中身が入れ替わると退場が止まる）
  const present = useIsPresent();
  const frozen = useRef({ phase: timer.phase });
  if (present) frozen.current = { phase: timer.phase };
  const rest = frozen.current.phase === 'break';
  const waiting = frozen.current.phase === 'idle';
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
      <div className="screen-header pointer-events-none !h-auto !items-start">
        <motion.button transition={springBouncy} onClick={onMusic} aria-label="サウンド" className="btn-icon tr-btn pointer-events-auto mt-px">
          <Music />
        </motion.button>
        <div className="flex flex-col items-center">
          {/* 予約していない旅（予定から出発など）は、目標がなければ科目の名前を行き先に（「目標 行」と出さない） */}
          <RollSign cls={cls} goal={timer.booking || settings.goal.trim() ? destinationOf(timer, settings) : subject?.name ?? '臨時'} />
          <button onClick={() => !rest && !waiting && t.toggle()} className="pointer-events-auto mt-3 text-center" aria-label={timer.running ? '一時停止' : '再開'}>
            <span className="tabular block font-digits text-[37px] font-semibold leading-none tracking-wider text-[#F4EEDD] [text-shadow:0_2px_0_rgba(0,0,0,0.45),0_0_18px_rgba(0,0,0,0.3)]">{fmtTimer(shown)}</span>
            <span className="mt-1.5 inline-block rounded-full bg-black/35 px-2.5 py-0.5 text-[11px] font-bold text-[#F4EEDD]/90">{label}</span>
          </button>
        </div>
        <motion.button
          transition={springBouncy}
          onClick={() => (rest ? t.skipBreak() : waiting ? t.start() : t.finishFocus())}
          aria-label={rest ? '休憩を終えて発車' : waiting ? '発車' : '集中を完了して停車'}
          className="btn-icon tr-btn pointer-events-auto mt-px"
        >
          <Check strokeWidth={3} />
        </motion.button>
      </div>

      {/* 下部：役割がひと目で分かる 2 つのボタン（走行中）/ 停車中のカード（休憩中）。画面のタップ・長押しも今までどおり使える */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <AnimatePresence mode="wait">
          {rest || waiting ? (
            <motion.div key="rest" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={springBouncy} className="pointer-events-auto mx-auto max-w-md">
              <div className="tr-card flex items-center overflow-hidden rounded-[10px]">
                <span className="min-w-0 flex-1 px-4 py-2.5 leading-tight">
                  <span className="block text-[18px] font-extrabold tracking-[0.12em]">{stop.name}</span>
                  <span className="mt-0.5 block text-[12px] font-semibold text-[#6B7076]">停車中 · ここまで {fmtDuration(t.journeyFocusMs / MIN)}</span>
                </span>
                <motion.button onClick={() => (rest ? t.skipBreak() : t.start())} className="self-stretch bg-[#7A2830] px-5 text-[15px] font-extrabold tracking-[0.1em] text-[#F4EEDD]">
                  発車
                </motion.button>
              </div>
              {rest && (
                <HoldButton onDone={onEnd} className="mt-2 h-11 w-full rounded-[10px] bg-[#2A1C14]/85 text-[#F4EEDD]">
                  <Flag size={15} /> ここで旅を終える（長押しで途中下車）
                </HoldButton>
              )}
            </motion.div>
          ) : (
            <motion.div key="run" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={springBouncy} className="pointer-events-auto mx-auto grid max-w-md grid-cols-2 gap-2">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={() => {
                  navigator.vibrate?.(10);
                  t.finishFocus();
                }}
                className="tr-card flex h-14 flex-col items-center justify-center rounded-[10px] leading-tight"
              >
                <span className="flex items-center gap-1.5 text-[14px] font-extrabold tracking-[0.06em]">
                  <Coffee size={16} /> 途中駅で休憩
                </span>
                <span className="text-[11px] font-semibold text-[#6B7076]">次の駅に停車</span>
              </button>
              <HoldButton onDone={onEnd} className="h-14 flex-col rounded-[10px] bg-[#7A2830] text-[#F4EEDD]">
                <span className="flex items-center gap-1.5 text-[14px] font-extrabold tracking-[0.06em]">
                  <Flag size={16} /> 旅を終える
                </span>
                <span className="text-[11px] font-semibold text-[#F4EEDD]/70">長押しで下車</span>
              </HoldButton>
            </motion.div>
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

/** 長押し（1.1 秒）で決まるボタン。押している間、左から明るい帯が満ちていく。途中で離すと取り消し */
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
      onPointerDown={(e) => {
        e.stopPropagation();
        setHeld(true);
        timer.current = setTimeout(() => {
          timer.current = null;
          setHeld(false);
          navigator.vibrate?.(30);
          onDone();
        }, HOLD_MS);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        stop();
      }}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative flex items-center justify-center gap-1.5 overflow-hidden text-[13px] font-bold ${className}`}
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 bg-[#F4EEDD]/25" style={{ width: held ? '100%' : '0%', transition: held ? `width ${HOLD_MS}ms linear` : 'width 200ms ease-out' }} />
      <span className="relative flex flex-col items-center leading-tight">{children}</span>
    </button>
  );
}
