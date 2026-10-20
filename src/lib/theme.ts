import type { Appearance } from '@/types';

/**
 * 外観（ライト／ダーク）。<html data-theme="light|dark"> を切り替えると、index.css の配色の変数が入れ替わる。
 * 「端末に合わせる」のときは端末の設定が変わった瞬間に追従する。
 * 起動直後の白い光り・暗い光りを防ぐため、index.html でも同じ判定を先に行っている（キャッシュを読む）。
 */
const CACHE_KEY = 'focus-trail:v1:appearance';
const COLORS = { light: '#F2F3F7', dark: '#0E1015' } as const;

let mode: Appearance = 'system';
const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

function resolved(): 'light' | 'dark' {
  if (mode === 'system') return media?.matches ? 'dark' : 'light';
  return mode;
}

/** ホームではシーンの色（上＝空、下＝草原）で画面の外側の帯を塗る。null なら地の色 */
let edge: { top: string; bottom: string } | null = null;

function paint() {
  const theme = resolved();
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  // 上の帯（時刻・電波の帯）は theme-color、下の帯（ホームバーのまわり）は html の地の色で塗られる
  const top = edge?.top ?? COLORS[theme];
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', top));
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
  if (edge) root.style.setProperty('--edge', edge.bottom);
  else root.style.removeProperty('--edge');
}

/** 画面の外側の帯の色を、いま見えているものに合わせる（ホームのシーン）。null で元に戻す */
export function setEdgeColors(next: { top: string; bottom: string } | null) {
  if (next?.top === edge?.top && next?.bottom === edge?.bottom) return;
  edge = next;
  paint();
}

media?.addEventListener?.('change', () => {
  if (mode === 'system') paint();
});

export function applyAppearance(next: Appearance | undefined) {
  mode = next ?? 'system';
  try {
    localStorage.setItem(CACHE_KEY, mode);
  } catch {
    /* 保存できなくても表示には影響しない */
  }
  paint();
}

export function currentTheme() {
  return resolved();
}
