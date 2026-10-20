import { motion } from 'framer-motion';
import { CalendarDays, ChartColumn, Route, Tent, type LucideIcon } from 'lucide-react';
import { spring } from '@/lib/motion';

export type TabKey = 'trail' | 'timeline' | 'routes' | 'insights';

export const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'trail', label: 'ホーム', icon: Tent },
  { key: 'timeline', label: 'タイムライン', icon: CalendarDays },
  { key: 'routes', label: 'ルート', icon: Route },
  { key: 'insights', label: 'インサイト', icon: ChartColumn },
];

export function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <nav className="glass-strong relative mx-auto flex w-full max-w-md items-stretch rounded-[1.75rem] p-1.5" aria-label="メインナビゲーション">
      <motion.span
        className="absolute bottom-1.5 left-1.5 top-1.5 rounded-[1.35rem] bg-white/[0.13] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
        style={{ width: `calc((100% - 12px) / ${TABS.length})` }}
        initial={false}
        animate={{ x: `${Math.max(0, TABS.findIndex((t) => t.key === tab)) * 100}%` }}
        transition={spring}
      />
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = key === tab;
        return (
          <motion.button
            key={key}
            onClick={() => onChange(key)}
            whileTap={{ scale: 0.92 }}
            transition={spring}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-[1.35rem] py-2 text-[11px] font-semibold transition-colors ${active ? 'text-white' : 'text-white/45'}`}
          >
            <motion.span className="relative" animate={{ y: active ? -1 : 0, scale: active ? 1.08 : 1 }} transition={spring}>
              <Icon size={21} strokeWidth={active ? 2.4 : 2} />
            </motion.span>
            <span className="relative">{label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}
