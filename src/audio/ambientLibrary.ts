import { useSyncExternalStore } from 'react';

/**
 * 環境音のライブラリ：public/ambient/sounds.json に書かれた音声ファイル（アップロードした環境音）。
 * ビルド時にフォルダの中の音声ファイルも自動で一覧に足される（vite.config.ts の audioManifests）。
 * 実行時に読むので、音を足してもコードの変更は不要。
 */

export interface AmbientSound {
  id: string;
  url: string;
  title: string;
  emoji: string;
  /** 0..2（音ごとの音量差をそろえる） */
  gain: number;
  /** 継ぎ目を重ねる秒数（ループ用に作られていない録音でもプチッと鳴らない） */
  crossfade: number;
  loopStart?: number;
  loopEnd?: number;
  trimSilence: boolean;
}

/** sounds.json の 1 音 */
interface ManifestSound {
  file: string;
  title?: string;
  emoji?: string;
  gain?: number;
  crossfade?: number;
  loopStart?: number;
  loopEnd?: number;
  trimSilence?: boolean;
}

/** 環境音は録音をそのままループすることが多いので、既定で 1.5 秒重ねる */
const DEFAULT_CROSSFADE = 1.5;

let sounds: AmbientSound[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function fileName(path: string) {
  return decodeURIComponent(path.split('/').pop() ?? path).replace(/\.[a-z0-9]+$/i, '');
}

/** ファイル名から絵文字を推測する（sounds.json で emoji を書けばそちらが優先） */
function guessEmoji(name: string) {
  const n = name.toLowerCase();
  const table: [RegExp, string][] = [
    [/雷|thunder|storm/, '⛈️'],
    [/雨|rain/, '🌧️'],
    [/川|river|stream|brook|水|water/, '🏞️'],
    [/海|波|sea|ocean|wave/, '🌊'],
    [/焚|火|fire|camp/, '🔥'],
    [/虫|insect|cricket|cicada|蝉|セミ/, '🦗'],
    [/鳥|bird/, '🐦'],
    [/風|wind/, '🍃'],
    [/森|forest|wood/, '🌲'],
    [/雪|snow/, '❄️'],
    [/カフェ|cafe|café|coffee/, '☕'],
    [/電車|train|rail/, '🚃'],
    [/図書|library|page|ページ/, '📚'],
    [/時計|clock|tick/, '🕰️'],
    [/キーボード|keyboard|typing/, '⌨️'],
  ];
  return table.find(([re]) => re.test(n))?.[1] ?? '🎧';
}

export function getAmbientSounds() {
  return sounds;
}

/** public/ambient/sounds.json を読み込む */
export async function loadAmbientLibrary() {
  if (loaded) return;
  loaded = true;
  try {
    const res = await fetch('./ambient/sounds.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const json = (await res.json()) as { sounds?: ManifestSound[] };
    sounds = (json.sounds ?? [])
      .filter((t) => t && typeof t.file === 'string' && t.file.trim())
      .map((t) => {
        const url = /^https?:\/\//.test(t.file) ? t.file : `./ambient/${t.file.replace(/^\.?\/?(ambient\/)?/, '').split('/').map(encodeURIComponent).join('/')}`;
        const title = t.title?.trim() || fileName(t.file);
        return {
          id: `amb-${t.file}`,
          url,
          title,
          emoji: t.emoji?.trim() || guessEmoji(`${title} ${t.file}`),
          gain: Math.max(0, Math.min(2, t.gain ?? 1)),
          crossfade: Math.max(0, Math.min(10, t.crossfade ?? DEFAULT_CROSSFADE)),
          loopStart: t.loopStart,
          loopEnd: t.loopEnd,
          trimSilence: t.trimSilence !== false,
        };
      });
    listeners.forEach((l) => l());
  } catch {
    /* sounds.json がない・壊れている → 内蔵の環境音だけ */
  }
}

export function onAmbientLibraryChange(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useAmbientSounds() {
  return useSyncExternalStore(onAmbientLibraryChange, () => sounds);
}
