/**
 * Focus Trail の包括テスト（PR の前に必ず実行する）。
 *
 *   npm i --no-save playwright-core@1.56.1   （1 回だけ。依存には入れない）
 *   npm run build && npm run e2e
 *
 * ビルド成果物を vite preview で立ち上げ、iPhone の画面（安全域＝時刻の帯・ホームバーも再現）で
 * 3 つの旅のモードの「ホーム → 予約 → 集中 → 休憩 → 発車 → 長押しで終える → リザルト」と、
 * シート（旅のモード・旅のパス・サウンド・ツール・設定）、記録のタブ、iOS の操作（左端からのスワイプで戻る）を通しで操作する。
 * それぞれの画面で次を確かめ、見つけたものを一覧にする（1 つでもあれば終了コード 1）：
 *   - ページのエラー・コンソールのエラー
 *   - 横にはみ出す画面（横スクロール）
 *   - 見えているボタン同士の重なり（押せなくなる）・画面の外へはみ出したボタン
 *   - ヘッダーの丸いボタンが 42px でない・位置が画面ごとにずれる
 *   - シーンが全画面（時刻の帯・ホームバーの裏まで）に描かれていない
 *   - 「集中」ボタンとタブバーの重なり
 *   - 省略（…）で切れている文字（警告）
 * 画面の写真は tests/e2e/out/ に残る（git には入れない）。
 */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const OUT = fileURLToPath(new URL('./out/', import.meta.url));
const DEVICES = [
  { name: 'iPhone16', width: 393, height: 852, top: 59, bottom: 34 },
  { name: 'iPhoneSE', width: 375, height: 667, top: 20, bottom: 0 },
];
const MODES = ['mountain', 'train', 'flight'];

