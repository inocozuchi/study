/**
 * iOS のホーム画面アプリ（standalone）では、ステータスバーを透過にしていると
 * レイアウトの高さがステータスバーの分だけ短く報告され、画面の下に帯が残ることがある。
 * その場合は端末の画面の高さを --app-h に入れ、アプリの枠（.app-frame / .h-app）をその高さにする。
 */
function isStandalone() {
  return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function measure() {
  const root = document.documentElement;
  if (!isStandalone()) {
    root.style.removeProperty('--app-h');
    return;
  }
  const landscape = innerWidth > innerHeight;
  const screenW = landscape ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
  const screenH = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
  // iPad の分割表示など、画面全体を使っていないときは触らない
  if (Math.abs(innerWidth - screenW) > 2) {
    root.style.removeProperty('--app-h');
    return;
  }
  // 画面より短いときだけ画面の高さに合わせる（キーボード表示中などで縮んだ値は使わない）
  root.style.setProperty('--app-h', `${Math.max(innerHeight, screenH)}px`);
}

export function watchViewport() {
  measure();
  addEventListener('resize', measure);
  addEventListener('orientationchange', () => setTimeout(measure, 300));
}
