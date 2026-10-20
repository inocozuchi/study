import type { FontId } from '@/types';

const SYSTEM = `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Segoe UI", system-ui, sans-serif`;
const SYSTEM_DIGITS = `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`;

export interface FontOption {
  id: FontId;
  label: string;
  detail: string;
  /** 本文の font-family */
  text: string;
  /** 時間の数字の font-family */
  digits: string;
  /** Google Fonts の family 指定（css2 の family= の値）。システムフォントは空 */
  families: string[];
}

/** 選べるフォント。先頭が既定（いちばん読みやすいもの） */
export const FONTS: FontOption[] = [
  {
    id: 'ud',
    label: 'UD ゴシック',
    detail: '見やすさを優先したユニバーサルデザイン書体（おすすめ）',
    text: `"BIZ UDPGothic", ${SYSTEM}`,
    digits: `"BIZ UDPGothic", ${SYSTEM_DIGITS}`,
    families: ['BIZ+UDPGothic:wght@400;700'],
  },
  {
    id: 'system',
    label: 'システム',
    detail: 'iPhone の標準（ヒラギノ角ゴ / SF Pro）',
    text: SYSTEM,
    digits: SYSTEM_DIGITS,
    families: [],
  },
  {
    id: 'noto',
    label: 'Noto Sans JP',
    detail: 'すっきりした角ゴシック',
    text: `"Noto Sans JP", ${SYSTEM}`,
    digits: `"Noto Sans JP", ${SYSTEM_DIGITS}`,
    families: ['Noto+Sans+JP:wght@300;400;500;600;700;800'],
  },
  {
    id: 'rounded',
    label: 'M PLUS Rounded',
    detail: 'やさしい丸ゴシック',
    text: `"M PLUS Rounded 1c", ${SYSTEM}`,
    digits: `"M PLUS Rounded 1c", ${SYSTEM_DIGITS}`,
    families: ['M+PLUS+Rounded+1c:wght@300;400;500;700;800'],
  },
  {
    id: 'maru',
    label: 'Zen 丸ゴシック',
    detail: 'ふんわりした丸ゴシック + 丸い数字',
    text: `"Zen Maru Gothic", ${SYSTEM}`,
    digits: `Fredoka, "Zen Maru Gothic", ${SYSTEM_DIGITS}`,
    families: ['Zen+Maru+Gothic:wght@400;500;700;900', 'Fredoka:wght@400;500;600;700'],
  },
  {
    id: 'hand',
    label: 'Klee',
    detail: '鉛筆で書いたような手書き風',
    text: `"Klee One", ${SYSTEM}`,
    digits: `"Klee One", ${SYSTEM_DIGITS}`,
    families: ['Klee+One:wght@400;600'],
  },
  {
    id: 'mincho',
    label: 'しっぽり明朝',
    detail: '落ち着いた明朝体',
    text: `"Shippori Mincho", serif`,
    digits: `"Shippori Mincho", serif`,
    families: ['Shippori+Mincho:wght@400;500;600;700;800'],
  },
];

export const DEFAULT_FONT: FontId = 'ud';

export function fontById(id: FontId | undefined): FontOption {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

const CACHE_KEY = 'focus-trail:v1:font';

function cssUrl(families: string[], text?: string) {
  const q = families.map((f) => `family=${f}`).join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap${text ? `&text=${encodeURIComponent(text)}` : ''}`;
}

function setLink(id: string, href: string | null, before?: string) {
  let el = document.getElementById(id) as HTMLLinkElement | null;
  if (!href) {
    el?.remove();
    return;
  }
  if (el?.getAttribute('href') === href) return;
  if (!el) {
    el = document.createElement('link');
    el.id = id;
    el.rel = 'stylesheet';
    // 見本用（文字を絞った版）は本体より前に置き、同じ書体名でも本体の定義が勝つようにする
    const ref = before ? document.getElementById(before) : null;
    if (ref) document.head.insertBefore(el, ref);
    else document.head.appendChild(el);
  }
  el.href = href;
}

/** 選んだフォントを読み込み、アプリ全体（登山デザインも含む）に反映する */
export function applyFont(id: FontId | undefined) {
  const f = fontById(id);
  const root = document.documentElement;
  root.style.setProperty('--font-text', f.text);
  root.style.setProperty('--font-digits', f.digits);
  setLink('ft-font', f.families.length ? cssUrl(f.families) : null);
  try {
    localStorage.setItem(CACHE_KEY, f.id);
  } catch {
    /* 保存できなくても表示には影響しない */
  }
}

/** 起動直後（データを読む前）に前回のフォントを当てる */
export function applyCachedFont() {
  let id: FontId | undefined;
  try {
    id = (localStorage.getItem(CACHE_KEY) as FontId | null) ?? undefined;
  } catch {
    id = undefined;
  }
  applyFont(id ?? DEFAULT_FONT);
}

/** 選択画面の見本用：各フォントの見本の文字だけを小さく読み込む */
export function loadFontPreviews(sample: string) {
  const families = FONTS.flatMap((f) => f.families.map((x) => x.split(':')[0]));
  setLink('ft-font-preview', cssUrl(families, sample), 'ft-font');
}

/** 見本を閉じたら外す（文字を絞った定義が本文に使われないように） */
export function unloadFontPreviews() {
  setLink('ft-font-preview', null);
}
