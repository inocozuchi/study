import { motion } from 'framer-motion';
import { useId, type ReactNode } from 'react';
import { spring } from '@/lib/motion';

interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

/** iOS UISegmentedControl 風。選択ピルが layoutId でスライドする */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = '',
  size = 'md',
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const id = useId();
  return (
    <div role="tablist" className={`glass-thin relative flex rounded-2xl p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`relative z-10 flex-1 whitespace-nowrap rounded-xl font-semibold transition-colors ${size === 'sm' ? 'px-1.5 py-1.5 text-[12px]' : 'px-3 py-2 text-[13px]'} ${active ? 'text-white' : 'text-white/50'}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring}
                className="absolute inset-0 -z-10 rounded-xl bg-white/[0.16] shadow-[0_2px_10px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
