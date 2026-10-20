import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { springBouncy } from '@/lib/motion';

/** iOS リマインダー風の丸いチェックボックス */
export function CheckCircle({ checked, onChange, color = '#7FD1A8', size = 26, label }: { checked: boolean; onChange: () => void; color?: string; size?: number; label?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.82 }}
      transition={springBouncy}
      onClick={onChange}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, boxShadow: checked ? 'none' : 'inset 0 0 0 1.75px rgba(255,255,255,0.35)' }}
    >
      <motion.span className="absolute inset-0 rounded-full" initial={false} animate={{ scale: checked ? 1 : 0.4, opacity: checked ? 1 : 0 }} transition={springBouncy} style={{ background: color }} />
      {checked && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springBouncy} className="relative text-night-950">
          <Check size={size * 0.58} strokeWidth={3.2} />
        </motion.span>
      )}
    </motion.button>
  );
}
