import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { springBouncy } from '@/lib/motion';

/** 中央に浮かぶ確認 / お祝い用の窓（重ねて出す窓なので角丸 20px） */
export function Modal({ open, onClose, children, dismissable = true }: { open: boolean; onClose?: () => void; children: ReactNode; dismissable?: boolean }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-x-0 top-0 h-app z-[60] flex items-center justify-center px-6">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'var(--scrim)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => dismissable && onClose?.()}
          />
          <motion.div
            role="alertdialog"
            aria-modal
            className="relative w-full max-w-sm overflow-hidden rounded-sheet bg-surface text-fg shadow-raised"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={springBouncy}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
