import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Check, Trash2 } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Segmented } from '@/components/ui/Segmented';
import { Pressable } from '@/components/ui/Pressable';
import { SubjectIcon } from '@/components/ui/SubjectBadge';
import { useApp } from '@/store/AppStore';
import { MIN, dateKey, fmtDuration, inputToMin, minutesOfDay, parseDateKey, timeToInput } from '@/lib/time';
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

export function EntrySheet({ open, onClose, draft }: { open: boolean; onClose: () => void; draft: EntryDraft | null }) {
  const { activeSubjects, settings, addSession, updateSession, deleteSession, savePlan, deletePlan } = useApp();
  const [kind, setKind] = useState<EntryKind>('record');
  const [subjectId, setSubjectId] = useState<string>('');
  const [date, setDate] = useState(dateKey(Date.now()));
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [text, setText] = useState('');

  useEffect(() => {
    if (!open || !draft) return;
    setKind(draft.kind);
    setDate(draft.date);
    setStart(timeToInput(draft.startMin));
    setEnd(timeToInput(Math.min(draft.endMin, 23 * 60 + 59)));
    setSubjectId(draft.session?.subjectId ?? draft.plan?.subjectId ?? settings.selectedSubjectId ?? activeSubjects[0]?.id ?? '');
    setText(draft.session?.note ?? draft.plan?.title ?? '');
  }, [open, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  // 閉じるアニメーションの間も、開いていたときの内容を表示しておく
  const lastDraft = useRef<EntryDraft | null>(null);
  if (draft) lastDraft.current = draft;
  const shown = lastDraft.current;
  const editing = !!(shown?.session || shown?.plan);
  const s = inputToMin(start);
  const e = inputToMin(end);
  const minutes = e - s;
  const startTs = parseDateKey(date).getTime() + s * MIN;
  const future = kind === 'record' && startTs + minutes * MIN > Date.now() + MIN;
  const valid = !!subjectId && minutes > 0 && !future;

  const save = () => {
    if (!valid) return;
    if (kind === 'record') {
      const base = { subjectId, start: startTs, end: startTs + minutes * MIN, minutes, note: text.trim() || undefined };
      if (shown?.session) updateSession({ ...shown.session, ...base });
      else addSession({ ...base, source: 'manual' });
    } else {
      savePlan({ id: shown?.plan?.id, subjectId, date, startMin: s, endMin: e, title: text.trim() || undefined });
    }
    onClose();
  };

  const remove = () => {
    if (shown?.session && kind === 'record') deleteSession(shown.session.id);
    else if (shown?.plan) deletePlan(shown.plan.id);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? (kind === 'record' ? '記録を編集' : '予定を編集') : kind === 'record' ? 'あとから記録' : '予定を立てる'}
      subtitle={kind === 'record' ? '電車の中や紙の勉強も、旅の一部に' : 'タイムラインに学習ブロックを置きましょう'}
      action={
        <Pressable onClick={save} disabled={!valid} className="hit flex h-8 items-center gap-1 rounded-full bg-accent px-3.5 text-[13px] font-bold text-white">
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
              { value: 'record', label: '実績を記録' },
              { value: 'plan', label: '予定を追加' },
            ]}
          />
        )}

        <section>
          <p className="section-label mb-2">科目</p>
          <div className="flex flex-wrap gap-2">
            {activeSubjects.map((sub) => {
              const active = sub.id === subjectId;
              return (
                <motion.button
                  key={sub.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSubjectId(sub.id)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold transition-colors"
                  style={{
                    background: active ? alpha(sub.color, 0.22) : 'rgb(var(--c-fill))',
                    color: active ? sub.color : 'rgb(var(--c-fg2))',
                    boxShadow: active ? `inset 0 0 0 1.5px ${alpha(sub.color, 0.6)}` : 'none',
                  }}
                >
                  <SubjectIcon subject={sub} size={14} />
                  {sub.name}
                </motion.button>
              );
            })}
            {activeSubjects.length === 0 && <p className="text-[13px] text-fg-2">先にルート画面で科目を追加してください</p>}
          </div>
        </section>

        <section className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
          <label className="block min-w-0">
            <span className="section-label mb-1.5 block">日付</span>
            <input type="date" className="field min-w-0 px-2.5" value={date} onChange={(ev) => ev.target.value && setDate(ev.target.value)} />
          </label>
          <label className="block min-w-0">
            <span className="section-label mb-1.5 block">開始</span>
            <input type="time" className="field min-w-0 px-2.5" value={start} onChange={(ev) => setStart(ev.target.value)} />
          </label>
          <label className="block min-w-0">
            <span className="section-label mb-1.5 block">終了</span>
            <input type="time" className="field min-w-0 px-2.5" value={end} onChange={(ev) => setEnd(ev.target.value)} />
          </label>
        </section>

        <div className="flex items-center gap-2 text-[13px]">
          {minutes > 0 && !future ? (
            <span className="rounded-full bg-moss/15 px-3 py-1 font-semibold text-moss">{fmtDuration(minutes)}</span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-[#FF5A5F]/15 px-3 py-1 font-semibold text-[#FF8A8E]">
              <AlertCircle size={14} />
              {future ? '未来の時刻は記録できません（予定として追加できます）' : '終了は開始より後にしてください'}
            </span>
          )}
        </div>

        <label className="block min-w-0">
          <span className="section-label mb-1.5 block">{kind === 'record' ? 'メモ' : 'タイトル'}</span>
          <textarea
            className="field min-h-[84px] resize-none"
            placeholder={kind === 'record' ? '例：通勤電車で単語帳 3 周' : '例：過去問 第3回'}
            value={text}
            onChange={(ev) => setText(ev.target.value)}
          />
        </label>

        {editing && (
          <button onClick={remove} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A5F]/10 py-3 text-[14px] font-semibold text-[#FF8A8E]">
            <Trash2 size={16} /> {kind === 'record' ? 'この記録を削除' : 'この予定を削除'}
          </button>
        )}
      </div>
    </Sheet>
  );
}

export function draftFromNow(kind: EntryKind, date: string): EntryDraft {
  const isToday = date === dateKey(Date.now());
  const nowMin = Math.floor(minutesOfDay(Date.now()) / 5) * 5;
  if (kind === 'record') {
    const endMin = isToday ? Math.max(60, nowMin) : 10 * 60;
    return { kind, date, startMin: endMin - 60, endMin };
  }
  const startMin = isToday ? Math.min(22 * 60, nowMin + 30) : 9 * 60;
  return { kind, date, startMin, endMin: startMin + 50 };
}
