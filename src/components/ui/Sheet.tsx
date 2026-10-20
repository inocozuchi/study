import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { springSheet } from '@/lib/motion';
import { Pressable } from './Pressable';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** 上部右に置くアクション */
  action?: ReactNode;
  maxHeight?: string;
}

/** iOS 風ボトムシート：下からスプリングで現れ、つまみをドラッグして閉じられる */
export function Sheet({ open, onClose, title, subtitle, children, action, maxHeight = '88dvh' }: SheetProps) {
  const controls = useDragControls();
  // iOS Safari の vh はツールバーを含む大きい高さなので、見えている高さ（dvh）に直す
  const height = maxHeight.replace(/(\d)vh$/, '$1dvh');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-x-0 top-0 h-app z-50 flex items-end justify-center">
          <motion.div
            className="absolute inset-0"
            style={{ background: 'var(--scrim)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-t-sheet bg-surface pb-safe text-fg shadow-raised sm:mb-4 sm:rounded-sheet"
            // ステータスバーの下に潜らないよう、上に余白を残す
            style={{ maxHeight: `min(${height}, calc(100% - env(safe-area-inset-top) - 12px))` }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springSheet}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.8 }}
            onDragEnd={onDragEnd}
          >
            <div className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing" onPointerDown={(e) => controls.start(e)}>
              <div className="h-1.5 w-10 rounded-full bg-line-strong" />
            </div>
            {(title || action) && (
              <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-1" onPointerDown={(e) => controls.start(e)}>
                <div className="min-w-0">
                  {title && <h2 className="text-[21px] font-extrabold tracking-[-0.01em]">{title}</h2>}
                  {subtitle && <p className="mt-0.5 text-[13px] text-fg-2">{subtitle}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {action}
                  <Pressable onClick={onClose} aria-label="閉じる" className="relative grid h-8 w-8 place-items-center rounded-full bg-fill text-fg-2 after:absolute after:-inset-1.5 after:content-['']">
                    <X size={16} strokeWidth={2.5} />
                  </Pressable>
                </div>
              </div>
            )}
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
