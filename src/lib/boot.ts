/** index.html の起動画面（#boot）をなめらかに消す。アプリの準備ができたら 1 回だけ呼ぶ */
let done = false;

export function hideBoot() {
  if (done) return;
  done = true;
  const el = document.getElementById('boot');
  if (!el) return;
  // 最初のフレームが描かれてから消す（白い一瞬を作らない）
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      el.classList.add('hide');
      setTimeout(() => el.remove(), 600);
    }),
  );
}
