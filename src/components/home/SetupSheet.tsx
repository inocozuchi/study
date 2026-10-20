import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { PaperSegmented } from '@/components/ui/PaperControls';
import { CrayonOutline } from '@/components/ui/CrayonDefs';
import { SubjectIcon } from '@/components/ui/SubjectBadge';
import { SeasonSwatch } from './SeasonSwatch';
import { SEASONS, SEASON_ORDER } from '@/components/scene/stage/palette';
import { useApp } from '@/store/AppStore';
import { useTimer } from '@/store/TimerStore';
import { alpha } from '@/lib/subjects';
import { springBouncy } from '@/lib/motion';
import type { Season, TimerMode } from '@/types';

const PRESETS: Record<Exclude<TimerMode, 'stopwatch'>, number[]> = {
  pomodoro: [15, 25, 45, 50],
  countdown: [30, 60, 90, 120],
};

/** 旅の支度：科目・時間・季節を選んで出発 */
export function SetupSheet({ open, onClose, onStarted }: { open: boolean; onClose: () => void; onStarted: () => void }) {
  const { activeSubjects, settings, updateSettings, ensureSubject, subjectById } = useApp();
  const { startJourney } = useTimer();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<TimerMode>(settings.mode);
  const [minutes, setMinutes] = useState(25);
  const [season, setSeason] = useState<Season>(settings.season);

  useEffect(() => {
    if (!open) return;
    setName(subjectById(settings.selectedSubjectId)?.name ?? activeSubjects[0]?.name ?? '');
    setMode(settings.mode);
    setMinutes(settings.mode === 'countdown' ? settings.countdownMinutes : settings.pomodoroFocus);
    setSeason(settings.season);
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
    updateSettings({ season });
    startJourney({ subjectId: subject.id, mode, minutes });
    onClose();
    onStarted();
  };

  return (
    <Sheet open={open} onClose={onClose} title="旅の支度" subtitle="どの山に、どれくらい登ろう？" tone="paper">
      <div className="space-y-6 pb-5">
        {/* 科目 */}
        <section>
          <p className="mb-2 font-maru text-[13px] font-bold text-ink-soft">科目</p>
          <input className="field-paper font-maru text-[17px] font-bold" placeholder="科目名（例：英語、ゼミ、バイト）" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
          <div className="no-scrollbar -mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5 pb-1">
            {activeSubjects.map((s) => {
              const active = s.name === trimmed;
              return (
                <motion.button
                  key={s.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setName(s.name)}
                  className="relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold"
                  style={{ background: active ? alpha(s.color, 0.22) : 'rgba(255,255,255,0.55)', color: active ? '#3A2E28' : '#6E5D52' }}
                >
                  <span style={{ color: s.color }}><SubjectIcon subject={s} size={14} /></span>
                  {s.name}
                  <CrayonOutline radius={999} color={active ? s.color : 'rgba(58,46,40,0.25)'} width={active ? 2 : 1.4} />
                </motion.button>
              );
            })}
          </div>
          {isNew && <p className="mt-1.5 text-[12px] text-ink-soft">「{trimmed}」を新しいルートとして登りはじめます</p>}
        </section>

        {/* 時間 */}
        <section>
          <p className="mb-2 font-maru text-[13px] font-bold text-ink-soft">時間</p>
          <PaperSegmented
            value={mode}
            onChange={changeMode}
            options={[
              { value: 'pomodoro', label: 'ポモドーロ' },
              { value: 'countdown', label: 'タイマー' },
              { value: 'stopwatch', label: 'フリー' },
            ]}
          />
          {mode !== 'stopwatch' ? (
            <div className="paper-card mt-3 p-4">
              <div className="flex items-center justify-between">
                <motion.button whileTap={{ scale: 0.85 }} aria-label="5分減らす" onClick={() => setMinutes((m) => Math.max(5, m - 5))} className="ink-btn grid h-11 w-11 place-items-center">
                  <Minus size={18} />
                </motion.button>
                <div className="text-center">
                  <motion.p key={minutes} initial={{ y: -6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }} transition={springBouncy} className="font-digits text-[44px] font-semibold leading-none">
                    {minutes}
                    <span className="ml-1 font-maru text-[15px] text-ink-soft">分</span>
                  </motion.p>
                  <p className="mt-1 text-[12px] text-ink-soft">{mode === 'pomodoro' ? `集中のあと ${settings.pomodoroShortBreak}分 焚き火で休憩` : '時間がきたら休憩へ'}</p>
                </div>
                <motion.button whileTap={{ scale: 0.85 }} aria-label="5分増やす" onClick={() => setMinutes((m) => Math.min(180, m + 5))} className="ink-btn grid h-11 w-11 place-items-center">
                  <Plus size={18} />
                </motion.button>
              </div>
              <div className="mt-3 flex gap-2">
                {PRESETS[mode].map((m) => (
                  <button key={m} onClick={() => setMinutes(m)} className={`flex-1 rounded-xl py-1.5 text-[13px] font-bold ${minutes === m ? 'bg-crayon-brown text-paper' : 'bg-ink/[0.06] text-ink-soft'}`}>
                    {m}分
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="paper-card mt-3 p-4 text-[13px] text-ink-soft">時間を決めずに登ります。画面を長押しすると旅を終えられます。</p>
          )}
        </section>

        {/* 季節 */}
        <section>
          <p className="mb-2 font-maru text-[13px] font-bold text-ink-soft">シーズン</p>
          <div className="grid grid-cols-5 gap-2">
            {SEASON_ORDER.map((s) => {
              const active = s === season;
              return (
                <motion.button key={s} whileTap={{ scale: 0.9 }} onClick={() => setSeason(s)} className="flex flex-col items-center gap-1.5" aria-pressed={active}>
                  <motion.span className="relative block w-full overflow-hidden rounded-2xl" animate={{ y: active ? -3 : 0, scale: active ? 1.04 : 1 }} transition={springBouncy}>
                    <SeasonSwatch season={s} className="block aspect-[4/3] w-full" />
                    <CrayonOutline radius={16} color={active ? '#3A2E28' : 'rgba(58,46,40,0.25)'} width={active ? 2.6 : 1.4} />
                  </motion.span>
                  <span className={`font-maru text-[12px] font-bold ${active ? 'text-ink' : 'text-ink-soft'}`}>
                    {SEASONS[s].emoji} {SEASONS[s].label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>

        <motion.button whileTap={{ scale: 0.96 }} transition={springBouncy} disabled={!valid} onClick={start} className="ink-btn relative w-full py-4 text-[17px] disabled:opacity-40">
          出発する
          <CrayonOutline radius={999} color="rgba(255,248,234,0.55)" width={1.6} />
        </motion.button>
      </div>
    </Sheet>
  );
}
