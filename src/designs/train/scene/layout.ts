/** 画面の大きさ → 窓の位置。窓の外の絵はすべて窓の座標（左上 0,0）で描く */
export interface TrainLayout {
  W: number;
  H: number;
  /** 窓（画面の座標） */
  win: { x: number; y: number; w: number; h: number };
  /** 窓の中の地平線の高さ */
  horizon: number;
}

export function trainLayout(W: number, H: number): TrainLayout {
  const w = Math.min(W - Math.max(24, Math.round(W * 0.07)), 760);
  const y = Math.round(H * 0.25);
  const h = Math.round(H * 0.62) - y;
  return { W, H, win: { x: Math.round((W - w) / 2), y, w, h }, horizon: Math.round(h * 0.5) };
}

/** 各層の速さ（巡航 = 1 のときの px/秒）。近いほど速い */
export const LAYER_SPEED = { clouds: 5, mountains: 15, country: 60, track: 560 };

/** 繰り返しの長さ（px） */
export const TILE = { clouds: 1400, mountains: 1000, country: 1200, track: 300 };
