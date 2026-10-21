import { useEffect, useSyncExternalStore } from 'react';

/**
 * 画面全体を覆うもの（設定・予約など）が開いている間は、下にあるシーンを止めて隠す。
 * 見えないシーンを動かし続けると、iPhone では覆っている画面の動きまで重くなる。
 * 隠すのは覆う画面が出きってから（HOLD_DELAY 後）。せり上がる途中は奥のシーンが見えているので、すぐには消さない。
 * 閉じるときはすぐに戻す。
 */
const HOLD_DELAY = 550;
let holds = 0;
let held = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function update() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (holds > 0) {
    if (!held)
      timer = setTimeout(() => {
        held = true;
        emit();
      }, HOLD_DELAY);
  } else if (held) {
    held = false;
    emit();
  }
}

/** open の間、シーンを止める */
export function useHoldScene(open: boolean) {
  useEffect(() => {
    if (!open) return;
    holds++;
    update();
    return () => {
      holds--;
      update();
    };
  }, [open]);
}

export function useSceneHeld() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => held,
  );
}
