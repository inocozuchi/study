import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Play, Plus } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Segmented } from '@/components/ui/Segmented';
import { SubjectIcon } from '@/components/ui/SubjectBadge';
import { useApp } from '@/store/AppStore';
import { useTimer } from '@/store/TimerStore';
import { getDesign } from '@/designs';
import { alpha } from '@/lib/subjects';
import { spring, springBouncy } from '@/lib/motion';
import type { Settings, TimerMode } from '@/types';

const PRESETS: Record<Exclude<TimerMode, 'stopwatch'>, number[]> = {
  pomodoro: [15, 25, 45, 50],
  countdown: [30, 60, 90, 120],
};

/** 集中の支度：科目・時間・（デザイン固有の設定）を選んで開始 */
export function SetupSheet({ open, onClose, onStarted }: { open: boolean; onClose: () => void; onStarted: () => void }) {
  const { activeSubjects, settings, updateSettings, ensureSubject, subjectById } = useApp();
  const { startJourney } = useTimer();
  const design = getDesign(settings.timerDesign);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<TimerMode>(settings.mode);
  const [minutes, setMinutes] = useState(25);
  const [draft, setDraft] = useState<Partial<Settings>>({});

  useEffect(() => {
    if (!open) return;
    setName(subjectById(settings.selectedSubjectId)?.name ?? activeSubjects[0]?.name ?? '');
    setMode(settings.mode);
    setMinutes(settings.mode === 'countdown' ? settings.countdownMinutes : settings.pomodoroFocus);
    setDraft({ season: settings.season, sky: settings.sky, trainClass: settings.trainClass, trainSound: settings.trainSound, trainWeather: settings.trainWeather });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const changeMode = (m: TimerMode) => {
    setMode(m);
    if (m === 'pomodoro') setMinutes(settings.pomodoroFocus);
    if (m === 'countdown') setMinutes(settings.countdownMinutes);
  };

  const trimmed = name.trim();
  const valid = trimmed.length > 0;
  const isNew = valid && !activeSubjects.some((s) => s.name === trimmed);

  const start = () => {
    if (!valid) return;
    const subject = ensureSubject(trimmed);
    updateSettings(draft);
    startJourney({ subjectId: subject.id, mode, minutes });
    onClose();
    onStarted();
  };

  const Options = design.SetupOptions;

  return (
    <Sheet open={open} onClose={onClose} title="集中の準備" subtitle={`${design.name}モード`}>
      <div className="space-y-6 pb-5">
        {/* 科目 */}
        <section>
          <p className="section-label mb-2">科目</p>
          <input className="field text-[16px] font-semibold" placeholder="科目名（例：英語、ゼミ、バイト）" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
          <div className="no-scrollbar -mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5 pb-1">
            {activeSubjects.map((s) => {
              const active = s.name === trimmed;
              return (
                <motion.button
                  key={s.id}
                  transition={spring}
                  onClick={() => setName(s.name)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-colors"
                  style={{
                    background: active ? alpha(s.color, 0.22) : 'rgb(var(--c-fill))',
                    color: active ? s.color : 'rgb(var(--c-fg2))',
                    boxShadow: active ? `inset 0 0 0 1.5px ${alpha(s.color, 0.6)}` : 'none',
                  }}
                >
                  <SubjectIcon subject={s} size={14} />
                  {s.name}
                </motion.button>
              );
            })}
          </div>
          {isNew && <p className="mt-1.5 text-[12px] text-fg-2">「{trimmed}」を新しい科目として追加します</p>}
        </section>

        {/* 時間 */}
        <section>
          <p className="section-label mb-2">時間</p>
          <Segmented
            value={mode}
            onChange={changeMode}
            options={[
              { value: 'pomodoro', label: 'ポモドーロ' },
              { value: 'countdown', label: 'タイマー' },
              { value: 'stopwatch', label: 'フリー' },
            ]}
          />
          {mode !== 'stopwatch' ? (
            <div className="group-box mt-3 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <motion.button transition={springBouncy} aria-label="5分減らす" onClick={() => setMinutes((m) => Math.max(5, m - 5))} className="grid h-11 w-11 place-items-center rounded-full bg-fill">
                  <Minus size={18} />
                </motion.button>
                <div className="text-center">
                  <motion.p key={minutes} initial={{ y: -6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} transition={springBouncy} className="tabular text-[40px] font-light leading-none tracking-tight">
                    {minutes}
                    <span className="ml-1 text-[14px] font-medium text-fg-2">分</span>
                  </motion.p>
                  <p className="mt-1 text-[12px] text-fg-2">{mode === 'pomodoro' ? `集中のあと ${settings.pomodoroShortBreak}分 休憩` : '時間がきたら休憩へ'}</p>
                </div>
                <motion.button transition={springBouncy} aria-label="5分増やす" onClick={() => setMinutes((m) => Math.min(180, m + 5))} className="grid h-11 w-11 place-items-center rounded-full bg-fill">
                  <Plus size={18} />
                </motion.button>
              </div>
              <div className="mt-3 flex gap-2">
                {PRESETS[mode].map((m) => (
                  <button key={m} onClick={() => setMinutes(m)} className={`flex-1 rounded-xl py-1.5 text-[12.5px] font-semibold transition-colors ${minutes === m ? 'bg-accent text-white' : 'bg-fill text-fg-2'}`}>
                    {m}分
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="group-box mt-3 rounded-2xl p-4 text-[12.5px] text-fg-2">時間を決めずに計ります。画面を長押しすると終了できます。</p>
          )}
        </section>

        {/* デザイン固有の設定（登山：シーズン） */}
        {Options && (
          <section>
            <p className="section-label mb-2">{design.setupLabel}</p>
            <Options draft={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} />
          </section>
        )}

        <motion.button transition={springBouncy} disabled={!valid} onClick={start} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-[16px] font-bold text-white disabled:opacity-40">
          <Play size={18} fill="currentColor" strokeWidth={0} /> 集中を始める
        </motion.button>
      </div>
    </Sheet>
  );
}
