/**
 * アプリアイコンと iOS の起動画像を public/icons/icon.svg から生成する。
 *
 *   npm i --no-save playwright-core
 *   CHROME_PATH=/path/to/chrome node scripts/generate-assets.mjs
 *
 * 起動画像は index.html の起動画面（#boot）と同じ見た目（地の色の上、中央にアイコン）。ライト／ダークの 2 通りを作る。
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const svg = fs.readFileSync(path.join(root, 'public/icons/icon.svg'), 'utf8');
const THEMES = [
  { suffix: '', scheme: 'light', bg: '#F2F3F7', shadow: '0 0 0 1px rgba(28,29,34,0.06),0 12px 30px rgba(28,29,34,0.16)' },
  { suffix: '-dark', scheme: 'dark', bg: '#0E1015', shadow: '0 0 0 1px rgba(255,255,255,0.06),0 18px 40px rgba(0,0,0,0.45)' },
];

/** [CSS 幅, CSS 高さ, 倍率] — 縦向きの iPhone */
export const IPHONES = [
  [440, 956, 3], // 16 Pro Max
  [402, 874, 3], // 16 Pro
  [430, 932, 3], // 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus
  [393, 852, 3], // 14 Pro / 15 / 15 Pro / 16
  [428, 926, 3], // 12・13 Pro Max / 14 Plus
  [390, 844, 3], // 12・13・14
  [414, 896, 3], // XS Max / 11 Pro Max
  [414, 896, 2], // XR / 11
  [375, 812, 3], // X・XS・11 Pro・12 mini・13 mini
  [414, 736, 3], // 6・7・8 Plus
  [375, 667, 2], // 6・7・8・SE 2・SE 3
];

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const page = await browser.newPage();

const icon = (size) => svg.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `);

// アプリアイコン（フルブリード。角丸は iOS / Android 側が付ける）
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${icon(size)}</body>`);
  await page.screenshot({ path: path.join(root, 'public/icons', name) });
}
// maskable：円形などで切り抜かれても山が残るよう、図柄を 74% に縮めて余白を足す
await page.setViewportSize({ width: 512, height: 512 });
await page.setContent(`<body style="margin:0"><div style="width:512px;height:512px;background:linear-gradient(#22305A,#0A1022);display:grid;place-items:center">${icon(380)}</div></body>`);
await page.screenshot({ path: path.join(root, 'public/icons/icon-maskable-512.png') });

// iOS 起動画像
for (const t of THEMES) {
  for (const [w, h, r] of IPHONES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: r });
    const p = await ctx.newPage();
    await p.setContent(`<body style="margin:0;background:${t.bg};width:${w}px;height:${h}px;display:grid;place-items:center">
      <div style="width:112px;height:112px;border-radius:25px;overflow:hidden;box-shadow:${t.shadow}">${icon(112)}</div></body>`);
    await p.screenshot({ path: path.join(root, `public/splash/splash-${w * r}x${h * r}${t.suffix}.png`) });
    await ctx.close();
  }
}
await browser.close();

// index.html に貼る <link> を出力
console.log(
  THEMES.flatMap((t) =>
    IPHONES.map(
      ([w, h, r]) =>
        `    <link rel="apple-touch-startup-image" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait) and (prefers-color-scheme: ${t.scheme})" href="./splash/splash-${w * r}x${h * r}${t.suffix}.png" />`,
    ),
  ).join('\n'),
);
