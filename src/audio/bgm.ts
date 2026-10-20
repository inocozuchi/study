import { ambient } from './ambient';
import { onLibraryChange, trackById, type LibraryTrack } from './bgmLibrary';
import { LoopPlayer, type LoopStatus } from './loopPlayer';

/**
 * BGM エンジン。アップロードした音声ファイルを LoopPlayer でサンプル単位のシームレス無限ループにする。
 * 曲は ID で選ぶ（tracks.json に曲を足しても、選んでいた曲がずれない）。
 */
class BgmEngine {
  private ctx: AudioContext | null = null;
  private out!: GainNode;
  private fileBus!: GainNode;
  private loop: LoopPlayer | null = null;
  private volume = 0.7;
  private currentId: string | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  trackId: string | null = null;
  playing = false;

  constructor() {
    // tracks.json を読み込んだら、今の曲を鳴らし直す
    onLibraryChange(() => {
      if (this.playing && this.current()?.id !== this.currentId) this.startCurrent();
      this.emit();
    });
  }

  private current(): LibraryTrack | null {
    return trackById(this.trackId);
  }

  /** UI 用：曲なし・読み込み中・再生中・エラーなど */
  get status(): LoopStatus | 'empty' {
    if (!this.current()) return 'empty';
    return this.loop?.status ?? 'idle';
  }
  get loopInfo() {
    return this.loop?.loop ?? null;
  }
  subscribe(l: () => void) {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
  private emit() {
    this.listeners.forEach((l) => l());
  }

  private ensure() {
    if (this.ctx) return this.ctx;
    const ctx = ambient.context();
    if (!ctx) return null;
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(ctx.destination);
    this.fileBus = ctx.createGain();
    this.fileBus.connect(this.out);
    this.loop = new LoopPlayer(ctx, this.fileBus);
    this.loop.onStatus = () => this.emit();
    return ctx;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx && this.playing) this.out.gain.setTargetAtTime(v * v, this.ctx.currentTime, 0.2);
  }

  setTrack(id: string | null) {
    if (id === this.trackId) return;
    this.trackId = id;
    if (this.playing) this.startCurrent();
    this.emit();
  }

  /**
   * 再生/一時停止。音量のフェードはユーザーが押したときだけで、
   * 曲の継ぎ目（ループ）には一切フェードも無音も入らない。
   */
  setPlaying(on: boolean) {
    if (on === this.playing) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.playing = on;
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = null;
    this.out.gain.cancelScheduledValues(ctx.currentTime);
    this.out.gain.setTargetAtTime(on ? this.volume * this.volume : 0, ctx.currentTime, on ? 0.35 : 0.12);
    if (on) this.startCurrent();
    else {
      // 音量が下がりきってから止める（位置は覚えておき、次は続きから）
      this.stopTimer = setTimeout(() => {
        if (!this.playing) this.loop?.pause();
      }, 450);
    }
    this.emit();
  }

  private startCurrent() {
    const ctx = this.ctx;
    const t = this.current();
    if (!ctx || !t) return;
    this.currentId = t.id;
    this.fileBus.gain.setValueAtTime(0.9 * t.gain, ctx.currentTime);
    void this.loop!.play(t.url, t);
  }
}

export const bgm = new BgmEngine();
