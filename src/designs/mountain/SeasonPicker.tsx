import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { SeasonSwatch } from './SeasonSwatch';
import { SEASONS, SEASON_ORDER } from './scene/palette';
import { springBouncy } from '@/lib/motion';
import type { SkyOverride } from '@/types';
import type { DesignSetupProps } from '../types';

const SKIES: { value: SkyOverride; label: string }[] = [
  { value: 'auto', label: '旅の時間' },
  { value: 'clock', label: '今の時刻' },
  { value: 'dawn', label: '朝' },
  { value: 'day', label: '昼' },
  { value: 'sunset', label: '夕' },
  { value: 'night', label: '夜' },
];

/** 支度シートに差し込む「シーズン」と「空の時間」の選択（iOS のシートの中で使う） */
export function SeasonPicker({ draft, onChange }: DesignSetupProps) {
  const season = draft.season;
  const sky = draft.sky ?? 'auto';
  return (
    <>
      <div className="grid grid-cols-5 gap-2">
        {SEASON_ORDER.map((s) => {
          const active = s === season;
          return (
            <motion.button key={s} whileTap={{ scale: 0.9 }} transition={springBouncy} onClick={() => onChange({ season: s })} className="flex flex-col items-center gap-1.5" aria-pressed={active} aria-label={`${SEASONS[s].label}の山`}>
              <span className={`relative block w-full overflow-hidden rounded-2xl transition-shadow ${active ? 'shadow-[0_0_0_2.5px_#fff]' : 'shadow-[0_0_0_1px_rgba(255,255,255,0.12)]'}`}>
                <SeasonSwatch season={s} className="block aspect-[4/3] w-full" />
                {active && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springBouncy} className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-night-950">
                    <Check size={10} strokeWidth={3.5} />
                  </motion.span>
                )}
              </span>
              <span className={`text-[12px] font-semibold ${active ? 'text-white' : 'text-white/50'}`}>{SEASONS[s].label}</span>
            </motion.button>
          );
        })}
      </div>

      <p className="section-label mb-2 mt-5">空の時間</p>
      <div className="flex flex-wrap gap-2">
        {SKIES.map((o) => {
          const active = o.value === sky;
          return (
            <motion.button
              key={o.value}
              whileTap={{ scale: 0.92 }}
              transition={springBouncy}
              onClick={() => onChange({ sky: o.value })}
              aria-pressed={active}
              className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${active ? 'bg-white text-night-950' : 'bg-white/[0.08] text-white/70'}`}
            >
              {o.label}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[12px] text-white/45">
        {sky === 'auto' ? '集中を始めると朝。時間が進むほど昼・夕方になり、休憩で夜になります' : sky === 'clock' ? '今の時刻の空で登ります' : '空の時間をこのままにします'}
      </p>
    </>
  );
}
