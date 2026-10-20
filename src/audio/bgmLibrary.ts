import { useSyncExternalStore } from 'react';
import { SYNTH_TRACKS, type SynthTrack } from './synthTracks';

/**
 * BGM のライブラリ。
 *  - public/bgm/tracks.json に書かれた音声ファイル（アップロードした曲）を先頭に
 *  - そのあとにブラウザ内で合成する 4 曲（ファイルがなくても必ず鳴る）
 * tracks.json は実行時に読むので、曲を足してもコードの変更は不要。
 */

export interface TrackColors {
  label: string;
  band: string;
  sky: string;
  ground: string;
}

interface Common {
  id: string;
  title: string;
  subtitle: string;
  colors: TrackColors;
  /** リストに出す補足（BPM など） */
  detail: string;
}

export type LibraryTrack =
  | (Common & { kind: 'file'; url: string; loopStart?: number; loopEnd?: number; trimSilence: boolean; gain: number })
  | (Common & { kind: 'synth'; synth: SynthTrack });

/** tracks.json の 1 曲 */
interface ManifestTrack {
  file: string;
  title?: string;
  subtitle?: string;
  colors?: Partial<TrackColors>;
  loopStart?: number;
  loopEnd?: number;
  trimSilence?: boolean;
  /** 0..2（曲ごとの音量差をそろえる） */
  gain?: number;
}

const FILE_COLORS: TrackColors[] = [
  { label: '#E68FA8', band: '#4A3A34', sky: '#F6C9A8', ground: '#7FB04A' },
  { label: '#5EB8B0', band: '#24395A', sky: '#9FD0E8', ground: '#C9A86A' },
  { label: '#F2B33D', band: '#3E8C68', sky: '#BFE0EE', ground: '#E3B043' },
  { label: '#9085e9', band: '#17253D', sky: '#3B4E8A', ground: '#5E7B9E' },
];

const synthTracks: LibraryTrack[] = SYNTH_TRACKS.map((t, i) => ({
  id: `synth-${i}`,
  kind: 'synth',
  synth: t,
  title: t.title,
  subtitle: t.subtitle,
  colors: t.colors,
  detail: `ブラウザ内で合成 · ${t.bpm} BPM`,
}));

let tracks: LibraryTrack[] = synthTracks;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getTracks() {
  return tracks;
}

export function trackAt(i: number): LibraryTrack {
  const n = tracks.length;
  return tracks[((i % n) + n) % n];
}

function fileName(path: string) {
  return decodeURIComponent(path.split('/').pop() ?? path).replace(/\.[a-z0-9]+$/i, '');
}

/** public/bgm/tracks.json を読み込む（なければ合成曲だけ） */
export async function loadLibrary() {
  if (loaded) return;
  loaded = true;
  try {
    const res = await fetch('./bgm/tracks.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const json = (await res.json()) as { tracks?: ManifestTrack[] };
    const files: LibraryTrack[] = (json.tracks ?? [])
      .filter((t) => t && typeof t.file === 'string' && t.file.trim())
      .map((t, i) => {
        const url = /^https?:\/\//.test(t.file) ? t.file : `./bgm/${t.file.replace(/^\.?\/?(bgm\/)?/, '')}`;
        return {
          id: `file-${t.file}`,
          kind: 'file',
          url,
          title: t.title?.trim() || fileName(t.file),
          subtitle: t.subtitle?.trim() || 'My Music',
          colors: { ...FILE_COLORS[i % FILE_COLORS.length], ...(t.colors ?? {}) },
          detail: 'アップロードした曲 · シームレスループ',
          loopStart: t.loopStart,
          loopEnd: t.loopEnd,
          trimSilence: t.trimSilence !== false,
          gain: Math.max(0, Math.min(2, t.gain ?? 1)),
        };
      });
    if (files.length) {
      tracks = [...files, ...synthTracks];
      emit();
    }
  } catch {
    /* tracks.json がない・壊れている → 合成曲だけで動く */
  }
}

export function useBgmTracks() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => tracks,
  );
}

export function onLibraryChange(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
