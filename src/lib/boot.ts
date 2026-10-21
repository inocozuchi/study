/**
 * index.html の起動画面（#boot）を 1 回だけ、なめらかに閉じる。
 * 閉じるのは次のすべてがそろったとき：
 *   - データの読み込み（AppStore）
 *   - 最初に見えるシーンの画像のデコード（シーンが markBoot('scene') を呼ぶ。シーンを見せない画面ではすぐ）
 *   - 起動から 600ms（一瞬だけ出て消える点滅を作らない）
 * シーンが遅いときも 3.5 秒で閉じる。閉じ方はフェードアウト + わずかな拡大（scale 1.04）。
 */
const MIN_MS = 600;
const MAX_WAIT_MS = 3500;
const parts = { data: false, scene: false };
let done = false;
let fallback: ReturnType<typeof setTimeout> | null = null;

export function markBoot(part: keyof typeof parts) {
  if (done) return;
  parts[part] = true;
  if (part === 'data' && !fallback) fallback = setTimeout(close, MAX_WAIT_MS);
  if (parts.data && parts.scene) {
    const wait = Math.max(0, MIN_MS - performance.now());
    setTimeout(close, wait);
  }
}

function close() {
  if (done) return;
  done = true;
  if (fallback) clearTimeout(fallback);
  const el = document.getElementById('boot');
  if (!el) return;
  // 最初のフレームが描かれてから消す（白い一瞬を作らない）
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      el.classList.add('hide');
      setTimeout(() => el.remove(), 700);
    }),
  );
}
