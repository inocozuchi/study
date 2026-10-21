import { ambient } from './ambient';

/**
 * 予約と出発の儀式の効果音（すべて Web Audio で合成。音声ファイルは使わない）。
 *   tick    ダイヤルの刻み（カチッ）
 *   punch   改札鋏（パチン）
 *   bell    発車ベル（電気ベルのジリリリ）
 *   whistle 汽笛（遠くで鳴る三和音のボォー）
 *   tear    搭乗券の半券を切る（ピリッ）
 *   beep    搭乗ゲートのスキャン（ピッ）
 *   chime   機内のチャイム（ポーン）
 *   blip    近未来的な電子音（上がっていく 3 つの音）
 *   print   券売機の印字（ガシャン → ジジジ…。歯車と印字ヘッド）
 *   stamp   日付印を押す（ポン）
 *   thermal 発券キオスクのサーマル印字（細かく速いジーッ）
 * 音量は控えめ。AudioContext は環境音と共有する（ユーザー操作の中で鳴らすこと）。
 */
export type SfxName = 'tick' | 'punch' | 'bell' | 'whistle' | 'tear' | 'beep' | 'chime' | 'blip' | 'print' | 'stamp' | 'thermal';

let noise: AudioBuffer | null = null;
function noiseBuffer(ctx: AudioContext) {
  if (noise && noise.sampleRate === ctx.sampleRate) return noise;
  const len = Math.floor(ctx.sampleRate * 1.5);
  noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noise;
}

function out(ctx: AudioContext, level: number) {
  const g = ctx.createGain();
  g.gain.value = level;
  g.connect(ctx.destination);
  return g;
}

/** 短いノイズの粒（フィルタを通して形を作る） */
function burst(ctx: AudioContext, dest: AudioNode, at: number, dur: number, type: BiquadFilterType, freq: number, q: number, amp: number) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(amp, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(at, Math.random() * 1.2);
  src.stop(at + dur + 0.02);
}

function tone(ctx: AudioContext, dest: AudioNode, at: number, freq: number, dur: number, amp: number, type: OscillatorType = 'sine', attack = 0.004) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(amp, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + dur + 0.05);
  return o;
}

const PLAYERS: Record<SfxName, (ctx: AudioContext, t: number) => void> = {
  tick(ctx, t) {
    burst(ctx, out(ctx, 0.5), t, 0.018, 'bandpass', 3200, 2.5, 0.35);
  },
  punch(ctx, t) {
    const o = out(ctx, 0.9);
    // 刃が噛み合う金属音 + 厚紙が抜ける低い音
    burst(ctx, o, t, 0.05, 'highpass', 2400, 0.7, 0.9);
    burst(ctx, o, t + 0.006, 0.08, 'bandpass', 5200, 6, 0.5);
    tone(ctx, o, t, 210, 0.07, 0.5, 'triangle', 0.002);
    burst(ctx, o, t + 0.09, 0.03, 'highpass', 3000, 0.7, 0.25);
  },
  bell(ctx, t) {
    // 電気ベル：金属の鐘を毎秒 22 回ほど打ち続ける。2 秒鳴らしてからすっと止む
    const o = out(ctx, 0.22);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4200;
    lp.connect(o);
    const dur = 2.1;
    for (let k = 0; k < dur * 22; k++) {
      const at = t + k / 22;
      const fade = k > dur * 22 - 8 ? (dur * 22 - k) / 8 : 1;
      [[1180, 0.5], [2710, 0.28], [4130, 0.12]].forEach(([f, a]) => tone(ctx, lp, at, f, 0.11, a * fade, 'sine', 0.001));
    }
  },
  whistle(ctx, t) {
    // 汽笛：少しずれた三和音 + 息の音。立ち上がりで音程がわずかに上がり、遠くで響くよう低域だけ通す
    const o = out(ctx, 0.2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    lp.connect(o);
    const dur = 1.9;
    [311, 370, 466].forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * 0.94, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.25);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f * 2;
      bp.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.18);
      g.gain.setValueAtTime(0.5, t + dur - 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(bp).connect(g).connect(lp);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
    burst(ctx, lp, t, dur, 'bandpass', 900, 0.8, 0.08);
  },
  tear(ctx, t) {
    // 紙の繊維がちぎれる小さな音を 220ms の間に並べる
    const o = out(ctx, 0.55);
    for (let k = 0; k < 14; k++) burst(ctx, o, t + k * 0.016 + Math.random() * 0.008, 0.02, 'bandpass', 2600 + Math.random() * 2400, 1.4, 0.6 * (1 - k / 18));
  },
  beep(ctx, t) {
    const o = out(ctx, 0.18);
    tone(ctx, o, t, 1880, 0.11, 0.7, 'square', 0.003);
  },
  chime(ctx, t) {
    // 機内のチャイム（ポーン）：やわらかい倍音で長く響く
    const o = out(ctx, 0.3);
    [[659.25, 0.55, 2.6], [1318.5, 0.16, 1.6], [1977.8, 0.06, 1.0]].forEach(([f, a, d]) => tone(ctx, o, t, f, d, a, 'sine', 0.01));
  },
  print(ctx, t) {
    const o = out(ctx, 0.5);
    // ガシャン：レバーと歯車が噛む低い音
    tone(ctx, o, t, 120, 0.12, 0.6, 'triangle', 0.002);
    burst(ctx, o, t, 0.09, 'lowpass', 900, 0.7, 0.7);
    burst(ctx, o, t + 0.05, 0.05, 'bandpass', 2400, 3, 0.4);
    // ジジジ…：印字ヘッドが行ごとに打つ（0.8 秒）
    for (let k = 0; k < 26; k++) burst(ctx, o, t + 0.18 + k * 0.031, 0.022, 'bandpass', 1500 + (k % 3) * 500, 2.2, 0.32);
  },
  stamp(ctx, t) {
    // ポン：ゴム印が紙を打つ鈍い音
    const o = out(ctx, 0.7);
    tone(ctx, o, t, 160, 0.09, 0.8, 'sine', 0.002);
    burst(ctx, o, t, 0.05, 'lowpass', 700, 0.8, 0.6);
  },
  thermal(ctx, t) {
    // サーマル印字：高めの細かいノイズが一定に続く（0.9 秒）
    const o = out(ctx, 0.14);
    burst(ctx, o, t, 0.9, 'bandpass', 3800, 1.6, 0.5);
    for (let k = 0; k < 18; k++) tone(ctx, o, t + k * 0.05, 2200, 0.02, 0.12, 'square', 0.001);
  },
  blip(ctx, t) {
    const o = out(ctx, 0.16);
    [1320, 1760, 2640].forEach((f, i) => tone(ctx, o, t + i * 0.07, f, 0.12, 0.6, 'sine', 0.003));
  },
};

export function playSfx(name: SfxName, delay = 0) {
  const ctx = ambient.context();
  if (!ctx) return;
  PLAYERS[name](ctx, ctx.currentTime + 0.01 + delay);
}
