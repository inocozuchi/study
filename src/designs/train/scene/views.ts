import assets from './assets.json';

/** 車窓の景色の組（public/train の各フォルダ）。時間帯と天気から選ぶ */
export type TrainView = 'day' | 'sunset' | 'night' | 'rain';
export const VIEWS: TrainView[] = ['day', 'sunset', 'night', 'rain'];

/** 雨なら雨。それ以外は時刻で昼・夕方（朝焼けも）・夜 */
export function viewFor(hour: number, rain: boolean): TrainView {
  if (rain) return 'rain';
  const h = ((hour % 24) + 24) % 24;
  if (h < 4.8 || h >= 19.3) return 'night';
  if (h < 6.6 || h >= 16.6) return 'sunset';
  return 'day';
}

/** 雨の夜は、雨の景色をさらに暗くする */
export const isNight = (hour: number) => {
  const h = ((hour % 24) + 24) % 24;
  return h < 4.8 || h >= 19.3;
};

const BASE = './train';
export const url = {
  frame: `${BASE}/frame-table.webp`,
  fence: (v: TrainView) => `${BASE}/${v}/fence.webp`,
  sky: (v: TrainView) => `${BASE}/${v}/sky.webp`,
  mid: (v: TrainView) => `${BASE}/${v}/mid.webp`,
  pole: (v: TrainView) => `${BASE}/${v}/pole.webp`,
  station: (v: TrainView) => `${BASE}/${v}/station.webp`,
};

export { assets };

/** 画面の大きさ → 車内の絵（9:16）を画面いっぱいに置いたときの位置と、窓の位置 */
export interface TrainLayout {
  W: number;
  H: number;
  frame: { x: number; y: number; w: number; h: number };
  win: { x: number; y: number; w: number; h: number };
}

export function trainLayout(W: number, H: number): TrainLayout {
  const f = assets.frame;
  // 足りない方向に合わせて拡大（cover）。縦長の iPhone では左右が少し切れる
  const s = Math.max(W / f.width, H / f.height);
  const fw = f.width * s;
  const fh = f.height * s;
  const fx = (W - fw) / 2;
  const fy = (H - fh) / 2;
  const w = f.window;
  // 窓の外の景色は枠の下に少しもぐらせ、すき間が出ないようにする
  const bleed = 3;
  return {
    W,
    H,
    frame: { x: fx, y: fy, w: fw, h: fh },
    win: { x: fx + w.x * fw - bleed, y: fy + w.y * fh - bleed, w: w.w * fw + bleed * 2, h: w.h * fh + bleed * 2 },
  };
}
