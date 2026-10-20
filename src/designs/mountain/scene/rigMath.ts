/**
 * 骨格アニメーションの数学。
 * 角度はすべて度（SVG の rotate と同じく時計回りが正）。
 * リグは右向き。脚・腕は「真下にぶら下がった状態」を 0° として描かれている。
 */

const DEG = 180 / Math.PI;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const smooth = (t: number) => t * t * (3 - 2 * t);

/** 2ボーン IK。股関節から見た足首目標 (tx, ty)（y は下向き正）→ 太もも角・膝角 */
export function legIK(tx: number, ty: number, l1: number, l2: number) {
  const d = Math.min(Math.hypot(tx, ty), l1 + l2 - 0.01);
  const a = Math.atan2(ty, tx);
  const A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const B = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2))));
  const thighDir = a - A; // 膝は前（+x）へ
  const shinDir = thighDir + (Math.PI - B);
  return {
    hip: (thighDir - Math.PI / 2) * DEG,
    knee: (Math.PI - B) * DEG,
    /** すねのワールド角（足首を地面に揃えるために使う） */
    shinWorld: (shinDir - Math.PI / 2) * DEG,
  };
}

export interface HikerPose {
  hipY: number; // 股関節の高さ（地面から、単位）
  lean: number;
  torsoBob: number;
  head: number;
  pack: number; // ザックの上下
  pom: number; // ポンポンの揺れ
  nearHip: number; nearKnee: number; nearAnkle: number;
  farHip: number; farKnee: number; farAnkle: number;
  nearShoulder: number; nearElbow: number;
  farShoulder: number; farElbow: number;
}

export const HIKER = { thigh: 24, shin: 21, ankle: 5, hipStand: 47.5 };

/** 1 本の脚：位相 p（0..1）の足首目標。stance 60% / swing 40% */
function footTarget(p: number, stride: number, lift: number) {
  if (p < 0.6) {
    const u = p / 0.6;
    return { x: stride / 2 - stride * u, lift: 0, swing: 0 };
  }
  const u = (p - 0.6) / 0.4;
  return { x: -stride / 2 + stride * smooth(u), lift: lift * Math.sin(Math.PI * u), swing: u };
}

function solveLeg(p: number, hipY: number, tan: number, stride: number, lift: number, slopeDeg: number) {
  const f = footTarget(p, stride, lift);
  // 足首目標（股関節基準、y 下向き正）。斜面は右上がり：地面高さ = x * tan
  const ty = hipY - HIKER.ankle - f.x * tan - f.lift;
  const ik = legIK(f.x, ty, HIKER.thigh, HIKER.shin);
  // 接地中は靴底を斜面に合わせ、振り出しではつま先を少し上げる
  const footWorld = -slopeDeg + (f.swing > 0 ? -14 * Math.sin(Math.PI * f.swing) + 8 * Math.sin(2 * Math.PI * f.swing) : 0);
  return { hip: ik.hip, knee: ik.knee, ankle: footWorld - ik.shinWorld };
}

/** 歩行（w=歩きの強さ 0..1、w=0 で直立） */
export function walkPose(phase: number, w: number, tan: number, t: number): HikerPose {
  const slopeDeg = Math.atan(tan) * DEG;
  const stride = 26 * w;
  const lift = 7 * w;
  const bob = Math.cos(2 * Math.PI * (2 * phase - 0.6));
  const hipY = HIKER.hipStand - 2.4 * w + 1.3 * w * bob + (1 - w) * Math.sin(t * 1.7) * 0.25;
  const near = solveLeg(phase % 1, hipY, tan, stride, lift, slopeDeg);
  const far = solveLeg((phase + 0.5) % 1, hipY, tan, stride, lift, slopeDeg);
  const swing = Math.cos(2 * Math.PI * phase);
  return {
    hipY,
    lean: 4 + 8 * w + 1.4 * w * Math.sin(4 * Math.PI * phase),
    torsoBob: 0,
    head: -4 * w + 1.5 * w * Math.sin(4 * Math.PI * phase + 1) + (1 - w) * Math.sin(t * 0.6) * 2,
    pack: 0.9 * w * Math.sin(4 * Math.PI * phase + 0.9),
    pom: 2.2 * w * Math.sin(4 * Math.PI * phase + 1.6),
    nearHip: near.hip, nearKnee: near.knee, nearAnkle: near.ankle,
    farHip: far.hip, farKnee: far.knee, farAnkle: far.ankle,
    nearShoulder: 24 * w * swing + (1 - w) * 4,
    nearElbow: -18 - 14 * w * Math.max(0, -swing),
    farShoulder: -24 * w * swing + (1 - w) * 2,
    farElbow: -18 - 14 * w * Math.max(0, swing),
  };
}

