import type { Language } from '@/types';

/**
 * 表示の言語（日本語 / 英語）。
 *
 * 文言はコードの中に日本語で書いたまま（日本語が元の言語）。英語のときは、画面に出た文字を辞書（src/i18n/en.json）で置き換える：
 *  - 文字のノード・aria-label・placeholder・title を MutationObserver で見張り、日本語を含むものだけ訳す（React が書き直したら訳し直す）
 *  - 辞書は「元の日本語（前後の空白を除く）→ 英語」と、値が入る文（`{0}日連続` など）の型。数字・単位の決まった形は PATTERNS
 *  - 辞書にない日本語はそのまま（tests/e2e が英語の画面に残った日本語を一覧にする）
 * 時間・日付の書式（lib/time）は言語を見て自分で英語にする（`lang()`）。
 * 英語の辞書は英語を選んだときだけ読み込む（日本語のときは何もしない・重さはゼロ）。
 */
let current: Language = 'ja';
export const lang = () => current;
const LANG_KEY = 'focus-trail:v1:language';

type Dict = { plain: Record<string, string>; tpl: [RegExp, string, boolean][] };
let dict: Dict | null = null;
let observer: MutationObserver | null = null;
/** 訳す前の文字（日本語に戻すとき・React が同じノードを書き直したかを見分けるため） */
const original = new WeakMap<Node, string>();
const translated = new WeakMap<Node, string>();
const ATTRS = ['aria-label', 'placeholder', 'title', 'alt'] as const;
const origAttr = new WeakMap<Element, Record<string, string>>();
const JP = /[぀-ヿ㐀-鿿！-｠　-〿]/;

/** 数字と単位の決まった形（辞書にない組み合わせ） */
const PATTERNS: [RegExp, (...m: string[]) => string][] = [
  [/^(\d+)時間(\d+)分$/, (_, h, m) => `${h}h ${m}m`],
  [/^(\d+)時間$/, (_, h) => `${h}h`],
  [/^(\d+)分$/, (_, m) => `${m} min`],
  [/^(\d+)秒$/, (_, s) => `${s}s`],
  [/^(\d+)日$/, (_, d) => `${d} days`],
  [/^(\d+)回$/, (_, n) => `${n}×`],
  [/^(\d+)件$/, (_, n) => `${n} items`],
  [/^(\d+)駅$/, (_, n) => `${n} stations`],
  [/^(\d+)便$/, (_, n) => `${n} flights`],
  [/^(\d+(?:\.\d+)?) ?粁$/, (_, n) => `${n} km`],
  [/^(\d+)月(\d+)日$/, (_, m, d) => `${MONTHS[+m - 1]} ${d}`],
  [/^(\d+)年(\d+)月$/, (_, y, m) => `${MONTHS[+m - 1]} ${y}`],
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 辞書と数字の形だけで訳す（値の入る型は使わない） */
function translatePlain(key: string): string | null {
  const hit = dict!.plain[key];
  if (hit != null) return hit;
  for (const [re, fn] of PATTERNS) {
    const m = key.match(re);
    if (m) return fn(...m);
  }
  return null;
}

/** 区切り（・ → 〜 、 括弧 空白）で分けて、日本語の部分がすべて辞書にあれば訳す（路線名 · 駅 → 駅 など、組み立てた文字） */
const SEP = /(\s*[·→←〜~|／/]\s*|、|（|）|：|\s+)/;
const SEP_EN: Record<string, string> = { '、': ', ', '（': ' (', '）': ')', '：': ': ', '〜': '–' };
function translatePieces(key: string): string | null {
  const parts = key.split(SEP);
  if (parts.length < 2) return null;
  let ok = true;
  const out = parts.map((p, i) => {
    if (i % 2 === 1) return SEP_EN[p.trim()] ?? p;
    if (!JP.test(p)) return p;
    const t = translatePlain(p);
    if (t == null) ok = false;
    return t ?? p;
  });
  return ok ? out.join('') : null;
}

const piece = (v: string) => (JP.test(v) ? translatePlain(v) ?? translatePieces(v) : v);

/** 1 つの文字列を訳す（訳せなければ null） */
export function translate(text: string): string | null {
  if (!dict || !JP.test(text)) return null;
  const lead = text.match(/^\s*/)![0];
  const trail = text.match(/\s*$/)![0];
  const key = text.trim();
  const plain = translatePlain(key);
  if (plain != null) return lead + plain + trail;
  for (const [re, out, weak] of dict.tpl) {
    const m = key.match(re);
    if (!m) continue;
    // 値の部分も日本語なら訳す（駅名・時間など）。固定の部分が 1 文字だけの型は、値がすべて訳せるときだけ使う（何にでも当たってしまうので）
    const vals = m.slice(1).map((v) => piece(v));
    if (weak && vals.some((v, i) => v == null && JP.test(m[i + 1]))) continue;
    return lead + out.replace(/\{(\d+)\}/g, (_, i) => vals[+i] ?? m[+i + 1] ?? '') + trail;
  }
  const pieces = translatePieces(key);
  return pieces == null ? null : lead + pieces + trail;
}

function doText(node: Text) {
  const v = node.nodeValue ?? '';
  if (translated.get(node) === v) return; // 自分で書いた訳
  // 人が書いた文字（メモ・題名など）は訳さない（data-no-translate の中）
  if (node.parentElement?.closest('[data-no-translate]')) return;
  const t = translate(v);
  if (t == null || t === v) return;
  original.set(node, v);
  translated.set(node, t);
  node.nodeValue = t;
}

function doAttrs(el: Element) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v || !JP.test(v)) continue;
    const o = origAttr.get(el) ?? {};
    // 自分で書いた訳（日本語が残った訳も）はもう一度訳さない（同じ値を書いても変化の知らせが来て、止まらなくなる）
    if (o['~' + a] === v) continue;
    const t = translate(v);
    if (t == null || t === v) continue;
    o['~' + a] = t;
    o[a] = v;
    origAttr.set(el, o);
    el.setAttribute(a, t);
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return doText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (el.closest('[data-no-translate]')) return;
  doAttrs(el);
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
    else doAttrs(n as Element);
  }
}

