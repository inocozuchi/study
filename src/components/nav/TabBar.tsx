import { useEffect, useRef } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { CalendarDays, ChartColumn, Route, Tent, type LucideIcon } from 'lucide-react';
import { easeIOS, spring } from '@/lib/motion';

/** 選択の面が滑るバネ（液体のように少し伸びて、スッと収まる） */
const PILL = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 };

export type TabKey = 'trail' | 'timeline' | 'routes' | 'insights';

export const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'trail', label: 'ホーム', icon: Tent },
  { key: 'timeline', label: 'タイムライン', icon: CalendarDays },
  { key: 'routes', label: 'ルート', icon: Route },
  { key: 'insights', label: 'インサイト', icon: ChartColumn },
];

/** タブバーの高さ（index.css の --nav-space もこの値で計算している） */
export const TAB_BAR_H = 60;

/**
 * iOS 風のタブバー：画面の下に浮いたカプセル。アイコンだけ（名前は読み上げ用）。
 * 左右と下に余白を取り、iPhone の角の丸みで欠けないようにする。
 * 選ばれたタブは淡い青の面がスプリングで横へ滑る（layoutId は使わない）。動く間だけ横に少し伸び、着くと縮む（流体のピル）。
 */
/** タブバーの着せ替え（ホームにいる間は旅のモードの色。ほかの画面はアプリ本体の白いバー） */
export interface TabBarSkin {
  bar: string;
  pill: string;
  on: string;
  off: string;
}
const PLAIN: TabBarSkin = { bar: 'border border-line bg-surface shadow-raised', pill: 'bg-accent-soft', on: 'text-accent-ink', off: 'text-fg-2' };

export function TabBar({ tab, onChange, skin = PLAIN }: { tab: TabKey; onChange: (t: TabKey) => void; skin?: TabBarSkin }) {
  const idx = Math.max(0, TABS.findIndex((t) => t.key === tab));
  const stretch = useMotionValue(1);
  const prev = useRef(idx);
  useEffect(() => {
    if (prev.current === idx) return;
    const far = Math.abs(idx - prev.current);
    prev.current = idx;
    const c = animate(stretch, [1, 1 + 0.12 * Math.min(3, far), 1], { duration: 0.5, ease: easeIOS, times: [0, 0.35, 1] });
    return () => c.stop();
  }, [idx, stretch]);
  return (
    <div className="tabbar-pad px-6">
      <nav
        className={`relative mx-auto flex max-w-[340px] rounded-full p-1.5 transition-colors duration-300 ${skin.bar}`}
        style={{ height: TAB_BAR_H }}
        aria-label="メインナビゲーション"
      >
        <motion.span
          className={`absolute bottom-1.5 left-1.5 top-1.5 rounded-full transition-colors duration-300 ${skin.pill}`}
          style={{ width: `calc((100% - 12px) / ${TABS.length})`, scaleX: stretch, willChange: 'transform' }}
          initial={false}
          animate={{ x: `${idx * 100}%` }}
          transition={PILL}
        />
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = key === tab;
          return (
            <motion.button
              key={key}
              onClick={() => onChange(key)}
              transition={spring}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`relative z-10 grid flex-1 place-items-center rounded-full transition-colors duration-150 ${active ? skin.on : skin.off}`}
            >
              <Icon size={24} strokeWidth={active ? 2.3 : 1.9} />
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
