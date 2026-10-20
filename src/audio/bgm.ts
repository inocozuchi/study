import { ambient } from './ambient';

/**
 * プロシージャル Lo-Fi BGM。音源ファイルなしで、コード進行・ベース・
 * スウィングしたドラム・ペンタトニックの旋律・テープ風の揺れとノイズをその場で合成する。
 */

export interface BgmTrack {
  title: string;
  subtitle: string;
  bpm: number;
  /** ルート音（MIDI） */
  root: number;
  /** 小節ごとのコード（ルートからの半音） */
  chords: number[][];
  /** 旋律に使う音階（ルートからの半音） */
  scale: number[];
  /** カセットのラベル・小窓の配色 */
  colors: { label: string; band: string; sky: string; ground: string };
}

export const BGM_TRACKS: BgmTrack[] = [
  {
    title: '朝の草原',
    subtitle: 'Morning Meadow',
    bpm: 74,
    root: 53,
    chords: [[0, 4, 7, 11], [-1, 2, 7, 11], [-3, 0, 4, 7], [-5, -1, 2, 7]],
    scale: [0, 2, 4, 7, 9, 12, 14, 16],
    colors: { label: '#F4C64E', band: '#2F6FB5', sky: '#8CC8EE', ground: '#9BC85A' },
  },
  {
    title: '焚き火のワルツ',
    subtitle: 'Campfire Waltz',
    bpm: 68,
    root: 57,
    chords: [[0, 3, 7, 10], [-4, 0, 3, 7], [3, 7, 10, 14], [-2, 2, 5, 9]],
    scale: [0, 3, 5, 7, 10, 12, 15, 17],
    colors: { label: '#E8743A', band: '#3B2F4A', sky: '#2B3560', ground: '#D9822B' },
  },
  {
    title: '雨上がりの尾根',
    subtitle: 'After the Rain',
    bpm: 70,
    root: 50,
    chords: [[0, 3, 7, 10, 14], [5, 9, 12, 16], [10, 14, 17, 21], [7, 10, 14, 17]],
    scale: [0, 2, 3, 5, 7, 9, 10, 12, 14],
    colors: { label: '#7FB8A4', band: '#2E4A44', sky: '#A9BFD0', ground: '#5E8A6A' },
  },
  {
    title: '星降る稜線',
    subtitle: 'Starfall Ridge',
    bpm: 62,
    root: 51,
    chords: [[0, 4, 7, 11], [4, 7, 11, 14], [-3, 0, 3, 7], [-2, 2, 5, 10]],
    scale: [0, 2, 4, 7, 9, 12, 14, 16],
    colors: { label: '#B9A6E8', band: '#1E2550', sky: '#1C2550', ground: '#36406E' },
  },
];

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class BgmEngine {
  private ctx: AudioContext | null = null;
  private out!: GainNode;
  private tape!: BiquadFilterNode;
  private delaySend!: GainNode;
  private noise: AudioBuffer | null = null;
  private crackle: AudioBufferSourceNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  private melodyIdx = 3;
  private volume = 0.7;
  track = 0;
  playing = false;

  private ensure() {
    if (this.ctx) return this.ctx;
    const ctx = ambient.context();
    if (!ctx) return null;
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.tape = ctx.createBiquadFilter();
    this.tape.type = 'lowpass';
    this.tape.frequency.value = 3400;
    this.tape.Q.value = 0.5;
    // テープの揺れ（ローパスがゆっくり呼吸する）
    const wow = ctx.createOscillator();
    wow.frequency.value = 0.18;
    const wowAmt = ctx.createGain();
    wowAmt.gain.value = 500;
    wow.connect(wowAmt).connect(this.tape.frequency);
    wow.start();
    this.tape.connect(this.out).connect(ctx.destination);
    // 旋律用のディレイ
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.36;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const dlp = ctx.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 1800;
    this.delaySend = ctx.createGain();
    this.delaySend.gain.value = 0.5;
    this.delaySend.connect(delay);
    delay.connect(dlp).connect(fb).connect(delay);
    dlp.connect(this.tape);
    // ノイズ
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    return ctx;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx && this.playing) this.out.gain.setTargetAtTime(0.55 * v * v, this.ctx.currentTime, 0.2);
  }

  setTrack(i: number) {
    const n = ((i % BGM_TRACKS.length) + BGM_TRACKS.length) % BGM_TRACKS.length;
    if (n === this.track) return;
    this.track = n;
    this.step = 0;
    this.melodyIdx = 3;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.12;
  }

  setPlaying(on: boolean) {
    if (on === this.playing) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.playing = on;
    this.out.gain.cancelScheduledValues(ctx.currentTime);
    this.out.gain.setTargetAtTime(on ? 0.55 * this.volume * this.volume : 0, ctx.currentTime, on ? 0.5 : 0.18);
    if (on) {
      this.nextTime = ctx.currentTime + 0.1;
      this.startCrackle();
      this.timer = setInterval(() => this.schedule(), 60);
      this.schedule();
    } else {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.crackle?.stop(ctx.currentTime + 0.4);
      this.crackle = null;
    }
  }

  private startCrackle() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2400;
    f.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.value = 0.012;
    src.connect(f).connect(g).connect(this.out);
    src.start();
    this.crackle = src;
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
    const t = BGM_TRACKS[this.track];
    const eighth = 60 / t.bpm / 2;
    const ahead = document.hidden ? 1.6 : 0.4;
    if (this.nextTime < ctx.currentTime) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + ahead) {
      this.playStep(t, this.step, this.nextTime, eighth);
      this.step++;
      // スウィング：裏拍を少し遅らせる
      this.nextTime += eighth * (this.step % 2 ? 1.16 : 0.84);
    }
  }

  private playStep(t: BgmTrack, step: number, at: number, eighth: number) {
    const inBar = step % 8;
    const bar = Math.floor(step / 8);
    const chord = t.chords[bar % t.chords.length];
    const barLen = eighth * 8;

    if (inBar === 0) {
      chord.forEach((iv, i) => this.ep(mtof(t.root + iv), at + i * 0.012, barLen * 0.95, 0.07));
      this.bass(mtof(t.root - 12 + chord[0]), at, eighth * 3);
    }
    if (inBar === 4 && bar % 2 === 1) this.bass(mtof(t.root - 12 + chord[0] + 7), at, eighth * 2.5);
    if (inBar === 0 || inBar === 5) this.kick(at, inBar === 0 ? 0.42 : 0.3);
    if (inBar === 2 || inBar === 6) this.rim(at);
    if (bar % 8 !== 7 || inBar < 6) this.hat(at, inBar % 2 ? 0.018 : 0.03);

    // 旋律：音階上をゆっくり歩く
    const density = bar % 4 === 3 ? 0.18 : 0.34;
    if (Math.random() < density) {
      this.melodyIdx = Math.max(0, Math.min(t.scale.length - 1, this.melodyIdx + Math.round((Math.random() - 0.5) * 3)));
      const note = t.root + 12 + t.scale[this.melodyIdx];
      this.bell(mtof(note), at, eighth * (Math.random() < 0.3 ? 3 : 1.6));
    }
  }

  private env(at: number, peak: number, attack: number, dur: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    return g;
  }

  private ep(freq: number, at: number, dur: number, amp: number) {
    const ctx = this.ctx!;
    const g = this.env(at, amp, 0.02, dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1600;
    g.connect(lp).connect(this.tape);
    for (const [type, mult, det, lvl] of [['sine', 1, 0, 1], ['triangle', 1, 7, 0.45], ['sine', 2, -4, 0.18]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq * mult;
      o.detune.value = det;
      const og = ctx.createGain();
      og.gain.value = lvl;
      o.connect(og).connect(g);
      o.start(at);
      o.stop(at + dur + 0.05);
    }
  }

  private bell(freq: number, at: number, dur: number) {
    const ctx = this.ctx!;
    const g = this.env(at, 0.06, 0.005, dur + 0.6);
    g.connect(this.tape);
    g.connect(this.delaySend);
    for (const [mult, lvl] of [[1, 1], [3.01, 0.12], [4.2, 0.05]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * mult;
      const og = ctx.createGain();
      og.gain.value = lvl;
      o.connect(og).connect(g);
      o.start(at);
      o.stop(at + dur + 0.7);
    }
  }

  private bass(freq: number, at: number, dur: number) {
    const ctx = this.ctx!;
    const g = this.env(at, 0.16, 0.02, dur);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    o.connect(g).connect(this.tape);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  private kick(at: number, amp: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(120, at);
    o.frequency.exponentialRampToValueAtTime(42, at + 0.14);
    const g = this.env(at, amp, 0.004, 0.32);
    o.connect(g).connect(this.tape);
    o.start(at);
    o.stop(at + 0.35);
  }

  private noiseHit(at: number, type: BiquadFilterType, freq: number, amp: number, dur: number) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.env(at, amp, 0.002, dur);
    s.connect(f).connect(g).connect(this.tape);
    s.start(at, Math.random());
    s.stop(at + dur + 0.02);
  }

  private rim(at: number) {
    this.noiseHit(at, 'bandpass', 1900, 0.12, 0.12);
  }

  private hat(at: number, amp: number) {
    this.noiseHit(at, 'highpass', 7200, amp, 0.035);
  }
}

export const bgm = new BgmEngine();
