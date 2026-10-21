/**
 * クレヨンの絵の焼き込み（Baked / CrayonPart）が進行中かを数える。
 * シーンは焼き込みがすべて終わってから見せる（フィルタなしの下絵や空の層が一瞬出ないように）。
 */
let pending = 0;
const waiters = new Set<() => void>();

export function trackBake<T>(job: Promise<T>): Promise<T> {
  pending++;
  const done = () => {
    pending = Math.max(0, pending - 1);
    if (pending === 0) for (const w of [...waiters]) w();
  };
  job.then(done, done);
  return job;
}

/** 今ある焼き込みがすべて終わったら（2 フレーム待って、新しく始まったものも含めて） */
export function bakesSettled(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (pending === 0) return resolve();
        const w = () => {
          waiters.delete(w);
          resolve();
        };
        waiters.add(w);
      }),
    );
  });
}
