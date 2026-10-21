/**
 * 画像を先に読み込み、デコード（メモリへの展開）まで済ませる。
 * シーンはこれが終わるまで中身を見せない（背景色やテキストだけが先にむき出しになる一瞬を作らない）。
 * 同じ URL は 1 回だけ。読み込めなかった画像は待たない（失敗しても表示は進める）。
 */
const jobs = new Map<string, Promise<void>>();

export function decodeImage(url: string): Promise<void> {
  let job = jobs.get(url);
  if (!job) {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    job = (img.decode ? img.decode() : new Promise<void>((ok, ng) => ((img.onload = () => ok()), (img.onerror = ng)))).catch(() => {
      // 失敗した URL は次にもう一度試せるように外す
      jobs.delete(url);
    });
    jobs.set(url, job);
  }
  return job;
}

export const decodeAll = (urls: string[]) => Promise.all(urls.map(decodeImage)).then(() => undefined);
