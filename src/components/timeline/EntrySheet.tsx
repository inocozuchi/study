import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Check, Clock, Minus, Plus, Repeat, Sunrise, Trash2, X } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Segmented } from '@/components/ui/Segmented';
import { Pressable } from '@/components/ui/Pressable';
import { SubjectIcon } from '@/components/ui/SubjectBadge';
import { useApp } from '@/store/AppStore';
import { MIN, addDays, dateKey, fmtClock, fmtDuration, inputToMin, minutesOfDay, parseDateKey, timeToInput } from '@/lib/time';
import { alpha } from '@/lib/subjects';
import type { FocusSession, PlanBlock } from '@/types';

export type EntryKind = 'record' | 'plan';

export interface EntryDraft {
  kind: EntryKind;
  date: string;
  startMin: number;
  endMin: number;
  plan?: PlanBlock;
  session?: FocusSession;
}

type RepeatMode = 'none' | 'daily' | 'weekdays' | 'weekly';
const NEW = '__new';
const DURATIONS = [25, 50, 60, 90, 120, 180];
const DAY_MAX = 24 * 60;

/** 予定の日付を繰り返しの設定どおりに並べる（最初の日を含む） */
function repeatDates(start: string, mode: RepeatMode): string[] {
  const d0 = parseDateKey(start);
  if (mode === 'daily') return Array.from({ length: 7 }, (_, i) => dateKey(addDays(d0, i)));
  if (mode === 'weekly') return Array.from({ length: 4 }, (_, i) => dateKey(addDays(d0, i * 7)));
  if (mode === 'weekdays') {
    const out: string[] = [];
    for (let i = 0; out.length < 5 && i < 10; i++) {
      const d = addDays(d0, i);
      if (d.getDay() !== 0 && d.getDay() !== 6) out.push(dateKey(d));
    }
    return out;
  }
  return [start];
}

/**
 * 予定を立てる・あとから記録するシート。
 * 科目はその場で新しく作れる。時刻は「開始 + 長さ」で決め（終了は自動）、よく使う長さや「いまから」「前の予定のあと」をワンタップで。
 */