function start() {
  if (observer || !dict) return;
  walk(document.body);
  if (document.title && JP.test(document.title)) document.title = translate(document.title) ?? document.title;
  observer = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target as Text);
      else if (m.type === 'attributes') doAttrs(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
}

function stop() {
  observer?.disconnect();
  observer = null;
  // 訳した文字を日本語に戻す
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      const o = original.get(n);
      if (o != null && translated.get(n) === n.nodeValue) n.nodeValue = o;
      translated.delete(n);
    } else {
      const o = origAttr.get(n as Element);
      if (o) for (const [a, v] of Object.entries(o)) if (!a.startsWith('~')) (n as Element).setAttribute(a, v);
      origAttr.delete(n as Element);
    }
  }
}

let loading: Promise<void> | null = null;
async function loadDict() {
  if (dict) return;
  loading ??= import('@/i18n/en.json').then(async (m) => {
    const raw = (m.default ?? m) as { plain: Record<string, string>; tpl: Record<string, string> };
    const plain = { ...raw.plain, ...(await stationNames()) };
    // 型は固定の部分が長いものから試す（短い型が先に当たって変な訳にならないように）
    // 型は固定の部分が長いものから試す（短い型が先に当たって変な訳にならないように）。固定の部分に日本語がない型（{0} {1} など）は使わない
    const fixedJp = (k: string) => [...k.replace(/\{\d+\}/g, '')].filter((c) => JP.test(c)).length;
    const tpl = Object.entries(raw.tpl)
      .filter(([k]) => fixedJp(k) > 0)
      .sort((a, b) => b[0].replace(/\{\d+\}/g, '').length - a[0].replace(/\{\d+\}/g, '').length)
      .map(([k, v]) => [new RegExp('^' + escapeRe(k).replace(/\\\{\d+\\\}/g, '(.+?)') + '$'), v, fixedJp(k) <= 1] as [RegExp, string, boolean]);
    dict = { plain, tpl };
  });
  await loading;
}

const LINE_EN: Record<string, string> = {
  '函館・宗谷本線': 'Hakodate & Sōya Lines',
  '東北本線': 'Tōhoku Main Line',
  '東海道・山陽本線': 'Tōkaidō & San\'yō Lines',
  '鹿児島本線・指宿枕崎線': 'Kagoshima & Ibusuki-Makurazaki Lines',
  '稚内〜枕崎 全線走破': 'Wakkanai–Makurazaki Grand Run',
};

/** 列車の駅名（漢字・かな → ローマ字）・路線名は路線のデータから作る */
async function stationNames() {
  const { LINES } = await import('@/designs/train/booking/line');
  const out: Record<string, string> = {};
  for (const l of LINES) for (const s of l.stations) {
    out[s.name] = s.roman;
    out[s.kana] = s.roman;
  }
  Object.assign(out, LINE_EN);
  return out;
}

/** 言語を切り替える（設定・起動時） */
export async function applyLanguage(next: Language | undefined) {
  const l = next ?? 'ja';
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* noop */
  }
  if (l === current && (l === 'ja' || observer)) return;
  current = l;
  document.documentElement.lang = l;
  if (l === 'en') {
    await loadDict();
    if (current === 'en') start();
  } else stop();
}

/** 起動直後：前回の言語（設定を読む前に。英語の画面に日本語が一瞬出ないように） */
export function cachedLanguage(): Language {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ja';
  } catch {
    return 'ja';
  }
}
