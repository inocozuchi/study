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

/** タブバーの高さ（ホームの「集中」ボタンなどの位置合わせに使う） */
export const TAB_BAR_H = 60;

/**
 * iOS 風のタブバー：画面の下に浮いたカプセル。アイコンだけ（名前は読み上げ用）。
 * 左右と下に余白を取り、iPhone の角の丸みで欠けないようにする。
 * 選ばれたタブは淡い青の面がスプリングで移動する（layoutId は使わない）。
 */
export function TabBar({ tab, onChange }: { tab: TabKey; onChange: (t: TabKey) => void }) {
  const idx = Math.max(0, TABS.findIndex((t) => t.key === tab));
  return (
    <div className="px-6 pb-[max(calc(env(safe-area-inset-bottom)-6px),14px)]">
      <nav
        className="relative mx-auto flex max-w-[340px] rounded-full border border-line bg-surface p-1.5 shadow-raised"
        style={{ height: TAB_BAR_H }}
        aria-label="メインナビゲーション"
      >
        <motion.span
          className="absolute bottom-1.5 left-1.5 top-1.5 rounded-full bg-accent-soft"
          style={{ width: `calc((100% - 12px) / ${TABS.length})` }}
          initial={false}
          animate={{ x: `${idx * 100}%` }}
          transition={spring}
        />
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = key === tab;
          return (
            <motion.button
              key={key}
              onClick={() => onChange(key)}
              whileTap={{ scale: 0.9 }}
              transition={spring}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`relative z-10 grid flex-1 place-items-center rounded-full transition-colors duration-150 ${active ? 'text-accent-ink' : 'text-fg-2'}`}
            >
              <Icon size={24} strokeWidth={active ? 2.3 : 1.9} />
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
