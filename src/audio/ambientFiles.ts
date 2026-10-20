import { ambient } from './ambient';
import { getAmbientSounds, onAmbientLibraryChange, type AmbientSound } from './ambientLibrary';
import { LoopPlayer } from './loopPlayer';

/**
 * アップロードした環境音（public/ambient）のミキサー。
 * 音ごとに LoopPlayer（AudioBuffer のシームレス無限ループ）と音量（GainNode）を持ち、
 * 合成の環境音と同じまとめ（ambient.output()）に流す。音量 0 の音は少し待ってから止め、
 * 次に上げたときは続きから鳴らす。
 */
interface Voice {
  player: LoopPlayer;
  gain: GainNode;
  stopTimer: ReturnType<typeof setTimeout> | null;
}

class AmbientFileMixer {
  private voices = new Map<string, Voice>();
  private mix: Record<string, number> = {};
  private playing = false;

  constructor() {
    // sounds.json を読み込んだら、保存してある音量で鳴らし直す
    onAmbientLibraryChange(() => this.apply());
  }

  set(mix: Record<string, number>, playing: boolean) {
    this.mix = mix;
    this.playing = playing;
    this.apply();
  }

  private voice(sound: AmbientSound): Voice | null {
    const hit = this.voices.get(sound.id);
    if (hit) return hit;
    const out = ambient.output();
    const ctx = ambient.context();
    if (!out || !ctx) return null;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(out);
    const v: Voice = { player: new LoopPlayer(ctx, gain), gain, stopTimer: null };
    this.voices.set(sound.id, v);
    return v;
  }

  private apply() {
    const sounds = getAmbientSounds();
    for (const sound of sounds) {
      const level = this.mix[sound.id] ?? 0;
      const on = this.playing && level > 0.001;
      const existing = this.voices.get(sound.id);
      if (!on && !existing) continue;
      const v = existing ?? this.voice(sound);
      if (!v) continue;
      const ctx = v.gain.context;
      v.gain.gain.cancelScheduledValues(ctx.currentTime);
      v.gain.gain.setTargetAtTime(on ? level * level * sound.gain : 0, ctx.currentTime, 0.15);
      if (on) {
        if (v.stopTimer) clearTimeout(v.stopTimer);
        v.stopTimer = null;
        void v.player.play(sound.url, sound);
      } else if (!v.stopTimer) {
        // 音量が下がりきってから止める（位置は覚えておき、次は続きから）
        v.stopTimer = setTimeout(() => {
          v.stopTimer = null;
          v.player.pause();
        }, 900);
      }
    }
  }
}

export const ambientFiles = new AmbientFileMixer();
