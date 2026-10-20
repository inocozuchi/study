import { Check } from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import type { TrainClass } from '@/types';
import type { DesignSetupProps } from '../types';

const CLASSES: { value: TrainClass; label: string; note: string; color: string }[] = [
  { value: 'local', label: '普通', note: '各駅にのんびり', color: '#1F3A68' },
  { value: 'express', label: '特急', note: '景色が約 1.6 倍速', color: '#C8352B' },
];

/** 支度シートに差し込む「列車」：普通 / 特急（サボ＝行先札ふうの板）と走行音 */
export function ClassPicker({ draft, onChange }: DesignSetupProps) {
  const cls = draft.trainClass ?? 'local';
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {CLASSES.map((c) => {
          const active = c.value === cls;
          return (
            <button key={c.value} onClick={() => onChange({ trainClass: c.value })} aria-pressed={active} className="relative text-left active:scale-[0.97]">
              {/* サボ：白い琺瑯の板に種別の色 */}
              <span className={`block overflow-hidden rounded-[10px] bg-[#FBFAF4] text-[#1F2328] transition-shadow ${active ? 'shadow-[0_0_0_2.5px_rgb(var(--c-accent))]' : 'shadow-[0_0_0_1px_rgb(var(--c-line))]'}`}>
                <span className="block h-2" style={{ background: c.color }} />
                <span className="flex items-baseline justify-center gap-1 px-2 pb-1.5 pt-2">
                  <span className="text-[22px] font-extrabold tracking-[0.3em]" style={{ color: c.color }}>
                    {c.label}
                  </span>
                </span>
                <span className="block border-t border-dashed border-[#D4D0C4] px-2 py-1.5 text-center text-[11px] font-bold text-[#6B7076]">{c.note}</span>
              </span>
              {active && (
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-white">
                  <Check size={12} strokeWidth={3.5} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-card bg-sunken px-4 py-3">
        <span>
          <span className="block text-[15px] font-bold">走行音</span>
          <span className="block text-[12px] text-fg-2">public/sounds/train.mp3 を鳴らす</span>
        </span>
        <Toggle checked={draft.trainSound ?? true} onChange={(v) => onChange({ trainSound: v })} label="走行音" />
      </div>
    </>
  );
}
