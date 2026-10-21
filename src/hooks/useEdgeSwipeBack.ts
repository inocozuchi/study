import { useRef, type PointerEvent as RPointerEvent } from 'react';
import { animate, useMotionValue } from 'framer-motion';

/** 左端から何 px 以内で指を置いたら「戻る」のスワイプとみなすか（iOS と同じくらい） */
const EDGE = 22;

/**
 * iOS の「左端から右へスワイプして戻る」。見た目は持たない（x をいまの画面の style に渡す）。
 *  - 画面の左端に指を置いて右へ引くと、画面が指についてくる（x）
 *  - 幅の 1/3 を越えるか、勢いよく払うと、画面が右へ抜けてから onBack
 *  - 足りなければバネで元の位置へ戻る
 *  - 縦に動いたとき・ダイヤル（role=slider）の上では始めない
 * bind は画面のいちばん外の要素に付ける（キャプチャで受ける）。
 */
export function useEdgeSwipeBack(onBack: () => void, enabled = true) {
  const x = useMotionValue(0);
  const g = useRef<{ id: number; x0: number; y0: number; w: number; live: boolean; t: number; lastX: number; v: number } | null>(null);

  const onPointerDownCapture = (e: RPointerEvent) => {
    if (!enabled || e.clientX > EDGE || (e.target as Element).closest?.('[role="slider"]')) return;
    g.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, w: (e.currentTarget as HTMLElement).clientWidth || innerWidth, live: false, t: performance.now(), lastX: e.clientX, v: 0 };
  };
  const onPointerMoveCapture = (e: RPointerEvent) => {
    const s = g.current;
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x0;
    const dy = e.clientY - s.y0;
    if (!s.live) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        g.current = null;
        return;
      }
      if (dx < 10) return;
      s.live = true;
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    }
    const now = performance.now();
    s.v = ((e.clientX - s.lastX) / Math.max(1, now - s.t)) * 1000;
    s.t = now;
    s.lastX = e.clientX;
    x.set(Math.max(0, dx));
    e.stopPropagation();
  };
  const finish = (e: RPointerEvent) => {
    const s = g.current;
    g.current = null;
    if (!s || !s.live || e.pointerId !== s.id) return;
    e.stopPropagation();
    const dx = x.get();
    if (dx > s.w / 3 || s.v > 650) {
      void animate(x, s.w, { type: 'spring', stiffness: 420, damping: 40, velocity: s.v }).then(() => {
        onBack();
        // 戻った先の画面がこの x を使っていなければ見えない。少しあとで元に戻す（同じ画面に戻ってきたとき用）
        setTimeout(() => x.set(0), 600);
      });
    } else animate(x, 0, { type: 'spring', stiffness: 520, damping: 42 });
  };
  return {
    x,
    bind: { onPointerDownCapture, onPointerMoveCapture, onPointerUpCapture: finish, onPointerCancelCapture: finish },
  };
}
