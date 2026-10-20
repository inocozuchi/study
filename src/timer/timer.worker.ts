/// <reference lib="webworker" />
// 時間の計算はしない。メインスレッドへ「今」を伝える合図だけを送る。
// Worker のタイマーは非アクティブタブでもメインスレッドより間引かれにくい。
let handle: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e: MessageEvent<{ type: 'start' | 'stop'; interval?: number }>) => {
  if (e.data.type === 'start') {
    if (handle) clearInterval(handle);
    handle = setInterval(() => self.postMessage({ type: 'tick', now: Date.now() }), e.data.interval ?? 250);
    self.postMessage({ type: 'tick', now: Date.now() });
  } else if (handle) {
    clearInterval(handle);
    handle = null;
  }
};
