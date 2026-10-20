import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { SeasonSwatch } from './SeasonSwatch';
import { SEASONS, SEASON_ORDER } from './scene/palette';
import { springBouncy } from '@/lib/motion';
import type { DesignSetupProps } from '../types';

/** 支度シートに差し込む「シーズン」の選択（iOS のシートの中で使う） */
export function SeasonPicker({ draft, onChange }: DesignSetupProps) {
  const season = draft.season;
  return (
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
  );
}
