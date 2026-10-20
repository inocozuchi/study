import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { Check, Flame, Music, Pointer } from 'lucide-react';
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
  const [hint, setHint] = useState(true);
  const [hold, setHold] = useState<{ x: number; y: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(false), 5000);
    return () => clearTimeout(id);
  }, [hint]);

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
  const onUp = () => {
    if (hold) setHint(true);
    cancel();
  };

  // 旅を終えて HUD が消えていく間は、表示を終了直前のまま固定する（中身が入れ替わると退場が止まる）
  const present = useIsPresent();
  const frozen = useRef({ phase: timer.phase, hint });
  if (present) frozen.current = { phase: timer.phase, hint };
  const rest = frozen.current.phase === 'break';
  const waiting = frozen.current.phase === 'idle';
  const showHint = frozen.current.hint;
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
        <motion.button whileTap={{ scale: 0.88 }} transition={springBouncy} onClick={onMusic} aria-label="集中音楽" className="mt-ink-btn pointer-events-auto relative mt-2 grid h-12 w-12 place-items-center">
          <Music size={20} />
          <CrayonOutline shape="circle" color="rgba(255,248,234,0.4)" width={1.4} />
        </motion.button>
        <button onClick={() => !rest && !waiting && t.toggle()} className="pointer-events-auto mt-2 text-center" aria-label={timer.running ? '一時停止' : '再開'}>
          <span className="block font-digits text-[38px] font-semibold leading-none tracking-wider text-paper [text-shadow:0_2px_0_rgba(46,34,28,0.55),0_0_18px_rgba(0,0,0,0.25)]">{fmtTimer(shown)}</span>
          <span className="mt-1 inline-block rounded-full bg-ink/35 px-2.5 py-0.5 font-maru text-[11px] font-bold text-paper/90 backdrop-blur-sm">{label}</span>
        </button>
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={springBouncy}
          onClick={() => (rest ? t.skipBreak() : waiting ? t.start() : t.finishFocus())}
          aria-label={rest ? '休憩を終えて出発' : waiting ? '次の登りへ' : '集中を完了して休憩'}
          className="mt-ink-btn pointer-events-auto relative mt-2 grid h-12 w-12 place-items-center"
        >
          <Check size={22} strokeWidth={3} />
          <CrayonOutline shape="circle" color="rgba(255,248,234,0.4)" width={1.4} />
        </motion.button>
      </div>

      {/* 下部：休憩カード / 長押しヒント */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <AnimatePresence mode="wait">
          {rest || waiting ? (
            <motion.div key="rest" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={springBouncy} className="mt-paper pointer-events-auto relative mx-auto flex max-w-md items-center gap-3 rounded-full p-2 pr-3 text-ink shadow-float">
              <span className="relative grid h-14 w-14 place-items-center rounded-full bg-crayon-green text-paper">
                <Flame size={24} className="text-crayon-yellow" fill="#F2B33D" />
                <CrayonOutline shape="circle" color="#2E221C" width={1.6} />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block font-maru text-[18px] font-bold">{rest ? '休息' : 'ひと息'}</span>
                <span className="block text-[13px] text-ink-soft">{new Date().toLocaleDateString('ja-JP')} · ここまで {fmtDuration(t.journeyFocusMs / MIN)}</span>
              </span>
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => (rest ? t.skipBreak() : t.start())} className="rounded-full px-3 py-2 font-maru text-[16px] font-bold text-crayon-blue">
                出発
              </motion.button>
            </motion.div>
          ) : (
            showHint && (
              <motion.div key="hint" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={springBouncy} className="mx-auto flex max-w-md items-center gap-3 rounded-full bg-crayon-blue/85 p-2 pr-5 text-paper shadow-float backdrop-blur-md" style={{ backgroundImage: 'var(--noise-light), var(--twill)' }}>
                <span className="grid h-11 w-11 place-items-center rounded-full bg-paper text-crayon-blue">
                  <Pointer size={20} />
                </span>
                <span className="font-maru text-[15px] font-bold">画面を長押しして集中を終了</span>
              </motion.div>
            )
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