/** 丸太に腰かけ、焚き火に両手をかざして温める */
export function sitPose(tan: number, t: number): HikerPose {
  const slopeDeg = Math.atan(tan) * DEG;
  const hipY = 14;
  const leg = (fx: number) => {
    const ik = legIK(fx, hipY - HIKER.ankle - fx * tan, HIKER.thigh, HIKER.shin);
    return { hip: ik.hip, knee: ik.knee, ankle: -slopeDeg - ik.shinWorld };
  };
  const near = leg(22);
  const far = leg(18);
  // ときどき手をこすり合わせる
  const rub = smooth(clamp01((Math.sin(t * 0.5) - 0.4) * 2.5));
  const rr = Math.sin(t * 9) * rub;
  const breathe = Math.sin(t * 1.3);
  return {
    hipY,
    lean: 14 + breathe * 0.8,
    torsoBob: 0,
    head: 4 + Math.sin(t * 0.4) * 2 - rub * 3,
    pack: 0,
    pom: Math.sin(t * 1.3) * 0.6,
    nearHip: near.hip, nearKnee: near.knee, nearAnkle: near.ankle,
    farHip: far.hip, farKnee: far.knee, farAnkle: far.ankle,
    nearShoulder: -62 + rr * 6 + rub * 8,
    nearElbow: -28 - rub * 30,
    farShoulder: -70 - rr * 6 + rub * 10,
    farElbow: -22 - rub * 32,
  };
}

export function blendPose(a: HikerPose, b: HikerPose, t: number): HikerPose {
  const out = {} as HikerPose;
  for (const k of Object.keys(a) as (keyof HikerPose)[]) out[k] = lerp(a[k], b[k], t);
  return out;
}

// ───────────────────────── 犬 ─────────────────────────

export interface DogPose {
  bodyY: number;
  pitch: number;
  head: number;
  ears: number;
  tail: number;
  nfU: number; nfL: number; ffU: number; ffL: number; // 前脚 near/far 上・下
  nbU: number; nbL: number; fbU: number; fbL: number; // 後脚
}

/** 速歩（対角の脚が同位相） */
export function dogTrot(q: number, w: number, t: number): DogPose {
  const s = (off: number) => Math.sin(2 * Math.PI * (q + off));
  const c = (off: number) => Math.cos(2 * Math.PI * (q + off));
  const A = 34 * w;
  return {
    bodyY: -1.4 * w * Math.abs(Math.sin(2 * Math.PI * q)) + (1 - w) * Math.sin(t * 2) * 0.2,
    pitch: 3 * w * Math.sin(2 * Math.PI * q),
    head: -3 * w * Math.sin(4 * Math.PI * q + 0.5) + (1 - w) * Math.sin(t * 0.8) * 3,
    ears: -10 * w * Math.sin(4 * Math.PI * q + 1.2),
    tail: Math.sin(t * (w > 0.5 ? 11 : 6)) * (12 + 10 * w),
    nfU: A * s(0), nfL: 40 * w * Math.max(0, c(0)),
    fbU: A * s(0), fbL: -36 * w * Math.max(0, c(0)),
    ffU: A * s(0.5), ffL: 40 * w * Math.max(0, c(0.5)),
    nbU: A * s(0.5), nbL: -36 * w * Math.max(0, c(0.5)),
  };
}

/** 伏せ（前脚を前に投げ出し、後脚をたたむ） */
export function dogLie(t: number): DogPose {
  return {
    bodyY: 6.2 + Math.sin(t * 1.1) * 0.25,
    pitch: -2,
    head: 14 + Math.sin(t * 0.35) * 3,
    ears: 8,
    tail: Math.sin(t * 2.2) * 9,
    nfU: -84, nfL: 6, ffU: -80, ffL: 4,
    nbU: 76, nbL: -12, fbU: 72, fbL: -10,
  };
}

export function blendDog(a: DogPose, b: DogPose, t: number): DogPose {
  const out = {} as DogPose;
  for (const k of Object.keys(a) as (keyof DogPose)[]) out[k] = lerp(a[k], b[k], t);
  return out;
}
