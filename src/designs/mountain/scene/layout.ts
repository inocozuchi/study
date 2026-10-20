/** 画面サイズから、斜面・人物・小道具の配置を決める（すべて px） */
export interface StageLayout {
  W: number;
  H: number;
  /** 斜面の勾配（右上がり） */
  tan: number;
  angleDeg: number;
  /** ハイカーの足元 */
  hx: number;
  gy: number;
  /** 1 リグ単位あたりの px */
  k: number;
  /** 地面の高さ y(x)（ハイカーの通る線） */
  ground: (x: number) => number;
  /** 手前の線（犬が走る） */
  near: number;
  fireX: number;
  tentX: number;
}

export function computeLayout(W: number, H: number): StageLayout {
  const rise = Math.min(0.22 * W, 0.12 * H);
  const tan = rise / W;
  const hx = Math.round(W * (W < 600 ? 0.36 : 0.42));
  const gy = Math.round(H * 0.655);
  const k = Math.max(0.95, Math.min(1.5, H / 720));
  const ground = (x: number) => gy - (x - hx) * tan;
  return {
    W,
    H,
    tan,
    angleDeg: (Math.atan(tan) * 180) / Math.PI,
    hx,
    gy,
    k,
    ground,
    near: 16 * k,
    fireX: hx + 40 * k,
    tentX: Math.min(W - 52 * k, hx + 104 * k),
  };
}
