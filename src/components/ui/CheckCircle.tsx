import { motion } from 'framer-motion';
import { springBouncy } from '@/lib/motion';

/** iOS リマインダー風の丸いチェックボックス（既定は操作の青。習慣などは自分の色） */
export function CheckCircle({ checked, onChange, color, size = 26, label }: { checked: boolean; onChange: () => void; color?: string; size?: number; label?: string }) {
  return (
    <motion.button
      transition={springBouncy}
      onClick={onChange}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`relative grid shrink-0 place-items-center rounded-full ${checked ? '' : 'ring-[1.75px] ring-inset ring-line-strong'}`}
      style={{ width: size, height: size }}
    >
      <motion.span
        className={`absolute inset-0 rounded-full ${color ? '' : 'bg-accent'}`}
        initial={false}
        animate={{ scale: checked ? 1 : 0.4, opacity: checked ? 1 : 0 }}
        transition={springBouncy}
        style={color ? { background: color } : undefined}
      />
      {checked && (
        // チェックの印は書くように左から右へ引かれる（iOS のリマインダー）
        <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} className="relative text-white" aria-hidden>
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1], delay: 0.05 }}
          />
        </svg>
      )}
    </motion.button>
  );
}
