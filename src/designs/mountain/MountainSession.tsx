import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { Check, Coffee, Flag, Flame, Music } from 'lucide-react';
import { useTimer } from '@/store/TimerStore';
import { useApp } from '@/store/AppStore';
import { fmtDuration, fmtTimer, MIN } from '@/lib/time';
import { springBouncy } from '@/lib/motion';
import { CrayonOutline } from './CrayonDefs';
import type { DesignSessionProps } from '../types';

const HOLD_MS = 1100;

/** 登山デザイン：集中中・休憩中のフルスクリーン HUD。画面のどこでも長押しで旅を終える */
export function MountainSession({ onMusic, onEnd }: DesignSessionProps) {
  const t = useTimer();
  const { timer } = t;
  const { subjectById } = useApp();
  const subject = subjectById(timer.subjectId);
  const [hold, setHold] = useState<{ x: number; y: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  // 長押しの途中で画面が切り替わっても onEnd を呼ばない
  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  const cancel = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHold(null);
  };
  const onDown = (e: RPointerEvent) => {
    if (e.target !== e.currentTarget) return; // ボタンの上では始めない
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
  // 短くタップ：集中中なら休憩へ（長押しは終了）
  const onUp = () => {
    const tapped = holdTimer.current != null;
    cancel();
    if (!tapped) return;
    if (timer.phase === 'focus') {
      navigator.vibrate?.(10);
      t.finishFocus();
    }
  };

  // 旅を終えて HUD が消えていく間は、表示を終了直前のまま固定する（中身が入れ替わると退場が止まる）
  const present = useIsPresent();
  const frozen = useRef({ phase: timer.phase });
  if (present) frozen.current = { phase: timer.phase };
  const rest = frozen.current.phase === 'break';
  const waiting = frozen.current.phase === 'idle';
  const shown = waiting ? 0 : t.remainingMs ?? t.elapsedMs;
  const label = rest ? (timer.longBreak ? '長い休憩' : '休息') : waiting ? '小休止' : timer.running ? subject?.name ?? '集中' : '一時停止中';

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
      {/* 上部：音楽・時間・完了 */}
      <div className="pointer-events-none flex items-start justify-between px-5 pt-safe">
        <motion.button transition={springBouncy} onClick={onMusic} aria-label="サウンド" className="mt-ink-btn pointer-events-auto relative mt-2 grid h-12 w-12 place-items-center">
          <Music size={20} />
          <CrayonOutline shape="circle" color="rgba(255,248,234,0.4)" width={1.4} />
        </motion.button>
        <button onClick={() => !rest && !waiting && t.toggle()} className="pointer-events-auto mt-2 text-center" aria-label={timer.running ? '一時停止' : '再開'}>
          <span className="block font-digits text-[38px] font-semibold leading-none tracking-wider text-paper [text-shadow:0_2px_0_rgba(46,34,28,0.55),0_0_18px_rgba(0,0,0,0.25)]">{fmtTimer(shown)}</span>
          <span className="mt-1 inline-block rounded-full bg-ink/35 px-2.5 py-0.5 font-maru text-[11px] font-bold  text-paper/90">{label}</span>
        </button>
        <motion.button
          transition={springBouncy}
          onClick={() => (rest ? t.skipBreak() : waiting ? t.start() : t.finishFocus())}
          aria-label={rest ? '休憩を終えて出発' : waiting ? '次の登りへ' : '集中を完了して休憩'}
          className="mt-ink-btn pointer-events-auto relative mt-2 grid h-12 w-12 place-items-center"
        >
          <Check size={22} strokeWidth={3} />
          <CrayonOutline shape="circle" color="rgba(255,248,234,0.4)" width={1.4} />
        </motion.button>
      </div>

      {/* 下部：役割がひと目で分かる 2 つのボタン（登っている間）/ 休憩カード（休憩中）。画面のタップ・長押しも今までどおり */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <AnimatePresence mode="wait">
          {rest || waiting ? (
            <motion.div key="rest" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={springBouncy} className="pointer-events-auto mx-auto max-w-md">
              <div className="mt-paper relative flex items-center gap-3 rounded-full p-2 pr-3 text-ink shadow-float">
                <span className="relative grid h-14 w-14 place-items-center rounded-full bg-crayon-green text-paper">
                  <Flame size={24} className="text-crayon-yellow" fill="#F2B33D" />
                  <CrayonOutline shape="circle" color="#2E221C" width={1.6} />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block font-maru text-[18px] font-bold">{rest ? '休息' : 'ひと息'}</span>
                  <span className="block text-[13px] text-ink-soft">{new Date().toLocaleDateString('ja-JP')} · ここまで {fmtDuration(t.journeyFocusMs / MIN)}</span>
                </span>
                <motion.button onClick={() => (rest ? t.skipBreak() : t.start())} className="rounded-full px-3 py-2 font-maru text-[16px] font-bold text-crayon-blue">
                  出発
                </motion.button>
              </div>
              {rest && (
                <HoldButton onDone={onEnd} className="mt-ink-btn mt-2 h-11 w-full rounded-full">
                  <Flag size={15} /> ここで旅を終える（長押しでキャンプへ）
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
                className="mt-paper flex h-14 flex-col items-center justify-center rounded-[18px] font-maru leading-tight text-ink shadow-float"
              >
                <span className="flex items-center gap-1.5 text-[15px] font-bold">
                  <Coffee size={16} /> ひと休み
                </span>
                <span className="text-[11px] font-bold text-ink-soft">焚き火で休憩</span>
              </button>
              <HoldButton onDone={onEnd} className="mt-ink-btn h-14 flex-col rounded-[18px]">
                <span className="flex items-center gap-1.5 font-maru text-[15px] font-bold">
                  <Flag size={16} /> 旅を終える
                </span>
                <span className="text-[11px] font-bold opacity-75">長押しでキャンプへ</span>
              </HoldButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 長押しの進行リング */}
      <AnimatePresence>
        {hold && (
          <motion.svg
            key="hold"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="pointer-events-none fixed h-24 w-24"
            style={{ left: hold.x - 48, top: hold.y - 48 }}
            viewBox="0 0 96 96"
          >
            <circle cx="48" cy="48" r="38" fill="rgba(255,248,234,0.18)" stroke="rgba(255,248,234,0.35)" strokeWidth="6" />
            <motion.circle
              cx="48"
              cy="48"
              r="38"
              fill="none"
              stroke="#FFF8EA"
              strokeWidth="6"
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
              strokeDasharray={2 * Math.PI * 38}
              initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: HOLD_MS / 1000, ease: 'linear' }}
              style={{ filter: 'url(#crayon-soft)' }}
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
      className={`relative flex items-center justify-center gap-1.5 overflow-hidden text-[14px] font-bold ${className}`}
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 bg-white/25" style={{ width: held ? '100%' : '0%', transition: held ? `width ${HOLD_MS}ms linear` : 'width 200ms ease-out' }} />
      <span className="relative flex flex-col items-center leading-tight">{children}</span>
    </button>
  );
}
