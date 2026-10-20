import { motion } from 'framer-motion';
import { spring } from '@/lib/motion';

/** iOS のスイッチ。オンは操作の青 1 色（色はここだけで決める） */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; color?: string; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-accent' : 'bg-line-strong/70'}`}
    >
      <motion.span
        className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.22)]"
        animate={{ left: checked ? 22 : 2 }}
        transition={spring}
      />
    </button>
  );
}
