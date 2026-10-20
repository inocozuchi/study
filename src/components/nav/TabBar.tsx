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

/** 画面の最下部に固定したタブバー（端から端まで。下端はホームインジケーターの分だけ余白を取る） */
export function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  const index = Math.max(0, TABS.findIndex((t) => t.key === tab));
  return (
    <nav
      className="relative w-full border-t border-white/[0.08] bg-night-900/90 pb-[max(env(safe-area-inset-bottom),8px)] backdrop-blur-xl"
      aria-label="メインナビゲーション"
    >
      <div className="relative mx-auto flex max-w-xl">
        {/* 選択中のタブの上に細い線（index × 100% で動かす。layoutId は使わない） */}
        <motion.span
          className="absolute left-0 top-0 flex justify-center"
          style={{ width: `${100 / TABS.length}%` }}
          initial={false}
          animate={{ x: `${index * 100}%` }}
          transition={spring}
        >
          <span className="h-[3px] w-8 rounded-b-full bg-summit" />
        </motion.span>
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = key === tab;
          return (
            <motion.button
              key={key}
              onClick={() => onChange(key)}
              whileTap={{ scale: 0.9 }}
              transition={spring}
              aria-current={active ? 'page' : undefined}
              className={`flex h-[54px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${active ? 'text-white' : 'text-white/50'}`}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              <span>{label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
