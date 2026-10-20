import { ambient } from './ambient';
import { detectLoopRegion, seamlessBuffer } from './loopPlayer';

/**
 * 列車の走行音（public/sounds/train.*）。
 *
 * 音声ファイルを AudioBuffer にデコードし、AudioBufferSourceNode の loop でサンプル単位に継ぎ目なく回す
 * （クロスフェードは使わない。先頭・末尾のエンコーダーの無音だけを外し、波形が飛ぶときだけ数 ms 重ねる）。
 * 速さは playbackRate とピッチで表す：
 *   - 停車中は無音。発車すると playbackRate と音量が少しずつ上がる（加速）
 *   - 巡航の playbackRate は普通 1.0、特急 1.4
 *   - 停車に向けて下がっていき、止まると消える
 * シーンが 1 秒に数回 setMotion を呼ぶ。値はなめらかに追いかける（setTargetAtTime）。
 */

const LOCAL_RATE = 1.0;
const EXPRESS_RATE = 1.4;
/** 動き出した直後の playbackRate（巡航の何倍か） */
const START_RATE = 0.55;

interface ManifestSound {
  file?: string;
}

class TrainSound {
  private buffer: Promise<AudioBuffer | null> | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private enabled = false;
  private volume = 0.8;
  private speed = 0;
  private express = false;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  /** public/sounds の一覧から train で始まる音声ファイルを探す */
  private async url(): Promise<string | null> {
    try {
      const res = await fetch('./sounds/sounds.json', { cache: 'no-cache' });
      if (!res.ok) return null;
      const json = (await res.json()) as { sounds?: ManifestSound[] };
      const hit = (json.sounds ?? []).find((s) => typeof s.file === 'string' && /^train[^/]*\.[a-z0-9]+$/i.test(s.file.replace(/^\.?\/?(sounds\/)?/, '')));
      if (!hit?.file) return null;
      return /^https?:\/\//.test(hit.file) ? hit.file : `./sounds/${hit.file.replace(/^\.?\/?(sounds\/)?/, '')}`;
    } catch {
      return null;
    }
  }

  private load(ctx: AudioContext) {
    this.buffer ??= this.url().then(async (url) => {
      if (!url) return null;
      try {
        const data = await (await fetch(url)).arrayBuffer();
        const raw = await ctx.decodeAudioData(data);
        return seamlessBuffer(ctx, raw, detectLoopRegion(raw), 0);
      } catch {
        return null;
      }
    });
    return this.buffer;
  }

  /** 走行音を使うか（列車モードで旅をしている間だけ true） */
  setEnabled(on: boolean, volume = this.volume) {
    this.volume = volume;
    if (on === this.enabled) {
      this.apply();
      return;
    }
    this.enabled = on;
    if (on) void this.ensure();
    this.apply();
  }

  /** speed：巡航を 1 とした速さ（0 = 停車）。express：特急 */
  setMotion(speed: number, express: boolean) {
    if (Math.abs(speed - this.speed) < 0.01 && express === this.express) return;
    this.speed = Math.max(0, speed);
    this.express = express;
    this.apply();
  }

  private async ensure() {
    const ctx = ambient.context();
    if (!ctx || this.source) return;
    const buf = await this.load(ctx);
    if (!buf || !this.enabled || this.source) return;
    if (!this.gain) {
      this.gain = ctx.createGain();
      this.gain.gain.value = 0;
      this.gain.connect(ctx.destination);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.playbackRate.value = START_RATE;
    src.connect(this.gain);
    src.start();
    this.source = src;
    this.apply();
  }

  private apply() {
    const src = this.source;
    const gain = this.gain;
    if (!src || !gain) return;
    const ctx = gain.context;
    const now = ctx.currentTime;
    const audible = this.enabled && this.speed > 0.005;
    const v = Math.min(1, this.speed);
    const cruise = this.express ? EXPRESS_RATE : LOCAL_RATE;
    // 加速の途中は低く、巡航で 1.0 / 1.4 に届く
    const rate = cruise * (START_RATE + (1 - START_RATE) * v);
    src.playbackRate.cancelScheduledValues(now);
    src.playbackRate.setTargetAtTime(rate, now, 0.35);
    // 音量は動き出しでふくらみ、止まる直前にすっと消える
    const level = audible ? this.volume * Math.min(1, 0.25 + v * 0.9) * Math.min(1, this.speed * 6) : 0;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(level, now, audible ? 0.4 : 0.25);
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = null;
    if (!this.enabled) {
      // 消えきってから止める（次に出発するときはまた頭から）
      this.stopTimer = setTimeout(() => {
        if (this.enabled || !this.source) return;
        try {
          this.source.stop();
        } catch {
          /* 停止済み */
        }
        this.source.disconnect();
        this.source = null;
      }, 1500);
    }
  }
}

export const trainSound = new TrainSound();
