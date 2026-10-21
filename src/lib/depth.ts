import { useEffect, useSyncExternalStore } from 'react';

/**
 * iOS のシート表示の奥行き：シート・予約・設定などが開いている間、後ろのアプリ全体を少し奥へ引っ込める
 * （App の stage が scale 0.94・下へ 8px・角丸・暗く）。開いている数を数えるだけ。
 */
let open = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** shown の間、後ろを奥へ引っ込める */
export function usePresentDepth(shown: boolean) {
  useEffect(() => {
    if (!shown) return;
    open++;
    emit();
    return () => {
      open--;
      emit();
    };
  }, [shown]);
}

export function useDepth() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open > 0,
  );
}
