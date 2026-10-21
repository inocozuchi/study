import type { LineSpacing } from '@/types';

/** 行間の設定 → line-height（.ui-text の中の基準。leading-* はこれに比例する） */
export const LINE_SPACING: Record<LineSpacing, number> = { tight: 1.25, normal: 1.4, relaxed: 1.62 };
export const TEXT_SCALES = [0.9, 1, 1.1, 1.2, 1.3] as const;

/**
 * 文字の大きさ・行間（設定）を <html> の CSS 変数に入れる。
 * 効くのは .ui-text の中（アプリ本体の画面とシート）の text-ui-[Npx] と leading-*。
 */
export function applyDisplay(scale: number | undefined, spacing: LineSpacing | undefined) {
  const root = document.documentElement;
  root.style.setProperty('--user-ts', String(scale ?? 1));
  root.style.setProperty('--user-lh', String(LINE_SPACING[spacing ?? 'normal'] ?? 1.4));
}
