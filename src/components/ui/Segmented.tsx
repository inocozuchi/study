import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { spring } from '@/lib/motion';

interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

/** iOS UISegmentedControl 風。選択ピルがスプリングでスライドする（layoutId は退場アニメーションを止めることがあるため使わない） */
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
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="tablist" className={`relative flex rounded-card bg-line/60 p-1 ${className}`}>
      <motion.span
        className="absolute bottom-1 left-1 top-1 rounded-chip bg-surface shadow-card"
        style={{ width: `calc((100% - 8px) / ${options.length})` }}
        initial={false}
        animate={{ x: `${idx * 100}%` }}
        transition={spring}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`relative z-10 flex-1 whitespace-nowrap rounded-chip font-bold transition-colors ${size === 'sm' ? 'px-1.5 py-1.5 text-[12px]' : 'px-3 py-2 text-[13px]'} ${active ? 'text-fg' : 'text-fg-2'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
