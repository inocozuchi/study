import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { springBouncy } from '@/lib/motion';

/** iOS リマインダー風の丸いチェックボックス（既定は操作の青。習慣などは自分の色） */
export function CheckCircle({ checked, onChange, color, size = 26, label }: { checked: boolean; onChange: () => void; color?: string; size?: number; label?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.82 }}
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
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springBouncy} className="relative text-white">
          <Check size={size * 0.58} strokeWidth={3.2} />
        </motion.span>
      )}
    </motion.button>
  );
}
