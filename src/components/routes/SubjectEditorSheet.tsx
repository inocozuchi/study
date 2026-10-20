import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Mountain, Trash2 } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Pressable } from '@/components/ui/Pressable';
import { SubjectBadge } from '@/components/ui/SubjectBadge';
import { MOUNTAIN_SUGGESTIONS, SUBJECT_COLORS, SUBJECT_ICONS, alpha } from '@/lib/subjects';
import { METERS_PER_MINUTE, fmtMeters } from '@/lib/altitude';
import { useApp } from '@/store/AppStore';
import type { Subject, SubjectIconKey } from '@/types';
import { spring } from '@/lib/motion';

const HOURS = [5, 10, 20, 30, 50, 100];

export function SubjectEditorSheet({ open, onClose, subject, onSaved }: { open: boolean; onClose: () => void; subject?: Subject | null; onSaved?: (s: Subject) => void }) {
  const { saveSubject, deleteSubject, minutesBySubject } = useApp();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(SUBJECT_COLORS[0]);
  const [icon, setIcon] = useState<SubjectIconKey>('book');
  const [mountainName, setMountainName] = useState('');
  const [hours, setHours] = useState(10);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (subject) {
      setName(subject.name);
      setColor(subject.color);
      setIcon(subject.icon);
      setMountainName(subject.mountainName);
      setHours(Math.round(subject.targetMinutes / 60));
    } else {
      setName('');
      setColor(SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)]);
      setIcon('book');
      setMountainName(MOUNTAIN_SUGGESTIONS[Math.floor(Math.random() * MOUNTAIN_SUGGESTIONS.length)]);
      setHours(10);
    }
  }, [open, subject]);

  const valid = name.trim().length > 0 && hours >= 1;
  const save = () => {
    if (!valid) return;
    const saved = saveSubject({
      ...(subject ?? {}),
      name: name.trim(),
      color,
      icon,
      mountainName: mountainName.trim() || '名もなき山',
      targetMinutes: Math.round(hours * 60),
    });
    onSaved?.(saved);
    onClose();
  };

  const studied = subject ? minutesBySubject[subject.id] ?? 0 : 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={subject ? 'ルートを編集' : '新しいルート'}
      subtitle="科目ごとに、登る山をひとつ決めましょう"
      action={
        <Pressable onClick={save} disabled={!valid} className="flex h-8 items-center gap-1 rounded-full bg-white px-3.5 text-[13px] font-bold text-night-950">
          <Check size={14} strokeWidth={3} /> 保存
        </Pressable>
      }
    >
      <div className="space-y-5 pb-4">
        <div className="flex items-center gap-3">
          <SubjectBadge subject={{ icon, color }} size={52} rounded="rounded-2xl" />
          <input className="field text-[17px] font-semibold" placeholder="科目名（例：統計学）" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!subject} />
        </div>

        <section>
          <p className="section-label mb-2">カラー</p>
          <div className="flex flex-wrap gap-2.5">
            {SUBJECT_COLORS.map((c) => (
              <motion.button
                key={c}
                whileTap={{ scale: 0.85 }}
                onClick={() => setColor(c)}
                aria-label={`カラー ${c}`}
                className="relative h-9 w-9 rounded-full"
                style={{ background: c, boxShadow: color === c ? `0 0 0 3px #0C1224, 0 0 0 5px ${c}` : 'none' }}
              >
                {color === c && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} className="absolute inset-0 grid place-items-center text-night-950"><Check size={16} strokeWidth={3} /></motion.span>}
              </motion.button>
            ))}
          </div>
        </section>

        <section>
          <p className="section-label mb-2">アイコン</p>
          <div className="grid grid-cols-6 gap-2">
            {(Object.keys(SUBJECT_ICONS) as SubjectIconKey[]).map((k) => {
              const Icon = SUBJECT_ICONS[k].icon;
              const active = icon === k;
              return (
                <motion.button
                  key={k}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setIcon(k)}
                  aria-label={SUBJECT_ICONS[k].label}
                  className="grid aspect-square place-items-center rounded-2xl transition-colors"
                  style={{ background: active ? alpha(color, 0.22) : 'rgba(255,255,255,0.06)', color: active ? color : 'rgba(255,255,255,0.6)', boxShadow: active ? `inset 0 0 0 1.5px ${alpha(color, 0.6)}` : 'none' }}
                >
                  <Icon size={20} />
                </motion.button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="section-label mb-2">登る山</p>
          <div className="relative">
            <Mountain size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input className="field pl-10" placeholder="山の名前" value={mountainName} onChange={(e) => setMountainName(e.target.value)} />
          </div>
          <div className="no-scrollbar -mx-5 mt-2 flex gap-2 overflow-x-auto px-5">
            {MOUNTAIN_SUGGESTIONS.slice(0, 10).map((m) => (
              <button key={m} onClick={() => setMountainName(m)} className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${mountainName === m ? 'bg-white text-night-950' : 'bg-white/[0.07] text-white/65'}`}>
                {m}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="section-label">登頂までの目標</p>
            <p className="tabular text-[13px] text-white/50">標高 {fmtMeters(hours * 60 * METERS_PER_MINUTE)}</p>
          </div>
          <div className="glass-thin flex items-center gap-3 rounded-2xl p-3">
            <input type="range" min={1} max={200} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="flex-1 accent-white" aria-label="目標時間" />
            <span className="tabular w-16 text-right text-[17px] font-bold">{hours}時間</span>
          </div>
          <div className="mt-2 flex gap-2">
            {HOURS.map((h) => (
              <button key={h} onClick={() => setHours(h)} className={`flex-1 rounded-xl py-1.5 text-[12px] font-semibold ${hours === h ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-white/55'}`}>
                {h}h
              </button>
            ))}
          </div>
          {subject && <p className="mt-2 text-[12px] text-white/40">これまでに {Math.round(studied / 6) / 10} 時間登っています</p>}
        </section>

        {subject && (
          <div className="pt-2">
            {confirmDelete ? (
              <div className="glass-thin flex items-center justify-between gap-3 rounded-2xl p-3">
                <p className="text-[13px] text-white/70">記録もすべて削除されます</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="rounded-xl bg-white/10 px-3 py-2 text-[13px] font-semibold">やめる</button>
                  <button
                    onClick={() => {
                      deleteSubject(subject.id);
                      onClose();
                    }}
                    className="rounded-xl bg-[#FF5A5F] px-3 py-2 text-[13px] font-bold"
                  >
                    削除
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FF5A5F]/10 py-3 text-[14px] font-semibold text-[#FF8A8E]">
                <Trash2 size={16} /> このルートを削除
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
