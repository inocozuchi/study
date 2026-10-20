import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown, Eye, Flag, Headphones, Minus, Pause, Play, Plus, RotateCcw, Settings2, SkipForward, Smartphone,
} from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { useTimer } from '@/store/TimerStore';
import { Pressable } from '@/components/ui/Pressable';
import { Segmented } from '@/components/ui/Segmented';
import { SubjectBadge } from '@/components/ui/SubjectBadge';
import { AmbientSheet } from '@/components/trail/AmbientSheet';
import { SettingsSheet } from '@/components/trail/SettingsSheet';
import { SubjectPickerSheet } from '@/components/trail/SubjectPickerSheet';
import { METERS_PER_MINUTE, flavorText, fmtMeters, routeProgress, stageFor } from '@/lib/altitude';
import { MIN, fmtTimer } from '@/lib/time';
import { spring, springBouncy, springSoft } from '@/lib/motion';
import { alpha } from '@/lib/subjects';
import { wakeLockSupported } from '@/hooks/useWakeLock';
import type { TimerMode } from '@/types';

const MODE_OPTIONS: { value: TimerMode; label: string }[] = [
  { value: 'pomodoro', label: 'ポモドーロ' },
  { value: 'countdown', label: 'タイマー' },
  { value: 'stopwatch', label: 'ストップウォッチ' },
];

const COUNTDOWN_PRESETS = [25, 50, 90, 120];

interface Toast {
  id: number;
  title: string;
  sub?: string;
}

