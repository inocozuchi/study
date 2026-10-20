import type { AmbientChannel, AmbientMix } from '@/types';

/**
 * プロシージャル環境音エンジン。音源ファイルは一切使わず、
 * ホワイト / ピンク / ブラウンノイズとフィルタ、LFO、ランダムなイベント（雨粒・薪のはぜる音・鳥）
 * をリアルタイムに合成する。
 */

type NoiseColor = 'white' | 'pink' | 'brown';

interface Channel {
  bus: GainNode;
  /** 粒状イベントをスケジュールする（雨粒・パチパチ等） */
  schedule?: (until: number) => void;
}

const CHANNEL_LEVEL: Record<AmbientChannel, number> = { rain: 0.9, fire: 1.0, wind: 0.85, river: 0.8, insects: 0.7 };

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noise: Partial<Record<NoiseColor, AudioBuffer>> = {};
  private channels: Partial<Record<AmbientChannel, Channel>> = {};
  private mix: AmbientMix = { rain: 0, fire: 0, wind: 0, river: 0, insects: 0 };
  private playing = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  get isPlaying() {
    return this.playing;
  }

  /** BGM などと AudioContext を共有する（ユーザー操作の中で unlock 済みであること） */
  context(): AudioContext | null {
    this.unlock();
    return this.ctx;
  }

  /** ユーザー操作の中で呼ぶ（iOS Safari の自動再生制限対策） */
  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor({ latencyHint: 'playback' });
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 3;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  setMix(mix: AmbientMix) {
    this.mix = { ...mix };
    if (!this.ctx) return;
    for (const key of Object.keys(mix) as AmbientChannel[]) {
      const v = mix[key];
      if (v > 0.001 && !this.channels[key]) this.channels[key] = this.build(key);
      const ch = this.channels[key];
      if (ch) ch.bus.gain.setTargetAtTime(v * v * CHANNEL_LEVEL[key], this.ctx.currentTime, 0.12);
    }
  }

  setPlaying(on: boolean) {
    if (on) this.unlock();
    if (!this.ctx) return;
    this.playing = on;
    this.setMix(this.mix);
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, on ? 0.6 : 0.25);
    if (on && !this.timer) {
      this.timer = setInterval(() => this.tick(), 100);
      this.tick();
    } else if (!on && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick() {
    if (!this.ctx || !this.playing) return;
    // 非表示タブでは setInterval が 1 秒に間引かれるため先読みを長くする
    const ahead = document.hidden ? 1.6 : 0.35;
    const until = this.ctx.currentTime + ahead;
    for (const key of Object.keys(this.channels) as AmbientChannel[]) {
      if (this.mix[key] > 0.001) this.channels[key]?.schedule?.(until);
    }
  }

  /** 完了チャイム：シンギングボウル風の倍音 */
  chime(kind: 'focus' | 'break' = 'focus') {
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.05;
    const base = kind === 'focus' ? 523.25 : 392;
    const out = ctx.createGain();
    out.gain.value = 0.32;
    out.connect(ctx.destination);
    const notes = kind === 'focus' ? [0, 0.18, 0.36] : [0, 0.22];
    const ratios = kind === 'focus' ? [1, 1.25, 1.5] : [1.5, 1];
    notes.forEach((offset, i) => {
      const f = base * ratios[i];
      [[1, 2.6], [2.76, 1.4], [5.4, 0.7]].forEach(([mult, decay], j) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f * mult;
        const g = ctx.createGain();
        const start = t0 + offset;
        const amp = [0.5, 0.18, 0.07][j];
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(amp, start + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, start + decay * 1.6);
        osc.connect(g).connect(out);
        osc.start(start);
        osc.stop(start + decay * 1.7);
      });
    });
  }

  // ───────────────────────── 合成部品 ─────────────────────────

  private noiseBuffer(color: NoiseColor) {
    const ctx = this.ctx!;
    const cached = this.noise[color];
    if (cached) return cached;
    const len = Math.floor(ctx.sampleRate * 7);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (color === 'white') d[i] = w * 0.5;
        else if (color === 'pink') {
          // Paul Kellet のピンクノイズフィルタ
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        } else {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        }
      }
      // ループの継ぎ目をクロスフェード
      const fade = Math.floor(ctx.sampleRate * 0.25);
      for (let i = 0; i < fade; i++) {
        const k = i / fade;
        d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k;
      }
    }
    this.noise[color] = buf;
    return buf;
  }

  private source(color: NoiseColor, rate = 1) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(color);
    src.loop = true;
    src.playbackRate.value = rate;
    src.start(ctx.currentTime, Math.random() * 6);
    return src;
  }

  private filter(type: BiquadFilterType, freq: number, Q = 0.707) {
    const f = this.ctx!.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = Q;
    return f;
  }

  private gain(v: number) {
    const g = this.ctx!.createGain();
    g.gain.value = v;
    return g;
  }

  private lfo(freq: number, depth: number, target: AudioParam, type: OscillatorType = 'sine') {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.gain(depth);
    osc.connect(g).connect(target);
    osc.start();
  }

  /** 短いノイズバースト（雨粒・はぜる音） */
  private burst(dest: AudioNode, at: number, opts: { freq: number; Q: number; amp: number; decay: number; type?: BiquadFilterType }) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer('white');
    const f = this.filter(opts.type ?? 'bandpass', opts.freq, opts.Q);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(opts.amp, at + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + opts.decay);
    src.connect(f).connect(g).connect(dest);
    src.start(at, Math.random() * 5);
    src.stop(at + opts.decay + 0.02);
  }

  private build(key: AmbientChannel): Channel {
    const ctx = this.ctx!;
    const bus = this.gain(0);
    bus.connect(this.master);
    let next = ctx.currentTime;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    switch (key) {
      case 'rain': {
        // 本体：ピンクノイズの帯域を整えた「サーッ」
        this.source('pink').connect(this.filter('highpass', 420)).connect(this.filter('lowpass', 7800)).connect(this.gain(0.75)).connect(bus);
        // 低い屋根の響き
        this.source('brown', 0.9).connect(this.filter('lowpass', 260)).connect(this.gain(0.35)).connect(bus);
        // 揺らぎのある高域
        const shimmer = this.gain(0.12);
        this.source('white', 1.1).connect(this.filter('bandpass', 4200, 0.6)).connect(shimmer).connect(bus);
        this.lfo(0.23, 0.05, shimmer.gain);
        return {
          bus,
          schedule: (until) => {
            if (next < ctx.currentTime) next = ctx.currentTime;
            while (next < until) {
              this.burst(bus, next, { freq: rnd(1800, 6500), Q: rnd(2, 6), amp: rnd(0.08, 0.32), decay: rnd(0.012, 0.04) });
              next += rnd(0.012, 0.09);
            }
          },
        };
      }
      case 'fire': {
        // 炎の低いうなり（ゆらめき LFO）
        const roar = this.gain(0.55);
        this.source('brown').connect(this.filter('lowpass', 320)).connect(roar).connect(bus);
        this.lfo(0.31, 0.18, roar.gain);
        this.lfo(0.87, 0.08, roar.gain, 'triangle');
        // 薄いシュー音
        this.source('white').connect(this.filter('highpass', 3200)).connect(this.gain(0.025)).connect(bus);
        return {
          bus,
          schedule: (until) => {
            if (next < ctx.currentTime) next = ctx.currentTime;
            while (next < until) {
              // パチパチ：1〜5 発のクラスター
              const n = 1 + Math.floor(Math.random() * Math.random() * 5);
              let t = next;
              for (let i = 0; i < n; i++) {
                this.burst(bus, t, { freq: rnd(1400, 5200), Q: rnd(0.8, 3), amp: rnd(0.15, 0.7), decay: rnd(0.004, 0.025) });
                t += rnd(0.008, 0.05);
              }
              // たまに薪が大きくはぜる
              if (Math.random() < 0.08) this.burst(bus, t + 0.02, { freq: rnd(600, 1100), Q: 1.2, amp: rnd(0.5, 0.9), decay: rnd(0.04, 0.09) });
              next += rnd(0.05, 0.55);
            }
          },
        };
      }
      case 'wind': {
        // 森を抜ける風：帯域をゆっくり動かす
        const bp = this.filter('bandpass', 520, 0.8);
        const body = this.gain(0.85);
        this.source('pink').connect(bp).connect(body).connect(bus);
        this.lfo(0.061, 280, bp.frequency);
        this.lfo(0.097, 0.35, body.gain);
        // 葉擦れ
        const leaves = this.gain(0.06);
        this.source('white', 0.8).connect(this.filter('highpass', 2600)).connect(leaves).connect(bus);
        this.lfo(0.14, 0.05, leaves.gain);
        let nextBird = ctx.currentTime + rnd(2, 6);
        return {
          bus,
          schedule: (until) => {
            if (nextBird < ctx.currentTime) nextBird = ctx.currentTime + rnd(1, 3);
            while (nextBird < until) {
              this.bird(bus, nextBird);
              nextBird += rnd(4, 13);
            }
          },
        };
      }
      case 'insects': {
        // 夜の草むら：かすかな虫の地鳴り + 個体ごとの鳴き声
        const drone = this.gain(0.05);
        this.source('white', 1).connect(this.filter('bandpass', 5200, 6)).connect(drone).connect(bus);
        this.lfo(13, 0.035, drone.gain, 'square');
        const crickets = Array.from({ length: 4 }, (_, i) => ({ pitch: 3900 + i * 420 + Math.random() * 200, pan: -0.7 + i * 0.45, next: ctx.currentTime + Math.random() }));
        return {
          bus,
          schedule: (until) => {
            for (const c of crickets) {
              if (c.next < ctx.currentTime) c.next = ctx.currentTime + Math.random() * 0.3;
              while (c.next < until) {
                this.cricket(bus, c.next, c.pitch, c.pan);
                c.next += rnd(0.42, 0.62) + (Math.random() < 0.12 ? rnd(0.6, 2.2) : 0);
              }
            }
          },
        };
      }
      case 'river': {
        // 水の流れの胴鳴り
        this.source('brown', 1.2).connect(this.filter('bandpass', 520, 0.55)).connect(this.gain(0.9)).connect(bus);
        this.source('pink', 1.05).connect(this.filter('highpass', 1600)).connect(this.gain(0.22)).connect(bus);
        // せせらぎ：中心周波数がランダムに跳ねるフィルタ群
        const babblers = Array.from({ length: 4 }, () => {
          const f = this.filter('bandpass', rnd(700, 2400), rnd(4, 9));
          this.source('white', rnd(0.9, 1.1)).connect(f).connect(this.gain(0.42)).connect(bus);
          return f;
        });
        return {
          bus,
          schedule: (until) => {
            if (next < ctx.currentTime) next = ctx.currentTime;
            while (next < until) {
              for (const f of babblers) if (Math.random() < 0.6) f.frequency.setTargetAtTime(rnd(600, 2600), next, rnd(0.02, 0.08));
              next += rnd(0.05, 0.14);
            }
          },
        };
      }
    }
  }

  /** コオロギ：高い正弦波を短いパルス列で鳴らす（個体ごとに音程・定位が違う） */
  private cricket(dest: AudioNode, at: number, pitch: number, pan: number) {
    const ctx = this.ctx!;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(dest);
    const pulses = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < pulses; i++) {
      const t = at + i * 0.034;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, t);
      osc.frequency.linearRampToValueAtTime(pitch * 0.985, t + 0.022);
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.0001, t);
      e.gain.exponentialRampToValueAtTime(0.09, t + 0.004);
      e.gain.exponentialRampToValueAtTime(0.0001, t + 0.024);
      osc.connect(e).connect(p);
      osc.start(t);
      osc.stop(t + 0.03);
    }
  }

  private bird(dest: AudioNode, at: number) {
    const ctx = this.ctx!;
    const reps = 2 + Math.floor(Math.random() * 4);
    const base = 2600 + Math.random() * 1600;
    const g = this.gain(0.035 + Math.random() * 0.03);
    g.connect(dest);
    for (let i = 0; i < reps; i++) {
      const t = at + i * (0.11 + Math.random() * 0.05);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + 0.05);
      osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.09);
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.0001, t);
      e.gain.exponentialRampToValueAtTime(1, t + 0.01);
      e.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(e).connect(g);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }
}

export const ambient = new AmbientEngine();
