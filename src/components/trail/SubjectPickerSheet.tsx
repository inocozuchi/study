import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sheet } from '@/components/ui/Sheet';
import { SubjectBadge } from '@/components/ui/SubjectBadge';
import { SubjectEditorSheet } from '@/components/routes/SubjectEditorSheet';
import { useApp } from '@/store/AppStore';
import { useTimer } from '@/store/TimerStore';
import { routeProgress, stageFor } from '@/lib/altitude';
import { fmtDuration } from '@/lib/time';

export function SubjectPickerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeSubjects, minutesBySubject, settings } = useApp();
  const { setSubject } = useTimer();
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <>
      <Sheet open={open && !editorOpen} onClose={onClose} title="どの山に登る？" subtitle="集中する科目を選びましょう">
        <div className="space-y-2 pb-4">
          {activeSubjects.map((s) => {
            const mins = minutesBySubject[s.id] ?? 0;
            const prog = routeProgress(s, mins);
            const active = s.id === settings.selectedSubjectId;
            return (
              <motion.button
                key={s.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setSubject(s.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${active ? 'bg-white/[0.12]' : 'bg-white/[0.05]'}`}
              >
                <SubjectBadge subject={s} size={42} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[15px] font-semibold">{s.name}</span>
                    <span className="truncate text-[12px] text-white/45">{s.mountainName}</span>
                  </span>
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full" style={{ width: `${prog * 100}%`, background: s.color }} />
                  </span>
                  <span className="mt-1 block text-[11px] text-white/45">
                    {s.summitedAt ? '登頂済み' : stageFor(prog).name} · {fmtDuration(mins)}
                  </span>
                </span>
                {active && <Check size={18} className="text-white" strokeWidth={2.6} />}
              </motion.button>
            );
          })}
          <button onClick={() => setEditorOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3.5 text-[14px] font-semibold text-white/65">
            <Plus size={16} /> 新しいルートをひらく
          </button>
        </div>
      </Sheet>
      <SubjectEditorSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={(s) => {
          setSubject(s.id);
          onClose();
        }}
      />
    </>
  );
}
