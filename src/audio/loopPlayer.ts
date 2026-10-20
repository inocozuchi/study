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
 *
 * ループ用に作られていない録音（雨・川など）は、終わりと頭の波形がつながらず継ぎ目で「プチッ」と鳴る。
 * crossfade を指定すると、終わりの数秒を頭の数秒へ重ねたバッファをあらかじめ作り、
 * 再生中は何も処理せずにそのバッファをループさせる（継ぎ目で音量は下がらない）。
 * 指定がなくても、継ぎ目の波形が大きく飛ぶときは数 ms だけ重ねて「プチッ」を消す。
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
  /** 秒。終わりをこの長さだけ頭に重ねてつなぐ（ループ用でない録音向け。既定 0） */
  crossfade?: number;
}

/** 継ぎ目の波形の食い違いがこれ以下なら、そのままつなぐ（約 -40dBFS） */
const CLICK_JUMP = 0.01;
/** そのときに重ねる長さ（秒）。リズムのずれとして聞こえない短さ */
const DECLICK = 0.008;

/** これ以下の振幅は無音とみなす（約 -60dBFS） */
const SILENCE = 0.001;
/** 自動で削るのは各端この秒数まで（エンコーダーのパディングは通常 50ms 未満） */
const MAX_TRIM = 0.25;
/** これより短い無音は削らない（波形がたまたま 0 付近を通っただけ。ループ用の曲を崩さない） */
const MIN_PAD = 0.0015;

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
    // 削り過ぎない：上限まで無音が続いた場合は意図的な無音として残す。ごく短い 0 付近も削らない
    const minPad = Math.ceil(MIN_PAD * sr);
    // 頭は 1 サンプル手前から（0 から立ち上がる波形の最初の 0 を削ると、継ぎ目で 1 サンプル飛んでしまう）
    if (a < limit && a >= minPad) start = (a - 1) / sr;
    if (buf.length - 1 - b < limit && buf.length - 1 - b >= minPad) end = (b + 1) / sr;
  }
  if (opts.loopStart != null) start = Math.max(0, Math.min(dur, opts.loopStart));
  if (opts.loopEnd != null) end = Math.max(start + 0.01, Math.min(dur, opts.loopEnd));
  return { start, end };
}

/**
 * ループ範囲を切り出し、継ぎ目を重ねたバッファを作る。返すバッファは頭から終わりまでをそのままループすればよい。
 *  - 新しい長さ = 範囲の長さ − 重ねる長さ
 *  - 最後の X サンプル = 範囲の終わり X サンプル（フェードアウト）+ 範囲の頭 X サンプル（フェードイン）
 *  - その次（ループして先頭）は範囲の頭から X サンプル進んだところ → 頭の続きとして自然につながる
 * 雨や川のような相関の低い音でも音量が下がらないよう、等パワー（sin/cos）で重ねる。
 */
export function seamlessBuffer(ctx: BaseAudioContext, buf: AudioBuffer, region: LoopRegion, crossfade = 0): AudioBuffer {
  const sr = buf.sampleRate;
  const a = Math.round(region.start * sr);
  const b = Math.round(region.end * sr);
  const len = b - a;
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  let x = Math.round(Math.max(0, crossfade) * sr);
  if (x === 0 && seamJumps(chans, a, b)) x = Math.round(DECLICK * sr);
  x = Math.min(x, Math.floor(len / 3));
  if (x <= 0 && a === 0 && b === buf.length) return buf;
  const out = ctx.createBuffer(buf.numberOfChannels, len - x, sr);
  for (let c = 0; c < chans.length; c++) {
    const src = chans[c];
    const dst = out.getChannelData(c);
    // 本体：頭から X サンプル進んだところから、終わりの X サンプルの手前まで
    dst.set(src.subarray(a + x, b - x), 0);
    // 継ぎ目：終わり X サンプル（だんだん小さく）＋ 頭 X サンプル（だんだん大きく）
    const base = len - 2 * x;
    for (let i = 0; i < x; i++) {
      const t = (i + 0.5) / x;
      dst[base + i] = src[b - x + i] * Math.cos((t * Math.PI) / 2) + src[a + i] * Math.sin((t * Math.PI) / 2);
    }
  }
  return out;
}

/**
 * 継ぎ目で波形が飛ぶか。終わりの 2 サンプルから「次に来るはずの値」を予測し、
 * 実際の頭の値との食い違いを、終わり付近のふだんの揺れ（2 階差分の平均）と比べる。
 * ループ用に作られた曲は食い違いが小さく、そのままつなぐ（長さが変わらずリズムもずれない）。
 */
function seamJumps(chans: Float32Array[], a: number, b: number) {
  const n = Math.min(256, Math.floor((b - a) / 4));
  if (n < 4) return false;
  return chans.some((d) => {
    let typical = 0;
    for (let i = b - n; i < b - 1; i++) typical += Math.abs(d[i + 1] - 2 * d[i] + d[i - 1]);
    typical /= n - 1;
    const predicted = 2 * d[b - 1] - d[b - 2];
    return Math.abs(d[a] - predicted) > Math.max(CLICK_JUMP, 1.5 * typical);
  });
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
        const raw = await load(this.ctx, url);
        if (my !== this.token) return;
        // 継ぎ目をつないだバッファを作り、以後はその全体をループする
        const buf = seamlessBuffer(this.ctx, raw, detectLoopRegion(raw, opts), opts.crossfade);
        this.buffer = buf;
        this.region = { start: 0, end: buf.length / buf.sampleRate };
        this.pausedAt = 0;
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
