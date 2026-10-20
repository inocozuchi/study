import { motion } from 'framer-motion';
import { springBouncy } from '@/lib/motion';

/** iOS UISwitch */
export function Toggle({ checked, onChange, color = '#7FD1A8', label, tone = 'denim' }: { checked: boolean; onChange: (v: boolean) => void; color?: string; label?: string; tone?: 'denim' | 'paper' }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300"
      style={{ background: checked ? color : tone === 'paper' ? 'rgba(58,46,40,0.16)' : 'rgba(255,255,255,0.16)', boxShadow: tone === 'paper' ? 'inset 0 1px 2px rgba(58,46,40,0.25)' : undefined }}
    >
      <motion.span
        className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.3)]"
        animate={{ left: checked ? 22 : 2 }}
        transition={springBouncy}
      />
    </button>
  );
}
