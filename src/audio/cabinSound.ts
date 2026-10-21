import { ambient } from './ambient';

/**
 * 航空モードの機内の音：ジェットの低いゴーという音（茶色のノイズを低域で鳴らす）+ ごく小さな機内のハム。
 * 音声ファイルは使わず合成する。ループの継ぎ目は作るときに一度だけ、終わりを頭に重ねて消しておく。
 * 飛んでいる間（集中中）だけ鳴らし、休憩・一時停止・着陸ではゆっくり消える。
 */
class CabinSound {
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private hum: OscillatorNode | null = null;
  private on = false;

  private buffer(ctx: AudioContext) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 6);
    const fade = Math.floor(sr * 0.8);
    const buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const raw = new Float32Array(len + fade);
      let last = 0;
      for (let i = 0; i < raw.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        raw[i] = last * 3.2;
      }
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = raw[i];
      // 終わりの続き（raw の len 以降）を頭に等パワーで重ねて、ループの継ぎ目をなくす
      for (let i = 0; i < fade; i++) {
        const k = i / fade;
        d[i] = raw[len + i] * Math.cos((k * Math.PI) / 2) + raw[i] * Math.sin((k * Math.PI) / 2);
      }
    }
    return buf;
  }

  private build() {
    const ctx = ambient.context();
    if (!ctx) return null;
    if (this.gain) return ctx;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(ctx.destination);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const shelf = ctx.createBiquadFilter();
    shelf.type = 'lowshelf';
    shelf.frequency.value = 120;
    shelf.gain.value = 5;
    this.source = ctx.createBufferSource();
    this.source.buffer = this.buffer(ctx);
    this.source.loop = true;
    this.source.connect(lp).connect(shelf).connect(this.gain);
    this.source.start();
    const humGain = ctx.createGain();
    humGain.gain.value = 0.015;
    this.hum = ctx.createOscillator();
    this.hum.frequency.value = 96;
    this.hum.connect(humGain).connect(this.gain);
    this.hum.start();
    return ctx;
  }

  /** 鳴らす / 止める（なめらかに） */
  set(on: boolean) {
    if (on === this.on) return;
    this.on = on;
    const ctx = on ? this.build() : ambient.context();
    if (!ctx || !this.gain) return;
    this.gain.gain.cancelScheduledValues(ctx.currentTime);
    this.gain.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, on ? 1.2 : 0.6);
  }
}

export const cabinSound = new CabinSound();
