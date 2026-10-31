/** 思考マップの線の形（純粋な計算だけ） */

/** メモの箱（中心と大きさ。ボードの座標） */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Pt {
  x: number;
  y: number;
}

/** 箱の中心から点 p へ向かう線が、箱の縁（＋すき間 pad）を出るところ */
export function exitPoint(b: Box, p: Pt, pad = 0): Pt {
  const dx = p.x - b.x;
  const dy = p.y - b.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return { x: b.x, y: b.y };
  const hw = b.w / 2 + pad;
  const hh = b.h / 2 + pad;
  const s = Math.min(Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : Infinity);
  return { x: b.x + dx * Math.min(1, s), y: b.y + dy * Math.min(1, s) };
}

/**
 * from の箱から to の箱への線（矢印は to 側）。bend ≠ 0 のときは少し曲げる（A→B と B→A が両方あるとき重ならないように）。
 * 返すのは SVG の path・真ん中の点（題名の札を置く）。
 */
export function edgePath(a: Box, b: Box, bend = 0): { d: string; mid: Pt } {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  // 進む向きの左手側へ bend だけずらした制御点
  const c = { x: mx + (-(b.y - a.y) / len) * bend, y: my + ((b.x - a.x) / len) * bend };
  const s = exitPoint(a, bend ? c : b, 3);
  const e = exitPoint(b, bend ? c : a, 7);
  if (!bend) return { d: `M${s.x},${s.y} L${e.x},${e.y}`, mid: { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 } };
  return { d: `M${s.x},${s.y} Q${c.x},${c.y} ${e.x},${e.y}`, mid: { x: 0.25 * s.x + 0.5 * c.x + 0.25 * e.x, y: 0.25 * s.y + 0.5 * c.y + 0.25 * e.y } };
}

/** 点 p から箱の縁へ向かう線（線を引いている途中の、指先までのゴム紐） */
export function rubberPath(a: Box, p: Pt): string {
  const s = exitPoint(a, p, 3);
  return `M${s.x},${s.y} L${p.x},${p.y}`;
}

/** 箱がすべて入る範囲（全体を見る） */
export function bounds(boxes: Box[]): { x0: number; y0: number; x1: number; y1: number } | null {
  if (!boxes.length) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x - b.w / 2);
    y0 = Math.min(y0, b.y - b.h / 2);
    x1 = Math.max(x1, b.x + b.w / 2);
    y1 = Math.max(y1, b.y + b.h / 2);
  }
  return { x0, y0, x1, y1 };
}