export function EntrySheet({ open, onClose, draft }: { open: boolean; onClose: () => void; draft: EntryDraft | null }) {
  const { activeSubjects, settings, plans, sessions, addSession, updateSession, deleteSession, savePlan, deletePlan, ensureSubject } = useApp();
  const [kind, setKind] = useState<EntryKind>('record');
  const [subjectId, setSubjectId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [date, setDate] = useState(dateKey(Date.now()));
  const [startMin, setStartMin] = useState(9 * 60);
  const [duration, setDuration] = useState(50);
  const [text, setText] = useState('');
  const [repeat, setRepeat] = useState<RepeatMode>('none');

  useEffect(() => {
    if (!open || !draft) return;
    setKind(draft.kind);
    setDate(draft.date);
    setStartMin(draft.startMin);
    setDuration(Math.max(5, Math.min(DAY_MAX, draft.endMin) - draft.startMin));
    const sid = draft.session?.subjectId ?? draft.plan?.subjectId ?? settings.selectedSubjectId ?? activeSubjects[0]?.id ?? '';
    setSubjectId(activeSubjects.length ? sid : NEW);
    setNewName('');
    setText(draft.session?.note ?? draft.plan?.title ?? '');
    setRepeat('none');
  }, [open, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  // 閉じるアニメーションの間も、開いていたときの内容を表示しておく
  const lastDraft = useRef<EntryDraft | null>(null);
  if (draft) lastDraft.current = draft;
  const shown = lastDraft.current;
  const editing = !!(shown?.session || shown?.plan);
  const isPlan = kind === 'plan';

  const endMin = Math.min(DAY_MAX, startMin + duration);
  const minutes = endMin - startMin;
  const startTs = parseDateKey(date).getTime() + startMin * MIN;
  const future = !isPlan && startTs + minutes * MIN > Date.now() + MIN;
  const today = dateKey(Date.now());
  const nowMin = Math.ceil(minutesOfDay(Date.now()) / 5) * 5;

  // その日のほかの予定・記録（重なりと「前の予定のあと」に使う）
  const dayBlocks = useMemo(() => {
    const ps = plans.filter((p) => p.date === date && p.id !== shown?.plan?.id).map((p) => ({ s: p.startMin, e: p.endMin }));
    const ss = sessions.filter((x) => dateKey(x.start) === date && x.id !== shown?.session?.id).map((x) => ({ s: minutesOfDay(x.start), e: minutesOfDay(x.start) + x.minutes }));
    return [...ps, ...ss].sort((a, b) => a.s - b.s);
  }, [plans, sessions, date, shown]);
  const overlap = isPlan && dayBlocks.some((b) => b.s < endMin && b.e > startMin);
  const afterLast = dayBlocks.length ? Math.max(...dayBlocks.map((b) => b.e)) : null;

  // その科目で前に使った予定のタイトル（候補）
  const recentTitles = useMemo(() => {
    const out: string[] = [];
    for (const p of [...plans].reverse()) {
      if (p.subjectId === subjectId && p.title && !out.includes(p.title)) out.push(p.title);
      if (out.length >= 4) break;
    }
    return out;
  }, [plans, subjectId]);

  const creating = subjectId === NEW;
  const hasSubject = creating ? newName.trim().length > 0 : !!subjectId;
  const valid = hasSubject && minutes > 0 && !future;

  const save = () => {
    if (!valid) return;
    const sid = creating ? ensureSubject(newName).id : subjectId;
    if (!isPlan) {
      const base = { subjectId: sid, start: startTs, end: startTs + minutes * MIN, minutes, note: text.trim() || undefined };
      if (shown?.session) updateSession({ ...shown.session, ...base });
      else addSession({ ...base, source: 'manual' });
    } else if (shown?.plan) {
      savePlan({ id: shown.plan.id, subjectId: sid, date, startMin, endMin, title: text.trim() || undefined });
    } else {
      for (const d of repeatDates(date, repeat)) savePlan({ subjectId: sid, date: d, startMin, endMin, title: text.trim() || undefined });
    }
    onClose();
  };

  const remove = () => {
    if (shown?.session && !isPlan) deleteSession(shown.session.id);
    else if (shown?.plan) deletePlan(shown.plan.id);
    onClose();
  };

  const chip = (active: boolean) => `tabular shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition-colors ${active ? 'bg-accent text-white' : 'bg-fill text-fg-2 active:bg-accent-soft'}`;
  const setStart = (m: number) => setStartMin(Math.max(0, Math.min(DAY_MAX - 5, m)));
  const pomo = settings.pomodoroFocus;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? (isPlan ? '予定を編集' : '記録を編集') : isPlan ? '予定を立てる' : 'あとから記録'}
      subtitle={isPlan ? '開始と長さを決めるだけ。終わりは自動で決まります' : '電車の中や紙の勉強も、旅の一部に'}
      action={
        <Pressable onClick={save} disabled={!valid} className="hit flex h-8 items-center gap-1 rounded-full bg-accent px-3.5 text-[12.5px] font-bold text-white disabled:opacity-40">
          <Check size={14} strokeWidth={3} /> 保存
        </Pressable>
      }
    >
      <div className="space-y-5 pb-4">
        {!editing && (
          <Segmented<EntryKind>
            value={kind}
            onChange={setKind}
            options={[
              { value: 'plan', label: '予定を立てる' },
              { value: 'record', label: '実績を記録' },
            ]}
          />
        )}

        {/* 科目：選ぶ・その場で作る */}
        <section>
          <p className="section-label mb-2">科目</p>
          <div className="flex flex-wrap gap-2">
            {activeSubjects.map((sub) => {
              const active = sub.id === subjectId;
              return (
                <motion.button
                  key={sub.id}
                  onClick={() => setSubjectId(sub.id)}
                  aria-pressed={active}
                  className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-bold transition-colors"
                  style={{
                    background: active ? alpha(sub.color, 0.18) : 'rgb(var(--c-fill))',
                    color: active ? sub.color : 'rgb(var(--c-fg2))',
                    boxShadow: active ? `inset 0 0 0 1.5px ${alpha(sub.color, 0.65)}` : 'none',
                  }}
                >
                  <SubjectIcon subject={sub} size={14} />
                  {sub.name}
                </motion.button>
              );
            })}
            {!creating && (
              <button onClick={() => setSubjectId(NEW)} className="flex items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-2 text-[12.5px] font-bold text-accent-ink">
                <Plus size={14} strokeWidth={2.6} /> 新しい科目
              </button>
            )}
          </div>
          {creating && (
            <div className="mt-2 flex items-center gap-2">
              <input className="field py-2.5" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="科目名（例：英語、簿記、ゼミ）" maxLength={20} autoFocus />
              {activeSubjects.length > 0 && (
                <button aria-label="新しい科目をやめる" onClick={() => setSubjectId(activeSubjects[0].id)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-fill text-fg-2">
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          {creating && newName.trim() && <p className="mt-1.5 px-1 text-[12px] text-fg-2">保存すると「{newName.trim()}」のルート（山）もできます</p>}
        </section>

        {/* 日付 */}
        <section>
          <p className="section-label mb-2">日付</p>
          <div className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1">
            {[0, 1, 2].map((i) => {
              const k = dateKey(addDays(Date.now(), i));
              return (
                <button key={i} onClick={() => setDate(k)} className={chip(date === k)}>
                  {['今日', '明日', '明後日'][i]}
                </button>
              );
            })}
            <input type="date" className="field ml-auto w-[150px] shrink-0 px-2.5 py-1.5 text-[13px]" value={date} onChange={(ev) => ev.target.value && setDate(ev.target.value)} aria-label="日付を選ぶ" />
          </div>
        </section>

        {/* 開始 */}
        <section>
          <p className="section-label mb-2">開始</p>
          <div className="flex items-center gap-2">
            <button aria-label="15分早く" onClick={() => setStart(startMin - 15)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fill text-fg-2">
              <Minus size={18} />
            </button>
            <input type="time" step={300} className="field flex-1 text-center text-[20px] font-extrabold tabular" value={timeToInput(startMin)} onChange={(ev) => ev.target.value && setStart(inputToMin(ev.target.value))} aria-label="開始時刻" />
            <button aria-label="15分遅く" onClick={() => setStart(startMin + 15)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fill text-fg-2">
              <Plus size={18} />
            </button>
          </div>
          <div className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1">
            {isPlan && date === today && (
              <button onClick={() => setStart(nowMin)} className={`${chip(startMin === nowMin)} flex items-center gap-1`}>
                <Clock size={13} /> いまから
              </button>
            )}
            {!isPlan && date === today && (
              <button onClick={() => setStart(Math.max(0, nowMin - duration))} className={`${chip(endMin === nowMin)} flex items-center gap-1`}>
                <Clock size={13} /> いま終わった
              </button>
            )}
            {afterLast != null && afterLast < DAY_MAX - 5 && (
              <button onClick={() => setStart(afterLast)} className={chip(startMin === afterLast)}>
                前の予定のあと {fmtClock(afterLast)}
              </button>
            )}
            <button onClick={() => setStart(settings.wakeMin)} className={`${chip(startMin === settings.wakeMin)} flex items-center gap-1`}>
              <Sunrise size={13} /> 起床 {fmtClock(settings.wakeMin)}
            </button>
          </div>
        </section>

        {/* 長さ（終わりは自動） */}
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="section-label">長さ</p>
            <p className="tabular text-[12.5px] font-bold text-fg-2">
              {fmtClock(startMin)} → <span className="text-fg">{fmtClock(endMin)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button aria-label="5分短く" onClick={() => setDuration((d) => Math.max(5, d - 5))} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fill text-fg-2">
              <Minus size={18} />
            </button>
            <p className="tabular flex-1 text-center text-[20px] font-extrabold">{fmtDuration(duration)}</p>
            <button aria-label="5分長く" onClick={() => setDuration((d) => Math.min(DAY_MAX, d + 5))} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fill text-fg-2">
              <Plus size={18} />
            </button>
          </div>
          <div className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1">
            {DURATIONS.map((d) => (
              <button key={d} onClick={() => setDuration(d)} className={chip(duration === d)}>
                {fmtDuration(d)}
              </button>
            ))}
            {[2, 4].map((n) => {
              const d = n * pomo + (n - 1) * settings.pomodoroShortBreak;
              return (
                <button key={n} onClick={() => setDuration(d)} className={chip(duration === d)}>
                  ポモドーロ ×{n}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
            {future ? (
              <Warn>未来の時刻は記録できません（予定として追加できます）</Warn>
            ) : startMin + duration > DAY_MAX ? (
              <Warn>24:00 で区切ります</Warn>
            ) : overlap ? (
              <Warn>ほかの予定と重なっています</Warn>
            ) : (
              <span className="text-fg-2">ポモドーロ（{pomo}分）なら約 {Math.max(1, Math.round(duration / (pomo + settings.pomodoroShortBreak)))} 回分</span>
            )}
          </div>
        </section>

        {/* タイトル・メモ */}
        <label className="block min-w-0">
          <span className="section-label mb-1.5 block">{isPlan ? 'タイトル（任意）' : 'メモ（任意）'}</span>
          <input className="field" placeholder={isPlan ? '例：過去問 第3回' : '例：通勤電車で単語帳 3 周'} value={text} onChange={(ev) => setText(ev.target.value)} maxLength={40} />
        </label>
        {isPlan && recentTitles.length > 0 && (
          <div className="-mt-3 flex flex-wrap gap-1.5">
            {recentTitles.map((t) => (
              <button key={t} onClick={() => setText(t)} className={chip(text === t)}>
                {t}
              </button>
            ))}
          </div>
        )}

        {/* くり返し（新しい予定だけ） */}
        {isPlan && !editing && (
          <section>
            <p className="section-label mb-2 flex items-center gap-1.5">
              <Repeat size={13} /> くり返し
            </p>
            <Segmented<RepeatMode>
              size="sm"
              value={repeat}
              onChange={setRepeat}
              options={[
                { value: 'none', label: 'しない' },
                { value: 'daily', label: '毎日 7日' },
                { value: 'weekdays', label: '平日 5日' },
                { value: 'weekly', label: '毎週 4回' },
              ]}
            />
          </section>
        )}

        {editing && (
          <button onClick={remove} className="flex w-full items-center justify-center gap-2 rounded-card bg-danger-soft py-3 text-[13px] font-bold text-danger-ink">
            <Trash2 size={16} /> {isPlan ? 'この予定を削除' : 'この記録を削除'}
          </button>
        )}
      </div>
    </Sheet>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-danger-soft px-3 py-1 font-bold text-danger-ink">
      <AlertCircle size={14} />
      {children}
    </span>
  );
}

export function draftFromNow(kind: EntryKind, date: string, wakeMin = 9 * 60): EntryDraft {
  const isToday = date === dateKey(Date.now());
  const nowMin = Math.ceil(minutesOfDay(Date.now()) / 5) * 5;
  if (kind === 'record') {
    const endMin = isToday ? Math.max(60, nowMin) : 10 * 60;
    return { kind, date, startMin: endMin - 60, endMin };
  }
  const startMin = isToday ? Math.min(22 * 60, nowMin) : Math.max(wakeMin, 9 * 60);
  return { kind, date, startMin, endMin: startMin + 50 };
}
