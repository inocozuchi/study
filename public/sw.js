/* Focus Trail Service Worker
 * - インストール時に index.html を取得し、参照しているハッシュ付きアセットも事前キャッシュ
 * - ナビゲーション：ネットワーク優先（オフライン時はキャッシュの index.html）
 * - BGM・環境音の一覧（bgm/tracks.json・ambient/sounds.json・sounds/sounds.json）：ネットワーク優先（アップロードした音がすぐ反映される）
 * - Google Fonts（フォント設定で選んだ書体）：キャッシュ優先。版をまたいで残し、オフラインでも同じ書体で表示する
 * - 同一オリジンの静的アセット（BGM の音声ファイルを含む）：キャッシュ優先 + 裏で更新（stale-while-revalidate）
 */
// 公開時に deploy.yml がビルド番号を付け足す（毎回 SW が更新され、古いアセットのキャッシュが消える）
const VERSION = 'focus-trail-v17';
const FONT_CACHE = 'focus-trail-fonts';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll(SHELL);
      try {
        const res = await fetch('./index.html', { cache: 'no-store' });
        const html = await res.text();
        const assets = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => m[1]);
        if (assets.length) await cache.addAll(assets);
      } catch {
        /* オフラインでのインストールは shell のみ */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION && k !== FONT_CACHE && !k.startsWith('focus-trail-bake')).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if ((url.hostname === 'fonts.googleapis.com' && !url.searchParams.has('text')) || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(FONT_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      })(),
    );
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(VERSION);
          if (fresh.ok) cache.put('./index.html', fresh.clone());
          return fresh;
        } catch {
          return (await caches.match('./index.html')) || Response.error();
        }
      })(),
    );
    return;
  }

  if (url.pathname.endsWith('/bgm/tracks.json') || url.pathname.endsWith('/ambient/sounds.json') || url.pathname.endsWith('/sounds/sounds.json')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        try {
          const fresh = await fetch(req, { cache: 'no-store' });
          if (fresh.ok) cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return (await cache.match(req)) || Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => undefined);
      return cached || (await network) || Response.error();
    })(),
  );
});
