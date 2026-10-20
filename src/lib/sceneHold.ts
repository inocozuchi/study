import { useEffect, useSyncExternalStore } from 'react';

/**
 * 画面全体を覆うもの（設定など）が開いている間は、下にあるシーンを止めて隠す。
 * 見えないシーンを動かし続けると、iPhone では覆っている画面の動きまで重くなる。
 */
let holds = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** open の間、シーンを止める */
export function useHoldScene(open: boolean) {
  useEffect(() => {
    if (!open) return;
    holds++;
    emit();
    return () => {
      holds--;
      emit();
    };
  }, [open]);
}

export function useSceneHeld() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => holds > 0,
  );
}