const issues = [];
const warnings = [];
const fail = (where, msg) => issues.push(`[${where}] ${msg}`);
const warn = (where, msg) => warnings.push(`[${where}] ${msg}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────── 準備 ─────────────────────────

async function startServer() {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE);
      if (r.ok) return proc;
    } catch {
      /* まだ立ち上がっていない */
    }
    await sleep(250);
  }
  throw new Error('vite preview が立ち上がりません（先に npm run build）');
}

async function open(browser, device, settings = {}, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: device.width, height: device.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: device.top, bottom: device.bottom, left: 0, right: 0 } });
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && page.errors.push(m.text()));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(
    ([settings, extra]) => {
      const now = Date.now();
      localStorage.setItem('focus-trail:v1:subjects', JSON.stringify([{ id: 's1', name: '簿記', color: '#199e70', icon: 'calculator', mountainName: '剱岳', targetMinutes: 600, createdAt: now }]));
      const k = 'focus-trail:v1:settings';
      const s = JSON.parse(localStorage.getItem(k) || '{}');
      localStorage.setItem(k, JSON.stringify({ ...s, userName: '旅人', breathing: false, bgmOnFocus: false, sky: 'day', ...settings }));
      localStorage.removeItem('focus-trail:v1:timer');
      sessionStorage.setItem('focus-trail:tab', extra.tab ?? 'trail');
    },
    [settings, extra],
  );
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(2600);
  page.device = device;
  return { ctx, page };
}

const shot = (page, name) => page.screenshot({ path: `${OUT}${page.device.name}-${name}.png` });

// ───────────────────────── 確かめること ─────────────────────────

/** 見えているボタン（大きさ・位置・ラベル）。
 *  - スクロールの枠・overflow で切れている部分は見えていない扱い
 *  - 全面の重ね（シート・設定など）の後ろに隠れているものは数えない（意図した重なり）
 *  - スクロールできる枠の中で、下に浮いた部品（タブバー・CTA）の後ろにあるものは「スクロールすれば押せる」扱い（scrollable）
 */
function visibleButtons(page) {
  return page.evaluate(() => {
    const out = [];
    const area = innerWidth * innerHeight;
    const clickable = (n) => n?.closest?.('button, [role="button"], a[href], label');
    for (const el of document.querySelectorAll('button, [role="button"], a[href]')) {
      // 地図の上の駅・空港の札は、動かせる地図の一部（画面の外・重なりは地図を動かせば見える）
      if (el.closest('[data-map]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
      let o = 1;
      for (let n = el; n && n !== document.body; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      if (o < 0.2) continue;
      // 見えている範囲（画面と、overflow のある親で切る）
      let L = Math.max(0, r.left), T = Math.max(0, r.top), R = Math.min(innerWidth, r.right), B = Math.min(innerHeight, r.bottom);
      let inScroll = false;
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
          const q = n.getBoundingClientRect();
          L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); B = Math.min(B, q.bottom);
          if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 2) inScroll = true;
          if (/(auto|scroll)/.test(s.overflowX) && n.scrollWidth > n.clientWidth + 2) inScroll = true;
        }
      }
      if (R - L < 2 || B - T < 2 || (R - L) * (B - T) < 0.3 * r.width * r.height) continue;
      const pts = [[0.5, 0.5], [0.25, 0.3], [0.75, 0.3], [0.25, 0.7], [0.75, 0.7]].map(([a, b]) => [L + (R - L) * a, T + (B - T) * b]);
      let hits = 0, overlay = 0, by = '';
      for (const [x, y] of pts) {
        const top = document.elementFromPoint(Math.min(innerWidth - 1, x), Math.min(innerHeight - 1, y));
        if (!top || el.contains(top) || top.contains(el) || clickable(top) === el) continue;
        hits++;
        by ||= top.getAttribute('aria-label') || top.className?.toString?.().slice(0, 40) || top.tagName;
        // 覆っているものの重ね（いちばん外の fixed / 大きな面）が画面の半分以上なら、意図した重ね
        let big = false;
        for (let n = top; n && n !== document.body; n = n.parentElement) {
          const q = n.getBoundingClientRect();
          if (q.width * q.height > 0.5 * area && !n.contains(el)) { big = true; break; }
        }
        if (big) overlay++;
      }
      if (hits === pts.length && overlay === pts.length) continue; // 全面の重ねの後ろ
      const covered = hits > 0;
      out.push({ label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 16), x: L, y: T, w: R - L, h: B - T, rx: r.left, ry: r.top, rw: r.width, rh: r.height, covered, inScroll, scrollable: covered && inScroll, coveredBy: by });
    }
    return out;
  });
}

/** スクロールの枠をいちばん下までスクロールして、最後のボタンが押せる（下の浮いた部品に隠れない） */
async function checkScrollEnds(page, where) {
  const res = await page.evaluate(async () => {
    const bad = [];
    const boxes = [...document.querySelectorAll('*')].filter((n) => {
      const s = getComputedStyle(n);
      const q = n.getBoundingClientRect();
      if (!(/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 2 && q.width > 100 && q.height > 100 && s.visibility !== 'hidden')) return false;
      // いちばん上に見えている枠だけ（次の画面の後ろに残っている前の画面は数えない）
      const c = document.elementFromPoint(q.left + q.width / 2, Math.max(0, q.top) + Math.min(q.height, innerHeight) / 2);
      return !!c && n.contains(c);
    });
    for (const n of boxes) {
      const before = n.scrollTop;
      n.scrollTop = n.scrollHeight;
      await new Promise((r) => setTimeout(r, 80));
      const btns = [...n.querySelectorAll('button, [role="button"], a[href]')].filter((b) => b.getBoundingClientRect().height > 2);
      const last = btns.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
      const q = n.getBoundingClientRect();
      // 最後のボタンが枠の下の方にあるときだけ（上でスクロールして見えなくなったタブなどは数えない）
      if (last && last.getBoundingClientRect().bottom > q.top + q.height / 2) {
        const r = last.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, Math.min(innerHeight - 1, r.top + r.height / 2));
        if (top && !last.contains(top) && !top.contains(last) && top.closest('button, [role="button"], a[href], label') !== last)
          bad.push(`${last.getAttribute('aria-label') || last.textContent.trim().slice(0, 16)}（${top.getAttribute('aria-label') || top.className?.toString?.().slice(0, 30) || top.tagName}）`);
      }
      n.scrollTop = before;
    }
    return bad;
  });
  for (const b of res) fail(where, `いちばん下までスクロールしても最後のボタンが隠れています：${b}`);
}

async function checkScreen(page, where, opts = {}) {
  const d = page.device;
  for (const e of page.errors.splice(0)) fail(where, `エラー：${e}`);
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  if (m.sw > m.iw + 1) fail(where, `横にはみ出しています（幅 ${m.sw} > ${m.iw}）`);
  const btns = await visibleButtons(page);
  for (const b of btns) {
    if (!b.scrollable && (b.rx < -1 || b.ry < -1 || b.rx + b.rw > d.width + 1 || b.ry + b.rh > d.height + 1)) {
      if (!opts.allowOffscreen) fail(where, `ボタン「${b.label}」が画面の外にはみ出しています（${Math.round(b.rx)},${Math.round(b.ry)} ${Math.round(b.rw)}×${Math.round(b.rh)}）`);
    }
    if (b.covered && !b.scrollable && !opts.allowCovered) fail(where, `ボタン「${b.label}」の上に別のもの（${b.coveredBy}）が重なって押せません`);
    if (b.y < d.top - 2 && b.y + b.h > 0) fail(where, `ボタン「${b.label}」が時刻の帯（上 ${d.top}px）に入っています`);
    if (b.h < 28 && b.w < 28) warn(where, `ボタン「${b.label}」が小さすぎます（${Math.round(b.w)}×${Math.round(b.h)}）`);
  }
  // 見えているボタン同士の重なり
  for (let i = 0; i < btns.length; i++)
    for (let j = i + 1; j < btns.length; j++) {
      const a = btns[i];
      const b = btns[j];
      if (a.covered || b.covered || a.inScroll !== b.inScroll) continue; // スクロールする中身と浮いた部品（タブバー）はスクロールでずらせる
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      const inside = (p, q) => p.x >= q.x - 1 && p.y >= q.y - 1 && p.x + p.w <= q.x + q.w + 1 && p.y + p.h <= q.y + q.h + 1;
      if (ox > 4 && oy > 4 && !inside(a, b) && !inside(b, a)) fail(where, `ボタン「${a.label}」と「${b.label}」が重なっています`);
    }
  await checkScrollEnds(page, where);
  // 省略で切れている文字（警告）
  const cut = await page.evaluate(() =>
    [...document.querySelectorAll('.truncate')]
      .filter((el) => el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.textContent.trim().slice(0, 24)),
  );
  for (const t of cut) warn(where, `文字が省略されています：「${t}」`);
}

/** ヘッダーの丸いボタン（.btn-icon）：42px、行の位置（安全域 + 12px + 1px） */
async function checkHeader(page, where) {
  const d = page.device;
  const icons = await page.evaluate(() =>
    [...document.querySelectorAll('.screen-header .btn-icon')]
      .map((el) => ({ el, r: el.getBoundingClientRect(), o: getComputedStyle(el).opacity, label: el.getAttribute('aria-label') }))
      // いちばん上に見えているヘッダーだけ（予約・設定の後ろに引っ込んだホームのヘッダーは数えない）
      .filter((x) => x.r.width > 0 && x.o !== '0' && x.el.contains(document.elementFromPoint(x.r.left + x.r.width / 2, x.r.top + x.r.height / 2)))
      .map((x) => ({ w: x.r.width, h: x.r.height, top: x.r.top, label: x.label })),
  );
  if (!icons.length) return null;
  for (const i of icons) if (Math.round(i.w) !== 42 || Math.round(i.h) !== 42) fail(where, `ヘッダーのボタン「${i.label}」が 42px ではありません（${i.w}×${i.h}）`);
  const expect = Math.max(d.top, 16) + 12 + 1;
  const top = Math.round(icons[0].top);
  if (Math.abs(top - expect) > 1) fail(where, `ヘッダーの行の位置がずれています（上から ${top}px、本来は ${expect}px）`);
  return top;
}

/** シーンが全画面（時刻の帯・ホームバーの裏まで） */
async function checkFullBleed(page, where) {
  const r = await page.evaluate(() => {
    const el = document.querySelector('.scene-fade');
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: b.top, bottom: b.bottom, h: innerHeight };
  });
  if (!r) return fail(where, 'シーンが見つかりません');
  if (r.top > 0.5) fail(where, `シーンが画面の上端から始まっていません（${r.top}px 下がっています）`);
  if (r.bottom < r.h - 0.5) fail(where, `シーンが画面の下端まで届いていません（${r.h - r.bottom}px 足りません）`);
}

/** 「集中」ボタンとタブバーが重ならない */
async function checkFocusVsTabbar(page, where) {
  const r = await page.evaluate(() => {
    const f = document.querySelector('[aria-label="集中する"]')?.getBoundingClientRect();
    const n = document.querySelector('nav[aria-label="メインナビゲーション"]')?.getBoundingClientRect();
    return f && n ? { fb: f.bottom, nt: n.top, nb: n.bottom, h: innerHeight } : null;
  });
  if (!r) return fail(where, '「集中」ボタンかタブバーが見つかりません');
  if (r.fb > r.nt - 6) fail(where, `「集中」ボタン（下端 ${Math.round(r.fb)}）がタブバー（上端 ${Math.round(r.nt)}）に重なっています`);
  if (r.nb > r.h + 0.5) fail(where, 'タブバーが画面の下にはみ出しています');
}

async function press(page, selector, ms) {
  // 見えているものだけ（休憩のカードの「ここで旅を終える」など、隠れている同じ名前のボタンを押さない）
  const el = page.locator(selector).filter({ visible: true }).last();
  await el.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  const b = await el.boundingBox().catch(() => null);
  if (!b) throw new Error(`見つかりません：${selector}`);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await sleep(ms);
  await page.mouse.up();
}

/** 左端から右へスワイプ（iOS の「戻る」） */
async function edgeSwipe(page) {
  const y = page.device.height * 0.5;
  await page.mouse.move(4, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(4 + i * 24, y, { steps: 1 });
  await page.mouse.up();
  await sleep(900);
}

const visible = (page, text) => page.evaluate((t) => [...document.querySelectorAll('p, span, h1, button')].some((el) => el.textContent.trim() === t && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().left < innerWidth), text);

// ───────────────────────── 通しの操作 ─────────────────────────

async function journey(browser, device, mode) {
  const w = (s) => `${device.name}/${mode}/${s}`;
  const { ctx, page } = await open(browser, device, { timerDesign: mode });
  try {
    // ホーム
    await shot(page, `${mode}-1-home`);
    await checkScreen(page, w('ホーム'));
    await checkFullBleed(page, w('ホーム'));
    await checkFocusVsTabbar(page, w('ホーム'));
    const homeTop = await checkHeader(page, w('ホーム'));

    // 予約
    await page.click('[aria-label="集中する"]', { force: true });
    await sleep(1400);
    await shot(page, `${mode}-2-booking`);
    await checkScreen(page, w('予約'));
    const tops = [homeTop, await checkHeader(page, w('予約'))];

    if (mode === 'train') {
      await page.click('button:has-text("座席を指定する")');
      await sleep(1000);
      tops.push(await checkHeader(page, w('座席')));
      await checkScreen(page, w('座席'), { allowCovered: true });
      // 左端からのスワイプで ① へ戻る
      await edgeSwipe(page);
      if (!(await visible(page, '乗車券を買ふ')) || (await visible(page, '座席を指定'))) fail(w('スワイプで戻る'), '左端からのスワイプで ① に戻りません');
      await page.click('button:has-text("座席を指定する")');
      await sleep(900);
      await (await page.$('button[aria-label$="A席"]:not([disabled])')).click();
      await sleep(400);
      await page.click('button:has-text("簿記")');
      await sleep(300);
      await page.click('button:has-text("切符を発券する")');
      await sleep(1800);
      tops.push(await checkHeader(page, w('改札')));
      await shot(page, `${mode}-3-ticket`);
      await checkScreen(page, w('改札'));
      await page.click('button:has-text("改札を通る")');
      await sleep(5200);
    } else if (mode === 'flight') {
      await page.click('button:has-text("フライトを予約")');
      await sleep(1000);
      tops.push(await checkHeader(page, w('座席')));
      await checkScreen(page, w('座席'), { allowCovered: true });
      await edgeSwipe(page);
      if (!(await visible(page, 'フライトを予約'))) fail(w('スワイプで戻る'), '左端からのスワイプで ① に戻りません');
      await page.click('button:has-text("フライトを予約")');
      await sleep(900);
      await (await page.$('button[aria-label$="A"]:not([disabled])')).click();
      await sleep(400);
      await page.click('button:has-text("簿記")');
      await sleep(300);
      await page.click('button:has-text("確認")');
      await sleep(1600);
      tops.push(await checkHeader(page, w('搭乗券')));
      await shot(page, `${mode}-3-pass`);
      await checkScreen(page, w('搭乗券'));
      await page.click('button:has-text("チェックイン")');
      await sleep(900);
      await page.click('button:has-text("搭乗")');
      await sleep(3200);
    } else {
      await page.click('button:has-text("簿記")');
      await page.click('button:has-text("入山する")');
      await sleep(2600);
    }
    const t = tops.filter((x) => x != null);
    if (t.length && Math.max(...t) - Math.min(...t) > 1) fail(w('ヘッダー'), `画面ごとにヘッダーの位置が違います（${t.join(', ')}）`);

    // 集中
    await shot(page, `${mode}-4-session`);
    await checkScreen(page, w('集中'));
    await checkFullBleed(page, w('集中'));
    await checkHeader(page, w('集中'));
    if (mode === 'flight') {
      await page.click('button:has-text("機窓ビュー")');
      await sleep(1300);
      await shot(page, `${mode}-5-window-open`);
      // シェードを下まで閉める（引き上げたシェードの帯をつかんで下へ）
      const shade = await page.$('[aria-label="窓のシェード（上下にドラッグ）"]');
      const sb = await shade.boundingBox();
      const shadeBottom = sb.y + sb.height;
      await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height - 6);
      await page.mouse.down();
      await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height + 600, { steps: 12 });
      await page.mouse.up();
      await sleep(500);
      await shot(page, `${mode}-5-window-shade`);
      const after = await shade.boundingBox();
      if (after.y + after.height - shadeBottom < 100) fail(w('機窓'), `シェードを下へ引いても閉まりません（${Math.round(after.y + after.height - shadeBottom)}px）`);
      await checkScreen(page, w('機窓'), { allowCovered: true });
      await page.click('button:has-text("レーダー地図")');
      await sleep(600);
    }

    // 休憩 → 発車
    const rest = { train: '途中駅で休憩', flight: '休憩する', mountain: 'ひと休み' }[mode];
    await page.click(`button:has-text("${rest}")`);
    await sleep(2500);
    await shot(page, `${mode}-6-break`);
    await checkScreen(page, w('休憩'));
    const go = { train: '発車', flight: '離陸', mountain: '出発' }[mode];
    await page.click(`button:has-text("${go}") >> nth=-1`);
    await sleep(1600); // 休憩のカードが下がって、走る間のボタンが出きるまで
    if (mode === 'train') {
      const mid = () => page.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.src.includes('/mid.webp')).map((i) => i.parentElement.parentElement.style.transform)[0]);
      const a = await mid();
      await sleep(2500);
      const b = await mid();
      if (a === b) fail(w('発車'), `発車しても車窓が動きません（${a}）`);
    }
    // 長押しで終える
    const end = { train: '旅を終える', flight: '長押しで着陸', mountain: '旅を終える' }[mode];
    await press(page, `button:has-text("${end}")`, 1500);
    await sleep(3200);
    await shot(page, `${mode}-7-result`);
    await checkScreen(page, w('リザルト'), { allowOffscreen: true });
    const cont = { train: '改札を出る', flight: '到着ロビーへ', mountain: '続ける' }[mode];
    const c = await page.$(`button:has-text("${cont}")`);
    if (!c) fail(w('リザルト'), `「${cont}」が見つかりません`);
    else {
      await c.scrollIntoViewIfNeeded();
      await c.click();
      await sleep(1500);
      await checkFocusVsTabbar(page, w('リザルトのあとのホーム'));
    }
  } catch (e) {
    fail(w('操作'), String(e.message || e).split('\n')[0]);
    await shot(page, `${mode}-error`).catch(() => {});
  } finally {
    await ctx.close();
  }
}

async function sheetsAndTabs(browser, device) {
  const w = (s) => `${device.name}/シート/${s}`;
  const { ctx, page } = await open(browser, device, { timerDesign: 'train' });
  try {
    // 旅のモード
    await page.click('[aria-label^="旅のモード"]');
    await sleep(700);
    await shot(page, 'sheet-mode');
    await checkScreen(page, w('旅のモード'), { allowCovered: true });
    await page.keyboard.press('Escape');
    await sleep(600);
    // 旅のパス（3 モード）
    await page.click('[aria-label="旅のパス"]');
    await sleep(700);
    for (const m of ['登山', '列車', '航空']) {
      await page.click(`[role="dialog"] button:has-text("${m}") >> nth=0`);
      await sleep(600);
      await shot(page, `sheet-pass-${m}`);
      await checkScreen(page, w(`旅のパス ${m}`), { allowCovered: true, allowOffscreen: true });
    }
    await page.keyboard.press('Escape');
    await sleep(600);
    // サウンド
    await page.click('[aria-label="サウンド"]');
    await sleep(800);
    await shot(page, 'sheet-sound');
    await checkScreen(page, w('サウンド'), { allowCovered: true, allowOffscreen: true });
    await page.keyboard.press('Escape');
    await sleep(700);
    // ツール
    for (const t of ['ノート', 'ToDo', '習慣']) {
      await page.click(`nav[aria-label="ツール"] [aria-label="${t}"]`);
      await sleep(700);
      await shot(page, `tool-${t}`);
      await checkScreen(page, w(`ツール ${t}`), { allowCovered: true });
      await page.keyboard.press('Escape');
      await sleep(600);
    }
    // 設定 → 左端からのスワイプで閉じる
    await page.click('[aria-label="設定"]');
    await sleep(900);
    await shot(page, 'settings');
    await checkScreen(page, w('設定'), { allowOffscreen: true });
    await edgeSwipe(page);
    if (await visible(page, '設定')) fail(w('設定'), '左端からのスワイプで設定が閉じません');
    // 記録のタブ
    for (const tab of ['タイムライン', 'ルート', 'インサイト']) {
      await page.click(`[aria-label="${tab}"]`);
      await sleep(1100);
      await shot(page, `tab-${tab}`);
      await checkScreen(page, w(tab), { allowOffscreen: true });
    }
    await page.click('[aria-label="ホーム"]');
    await sleep(1200);
    await checkFocusVsTabbar(page, w('ホームに戻る'));
    await checkFullBleed(page, w('ホームに戻る'));
  } catch (e) {
    fail(w('操作'), String(e.message || e).split('\n')[0]);
    await shot(page, 'sheets-error').catch(() => {});
  } finally {
    await ctx.close();
  }
}

// ───────────────────────── 実行 ─────────────────────────

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const server = await startServer();
const browser = await chromium.launch();
try {
  // E2E_ONLY=mountain,train,flight,sheets / E2E_DEVICE=iPhoneSE で一部だけ（直すときの確かめ用。PR の前は全部）
  const only = process.env.E2E_ONLY?.split(',');
  for (const d of DEVICES.filter((x) => !process.env.E2E_DEVICE || x.name === process.env.E2E_DEVICE)) {
    for (const m of MODES) if (!only || only.includes(m)) await journey(browser, d, m);
    if (!only || only.includes('sheets')) await sheetsAndTabs(browser, d);
  }
} finally {
  await browser.close();
  try {
    process.kill(-server.pid);
  } catch {
    server.kill();
  }
}
console.log(`\n警告 ${warnings.length} 件`);
for (const x of [...new Set(warnings)]) console.log('  ・' + x);
console.log(`\n不具合 ${issues.length} 件`);
for (const x of [...new Set(issues)]) console.log('  ✗ ' + x);
console.log(`\n画面の写真：${OUT}`);
process.exit(issues.length ? 1 : 0);
