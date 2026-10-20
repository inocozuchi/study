import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Sheet } from './Sheet';

export interface PickerOption<T> {
  value: T;
  label: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
}

/** iOS のアクションシート風の選択モーダル（紙のトーン） */
export function PickerModal<T extends string | number>({
  open,
  onClose,
  title,
  subtitle,
  value,
  options,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  value: T;
  options: PickerOption<T>[];
  onSelect: (v: T) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle} tone="paper">
      <div className="paper-card mb-4 divide-y divide-ink/10 overflow-hidden">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <motion.button
              key={String(o.value)}
              whileTap={{ backgroundColor: 'rgba(58,46,40,0.06)' }}
              onClick={() => {
                onSelect(o.value);
                onClose();
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              {o.icon && <span className="grid h-8 w-8 shrink-0 place-items-center text-[18px]">{o.icon}</span>}
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{o.label}</span>
                {o.detail && <span className="mt-0.5 block text-[12px] text-ink-soft">{o.detail}</span>}
              </span>
              {active && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid h-6 w-6 place-items-center rounded-full bg-crayon-brown text-paper">
                  <Check size={14} strokeWidth={3} />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </Sheet>
  );
}
