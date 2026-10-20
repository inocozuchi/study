import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { spring, springBouncy } from '@/lib/motion';
import { CrayonOutline } from './CrayonDefs';

/** 紙の上の UISegmentedControl（選択中は焦げ茶のフェルト） */
export function PaperSegmented<T extends string>({ value, options, onChange, className = '' }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; className?: string }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="tablist" className={`relative flex rounded-2xl bg-ink/[0.07] p-1 shadow-[inset_0_1px_2px_rgba(58,46,40,0.15)] ${className}`}>
      <motion.span className="ink-btn absolute bottom-1 left-1 top-1 rounded-xl" style={{ width: `calc((100% - 8px) / ${options.length})` }} initial={false} animate={{ x: `${idx * 100}%` }} transition={spring} />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`relative z-10 flex-1 whitespace-nowrap rounded-xl px-2 py-2 text-[13px] font-bold transition-colors ${active ? 'text-paper' : 'text-ink-soft'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** クレヨンで描いた丸いチェック */
export function CrayonCheck({ checked, onChange, color = '#3E8C68', size = 26, label }: { checked: boolean; onChange: () => void; color?: string; size?: number; label?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.82 }}
      transition={springBouncy}
      onClick={onChange}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, color: checked ? '#FFF8EA' : '#6E5D52' }}
    >
      <motion.span
        className="absolute inset-[3px] rounded-full"
        initial={false}
        animate={{ scale: checked ? 1 : 0.3, opacity: checked ? 1 : 0 }}
        transition={springBouncy}
        style={{ background: color, filter: 'url(#crayon-soft)' }}
      />
      <CrayonOutline shape="circle" color={checked ? color : 'rgba(58,46,40,0.55)'} width={1.8} />
      {checked && (
        <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={springBouncy} className="relative">
          <Check size={size * 0.55} strokeWidth={3.4} />
        </motion.span>
      )}
    </motion.button>
  );
}
