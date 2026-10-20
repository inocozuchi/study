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

/**
 * 画面の最下部に固定したタブバー（泰山木POS と同じ）。
 * 帯は地の色のまま（境目の線を出さない）。いまどこにいるかは、選ばれた項目の淡い青の面で分かる。
 * 下端はホームインジケーターの分だけ余白を取る。
 */
export function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <nav className="fabric-canvas w-full border-t border-dashed border-line-strong/70 px-3.5 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2" aria-label="メインナビゲーション">
      <div className="mx-auto flex max-w-xl gap-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = key === tab;
          return (
            <motion.button
              key={key}
              onClick={() => onChange(key)}
              whileTap={{ scale: 0.94 }}
              transition={spring}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-[3px] rounded-card px-0.5 pb-[5px] pt-1.5 text-[11px] font-bold transition-colors duration-150 ${active ? 'bg-accent-soft text-accent-ink' : 'text-fg-2'}`}
            >
              <Icon size={23} strokeWidth={active ? 2.3 : 2} />
              <span>{label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
