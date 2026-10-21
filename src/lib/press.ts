/**
 * すべてのボタンの「押し込み」：押した瞬間にキュッと縮み（scale 0.94）、離すとバネのように 1.0 へ戻る。
 * 1 つのリスナーでアプリ全体のボタン（button / role=button / a / data-press）に効かせる。
 *  - 動かすのは CSS の `scale` プロパティ（Web Animations）。transform とは別の値なので、
 *    framer-motion や Tailwind の translate と重ねても位置がずれない
 *  - 押し込みは iOS の減速カーブ、戻りはわずかに弾むカーブ
 *  - 横に広いカード（画面幅の 60% 以上）は控えめに 0.97、画面を覆うタップ面には効かせない
 *  - 縮み具合は data-press-scale で変えられる。data-no-press で効かせない
 */
const SELECTOR = 'button, [role="button"], a[href], [data-press]';
const PRESS_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const RELEASE_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

export function installPress() {
  if (typeof document === 'undefined' || !('scale' in document.documentElement.style) || !Element.prototype.animate) return;
  let current: { el: HTMLElement; anim: Animation } | null = null;

  const release = () => {
    if (!current) return;
    const { el, anim } = current;
    current = null;
    const now = getComputedStyle(el).scale;
    anim.cancel();
    el.animate([{ scale: now && now !== 'none' ? now : '1' }, { scale: '1' }], { duration: 520, easing: RELEASE_EASE });
  };

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0) return;
      const el = (e.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null;
      if (!el || el.matches(':disabled, [aria-disabled="true"], [data-no-press]') || el.closest('[data-no-press]')) return;
      const r = el.getBoundingClientRect();
      if (r.width > innerWidth * 0.9 && r.height > innerHeight * 0.5) return;
      const to = Number(el.dataset.pressScale) || (r.width > innerWidth * 0.6 ? 0.97 : 0.94);
      release();
      current = { el, anim: el.animate([{ scale: '1' }, { scale: String(to) }], { duration: 160, easing: PRESS_EASE, fill: 'forwards' }) };
    },
    { capture: true, passive: true },
  );
  for (const type of ['pointerup', 'pointercancel', 'dragstart', 'blur']) window.addEventListener(type, release, true);
}