export function TrailScreen() {
  const { settings, updateSettings, subjectById, minutesBySubject } = useApp();
  const t = useTimer();
  const { timer } = t;
  const [sheet, setSheet] = useState<null | 'ambient' | 'settings' | 'subject'>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const subject = subjectById(timer.subjectId ?? settings.selectedSubjectId);
  const focusMs = timer.phase === 'focus' ? t.elapsedMs : 0;
  const totalMin = (subject ? minutesBySubject[subject.id] ?? 0 : 0) + focusMs / MIN;
  const prog = subject ? routeProgress(subject, totalMin) : 0;
  const stage = stageFor(prog);
  const tint = timer.phase === 'break' ? '#FF8A4C' : subject?.color ?? '#8EC5FF';

  // ── 旅のフレーバーテキスト（5分ごと / フェーズ遷移） ──
  const showToast = (title: string, sub?: string) => setToast({ id: Date.now(), title, sub });
  const step = Math.floor(focusMs / (5 * MIN));
  const lastStep = useRef(step);
  const lastPhase = useRef(timer.phase);
  useEffect(() => {
    if (timer.phase === 'focus' && step > lastStep.current && step > 0) {
      const f = flavorText(stage.index, step - 1);
      showToast(f.title, f.sub);
    }
    lastStep.current = step;
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (lastPhase.current !== timer.phase) {
      if (timer.phase === 'focus') showToast('旅に出発した', `${subject?.mountainName ?? '山'}・${stage.name}`);
      if (timer.phase === 'break') showToast(timer.longBreak ? 'ゆっくり腰をおろそう' : '焚き火を起こした', timer.longBreak ? '長めの休憩です' : 'コーヒーで一息');
      if (timer.phase === 'idle' && lastPhase.current === 'break') showToast('火の始末をした', '次の登りへ出発しよう');
    }
    lastPhase.current = timer.phase;
  }, [timer.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!confirmDiscard) return;
    const id = setTimeout(() => setConfirmDiscard(false), 2600);
    return () => clearTimeout(id);
  }, [confirmDiscard]);

  const display = timer.phase === 'idle' ? (t.remainingMs != null ? fmtTimer(t.remainingMs) : '00:00') : fmtTimer(t.remainingMs ?? t.elapsedMs);
  const phaseLabel =
    timer.phase === 'idle' ? '出発の準備' : timer.phase === 'break' ? (timer.longBreak ? '長い休憩' : '焚き火で休憩') : timer.running ? '登山中' : '小休止';
  const every = Math.max(1, settings.longBreakEvery);
  const cycleDone = timer.cycle % every === 0 && timer.cycle > 0 && timer.phase !== 'focus' ? every : timer.cycle % every;

  return (
    <div className="relative mx-auto flex h-full max-w-xl flex-col px-5 pt-safe">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Pressable
          onClick={() => timer.phase !== 'focus' && setSheet('subject')}
          className="glass flex min-w-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-3.5"
        >
          {subject ? <SubjectBadge subject={subject} size={32} rounded="rounded-full" /> : <span className="h-8 w-8 rounded-full bg-white/10" />}
          <span className="min-w-0 text-left leading-tight">
            <span className="block truncate text-[14px] font-semibold">{subject?.name ?? 'ルートを選ぶ'}</span>
            <span className="block truncate text-[11px] text-white/55">{subject ? `${subject.mountainName} · ${subject.summitedAt ? '登頂済み' : stage.short}` : '科目を追加しましょう'}</span>
          </span>
          {timer.phase !== 'focus' && <ChevronDown size={15} className="shrink-0 text-white/50" />}
        </Pressable>
        <div className="flex gap-2">
          <Pressable
            onClick={() => setSheet('ambient')}
            aria-label="環境音"
            className={`glass grid h-10 w-10 place-items-center rounded-full ${settings.ambientPlaying ? 'text-ember' : 'text-white/80'}`}
          >
            <Headphones size={18} />
          </Pressable>
          <Pressable onClick={() => setSheet('settings')} aria-label="設定" className="glass grid h-10 w-10 place-items-center rounded-full text-white/80">
            <Settings2 size={18} />
          </Pressable>
        </div>
      </div>

      {/* 標高 */}
      {subject && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center gap-2 px-1 text-[12px] font-medium text-white/60">
          <span className="tabular">標高 {fmtMeters(totalMin * METERS_PER_MINUTE)}</span>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.span className="block h-full rounded-full" style={{ background: subject.color }} animate={{ width: `${prog * 100}%` }} transition={springSoft} />
          </span>
          <span className="tabular text-white/40">{fmtMeters(subject.targetMinutes * METERS_PER_MINUTE)}</span>
        </motion.div>
      )}

      {/* トースト */}
      <div className="pointer-events-none relative mt-3 flex h-14 justify-center">
        <AnimatePresence mode="popLayout">
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.92, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, scale: 0.96, filter: 'blur(4px)' }}
              transition={{ ...springBouncy, filter: { duration: 0.25 } }}
              className="glass absolute top-0 flex max-w-full items-center gap-2.5 whitespace-nowrap rounded-full py-2 pl-3 pr-4"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: tint, boxShadow: `0 0 10px ${tint}` }} />
              <span className="text-[13px] font-semibold">{toast.title}</span>
              {toast.sub && <span className="tabular text-[12px] text-white/55">{toast.sub}</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* タイマー */}
      <div className="flex flex-col items-center">
        <motion.div layout transition={spring} className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-[12px] font-semibold backdrop-blur-md">
          <motion.span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: tint }}
            animate={timer.running ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          {phaseLabel}
          {settings.mode === 'pomodoro' && (
            <span className="ml-1 flex gap-1">
              {Array.from({ length: every }, (_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i < cycleDone ? tint : 'rgba(255,255,255,0.25)' }} />
              ))}
            </span>
          )}
        </motion.div>

        <motion.div
          key={timer.phase}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springSoft}
          className="tabular mt-1 text-[clamp(64px,21vw,96px)] font-extralight leading-none tracking-[-0.04em] drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
        >
          {display}
        </motion.div>

        {timer.phase !== 'idle' && (
          <div className="mt-3 h-1 w-48 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full transition-[width] duration-300 ease-linear" style={{ width: `${t.progress * 100}%`, background: tint }} />
          </div>
        )}

        <AnimatePresence initial={false}>
          {timer.phase === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={springSoft}
              className="mt-4 flex w-full max-w-sm flex-col items-center gap-3"
            >
              <Segmented value={settings.mode} options={MODE_OPTIONS} onChange={t.setMode} className="w-full" size="sm" />
              {settings.mode === 'countdown' && (
                <div className="flex items-center gap-2">
                  <button aria-label="5分減らす" onClick={() => updateSettings({ countdownMinutes: Math.max(10, settings.countdownMinutes - 5) })} className="glass grid h-8 w-8 place-items-center rounded-full">
                    <Minus size={14} />
                  </button>
                  {COUNTDOWN_PRESETS.map((m) => (
                    <button
                      key={m}
                      onClick={() => updateSettings({ countdownMinutes: m })}
                      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${settings.countdownMinutes === m ? 'bg-white text-night-950' : 'glass text-white/70'}`}
                    >
                      {m}分
                    </button>
                  ))}
                  <button aria-label="5分増やす" onClick={() => updateSettings({ countdownMinutes: Math.min(180, settings.countdownMinutes + 5) })} className="glass grid h-8 w-8 place-items-center rounded-full">
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1" />

      {/* コントロール */}
      <div className="pb-[calc(env(safe-area-inset-bottom)+104px)]">
        <div className="mb-4 flex justify-center gap-2">
          <ChipToggle
            on={settings.deepFocus}
            onClick={() => updateSettings({ deepFocus: !settings.deepFocus })}
            icon={<Eye size={14} />}
            label="ディープ集中"
            color="#C3A6FF"
          />
          <ChipToggle
            on={settings.wakeLock}
            onClick={() => updateSettings({ wakeLock: !settings.wakeLock })}
            icon={<Smartphone size={14} />}
            label={t.wakeLockHeld ? '点灯中' : '常時点灯'}
            color="#8EC5FF"
            disabled={!wakeLockSupported}
          />
        </div>

        <div className="flex items-center justify-center gap-6">
          <div className="w-16">
            <AnimatePresence>
              {timer.phase === 'focus' && (
                <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={springBouncy} className="flex flex-col items-center gap-1">
                  <Pressable
                    onClick={() => (confirmDiscard ? (t.discard(), setConfirmDiscard(false)) : setConfirmDiscard(true))}
                    aria-label="記録せずに戻る"
                    className={`glass grid h-14 w-14 place-items-center rounded-full ${confirmDiscard ? 'text-[#FF8A8E]' : 'text-white/80'}`}
                  >
                    <RotateCcw size={20} />
                  </Pressable>
                  <span className="text-[10px] font-medium text-white/50">{confirmDiscard ? 'もう一度で破棄' : 'やり直す'}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={springBouncy}
            onClick={t.toggle}
            disabled={!subject}
            aria-label={timer.running ? '一時停止' : '開始'}
            className="relative grid h-[84px] w-[84px] place-items-center rounded-full text-night-950 disabled:opacity-40"
            style={{ background: `linear-gradient(160deg, #fff, ${alpha(tint, 0.9)})`, boxShadow: `0 16px 40px -10px ${alpha(tint, 0.7)}, inset 0 1px 0 rgba(255,255,255,0.8)` }}
          >
            {timer.running && (
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ boxShadow: `0 0 0 2px ${alpha(tint, 0.6)}` }}
                animate={{ scale: [1, 1.25], opacity: [0.8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={timer.running ? 'pause' : 'play'} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={spring}>
                {timer.running ? <Pause size={30} fill="currentColor" strokeWidth={0} /> : <Play size={30} fill="currentColor" strokeWidth={0} className="translate-x-0.5" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <div className="w-16">
            <AnimatePresence>
              {timer.phase !== 'idle' && (
                <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={springBouncy} className="flex flex-col items-center gap-1">
                  <Pressable
                    onClick={timer.phase === 'focus' ? t.finishFocus : t.skipBreak}
                    aria-label={timer.phase === 'focus' ? '集中を終えて記録' : '休憩をスキップ'}
                    className="glass grid h-14 w-14 place-items-center rounded-full text-white/85"
                  >
                    {timer.phase === 'focus' ? <Flag size={20} /> : <SkipForward size={20} />}
                  </Pressable>
                  <span className="text-[10px] font-medium text-white/50">{timer.phase === 'focus' ? '記録して休憩' : '出発する'}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AmbientSheet open={sheet === 'ambient'} onClose={() => setSheet(null)} />
      <SettingsSheet open={sheet === 'settings'} onClose={() => setSheet(null)} />
      <SubjectPickerSheet open={sheet === 'subject'} onClose={() => setSheet(null)} />
    </div>
  );
}

function ChipToggle({ on, onClick, icon, label, color, disabled }: { on: boolean; onClick: () => void; icon: ReactNode; label: string; color: string; disabled?: boolean }) {
  return (
    <Pressable
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold transition-colors"
      style={{
        background: on ? alpha(color, 0.22) : 'rgba(255,255,255,0.07)',
        color: on ? color : 'rgba(255,255,255,0.6)',
        boxShadow: `inset 0 0 0 1px ${on ? alpha(color, 0.45) : 'rgba(255,255,255,0.1)'}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {icon}
      {label}
    </Pressable>
  );
}
