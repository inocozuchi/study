import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Undo2 } from 'lucide-react';
import { easeIOS } from '@/lib/motion';

/**
 * 「元に戻す」の知らせ（アプリ全体で 1 つ）。削除は確認を挟まずにすぐ消し、5 秒だけここから戻せる（CLAUDE.md「操作の原則」）。
 * どこからでも showUndo('〜を削除しました', () => 戻す処理) を呼ぶだけ。App が <UndoToast /> を 1 回置く。
 */
type Item = { id: number; label: string; run: () => void };
let current: Item | null = null;
const listeners = new Set<(i: Item | null) => void>();
let seq = 0;

export function showUndo(label: string, run: () => void) {
  current = { id: ++seq, label, run };
  listeners.forEach((l) => l(current));
}

function clear(id: number) {
  if (current?.id !== id) return;
  current = null;
  listeners.forEach((l) => l(null));
}

export function UndoToast() {
  const [item, setItem] = useState<Item | null>(current);
  useEffect(() => {
    listeners.add(setItem);
    return () => void listeners.delete(setItem);
  }, []);
  useEffect(() => {
    if (!item) return;
    const id = setTimeout(() => clear(item.id), 5000);
    return () => clearTimeout(id);
  }, [item]);
  return createPortal(
    // 下に浮いたタブバーのすぐ上。知らせの外側は押せる（後ろのボタンをふさがない）
    <div className="ui-text pointer-events-none fixed inset-x-0 z-[95] flex justify-center px-4" style={{ bottom: 'calc(var(--nav-space) + 14px)' }}>
      <AnimatePresence>
        {item && (
          <motion.div
            key={item.id}
            role="status"
            className="pointer-events-auto flex items-center gap-3 rounded-full bg-[#1C1E24] py-2 pl-4 pr-2 text-ui-[13px] font-semibold text-white shadow-raised"
            initial={{ y: 16, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            // 出てきた下へ帰る。消えるほうを速く
            exit={{ y: 16, opacity: 0, transition: { duration: 0.16, ease: easeIOS } }}
            transition={{ duration: 0.24, ease: easeIOS }}
          >
            {item.label}
            <button
              onClick={() => {
                item.run();
                clear(item.id);
              }}
              className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 font-bold"
            >
              <Undo2 size={14} /> 元に戻す
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
