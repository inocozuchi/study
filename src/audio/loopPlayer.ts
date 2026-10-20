/**
 * 音声ファイルのシームレス無限ループ再生。
 *
 * HTMLAudioElement の loop は、ブラウザによって曲の頭に戻るときに数十 ms の空白が入る。
 * ここではファイルを AudioBuffer にデコードし、AudioBufferSourceNode の
 * loop / loopStart / loopEnd でサンプル単位に継ぎ目なくつなぐ（フェードも無音も挟まない）。
 *
 * MP3 / AAC はエンコーダーが先頭と末尾に短い無音（パディング）を足すため、
 * そのままループすると毎周「プツッ」と途切れる。デコード後に先頭・末尾の無音を検出して
 * ループ範囲から外す（最大 MAX_TRIM 秒まで。意図的な長い無音は削らない）。
 */

export interface LoopRegion {
  start: number;
  end: number;
}

export interface LoopOptions {
  /** 秒。指定すると自動検出より優先 */
  loopStart?: number;
  loopEnd?: number;
  /** 先頭・末尾の無音を自動で外す（既定 true） */
  trimSilence?: boolean;
}

/** これ以下の振幅は無音とみなす（約 -60dBFS） */
const SILENCE = 0.001;
/** 自動で削るのは各端この秒数まで（エンコーダーのパディングは通常 50ms 未満） */
const MAX_TRIM = 0.25;

/** 先頭・末尾の無音を除いたループ範囲（秒） */
export function detectLoopRegion(buf: AudioBuffer, opts: LoopOptions = {}): LoopRegion {
  const sr = buf.sampleRate;
  const dur = buf.length / sr;
  let start = 0;
  let end = dur;
  if (opts.trimSilence !== false) {
    const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
    const loud = (i: number) => chans.some((d) => Math.abs(d[i]) > SILENCE);
    const limit = Math.min(Math.floor(MAX_TRIM * sr), Math.floor(buf.length / 4));
    let a = 0;
    while (a < limit && !loud(a)) a++;
    let b = buf.length - 1;
    while (buf.length - 1 - b < limit && b > a && !loud(b)) b--;
    // 削り過ぎない：上限まで無音が続いた場合は意図的な無音として残す
    if (a < limit) start = a / sr;
    if (buf.length - 1 - b < limit) end = (b + 1) / sr;
  }
  if (opts.loopStart != null) start = Math.max(0, Math.min(dur, opts.loopStart));
  if (opts.loopEnd != null) end = Math.max(start + 0.01, Math.min(dur, opts.loopEnd));
  return { start, end };
}

/** デコード済みバッファのキャッシュ（大きいので直近 2 曲だけ持つ） */
const cache = new Map<string, Promise<AudioBuffer>>();
function load(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  const hit = cache.get(url);
  if (hit) {
    cache.delete(url);
    cache.set(url, hit);
    return hit;
  }
  const p = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return r.arrayBuffer();
    })
    .then((data) => ctx.decodeAudioData(data));
  p.catch(() => cache.delete(url));
  cache.set(url, p);
  while (cache.size > 2) cache.delete(cache.keys().next().value as string);
  return p;
}

export type LoopStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export class LoopPlayer {
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private region: LoopRegion = { start: 0, end: 0 };
  private url: string | null = null;
  /** 再生開始した ctx 時刻と、そのときのバッファ内位置（一時停止からの再開用） */
  private startedAt = 0;
  private startOffset = 0;
  private pausedAt = 0;
  private token = 0;
  status: LoopStatus = 'idle';
  error: string | null = null;
  onStatus: (s: LoopStatus) => void = () => {};

  constructor(private ctx: AudioContext, private out: AudioNode) {}

  private setStatus(s: LoopStatus) {
    this.status = s;
    this.onStatus(s);
  }

  /** ループ内の現在位置（秒、バッファ先頭基準） */
  position() {
    if (!this.buffer) return 0;
    if (this.status !== 'playing') return this.pausedAt;
    const len = this.region.end - this.region.start;
    const t = this.startOffset + (this.ctx.currentTime - this.startedAt);
    if (t < this.region.end) return t;
    return this.region.start + ((t - this.region.start) % len);
  }

  get loop() {
    return { ...this.region, duration: this.buffer ? this.buffer.length / this.buffer.sampleRate : 0 };
  }

  async play(url: string, opts: LoopOptions = {}) {
    const sameTrack = url === this.url && this.buffer;
    // 一時停止のフェード中にもう一度再生された場合など：鳴っている曲はそのまま
    if (sameTrack && this.status === 'playing' && this.source) return;
    const my = ++this.token;
    if (!sameTrack) {
      this.stopSource();
      this.buffer = null;
      this.url = url;
      this.pausedAt = 0;
      this.error = null;
      this.setStatus('loading');
      try {
        const buf = await load(this.ctx, url);
        if (my !== this.token) return;
        this.buffer = buf;
        this.region = detectLoopRegion(buf, opts);
        this.pausedAt = this.region.start;
      } catch (e) {
        if (my !== this.token) return;
        this.error = e instanceof Error ? e.message : String(e);
        this.setStatus('error');
        return;
      }
    }
    if (my !== this.token || !this.buffer) return;
    this.stopSource();
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.loop = true;
    src.loopStart = this.region.start;
    src.loopEnd = this.region.end;
    src.connect(this.out);
    const offset = Math.min(Math.max(this.pausedAt, this.region.start), this.region.end - 0.001);
    const at = this.ctx.currentTime + 0.02;
    src.start(at, offset);
    this.source = src;
    this.startedAt = at;
    this.startOffset = offset;
    this.setStatus('playing');
  }

  pause() {
    this.token++;
    if (this.status === 'playing') this.pausedAt = this.position();
    this.stopSource();
    if (this.buffer) this.setStatus('paused');
    else this.setStatus('idle');
  }

  /** 別の曲へ切り替える前に呼ぶ */
  reset() {
    this.token++;
    this.stopSource();
    this.buffer = null;
    this.url = null;
    this.pausedAt = 0;
    this.setStatus('idle');
  }

  private stopSource() {
    if (!this.source) return;
    try {
      this.source.stop();
    } catch {
      /* 既に停止 */
    }
    this.source.disconnect();
    this.source = null;
  }
}
