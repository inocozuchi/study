import { useSyncExternalStore } from 'react';

/**
 * 環境音のライブラリ：public/ambient/sounds.json と public/sounds/sounds.json に書かれた音声ファイル。
 * public/sounds の train.*（列車の走行音）は audio/trainSound.ts が使うので、ここには出さない。
 * ビルド時にフォルダの中の音声ファイルも自動で一覧に足される（vite.config.ts の audioManifests）。
 * 実行時に読むので、音を足してもコードの変更は不要。
 */

export interface AmbientSound {
  id: string;
  url: string;
  title: string;
  /** ミキサーのアイコンの種類 */
  kind: AmbientKind;
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

/** 音の種類（ミキサーのアイコン）。ファイル名・題名から推測する */
export type AmbientKind = 'storm' | 'rain' | 'river' | 'sea' | 'fire' | 'insects' | 'birds' | 'wind' | 'forest' | 'snow' | 'cafe' | 'train' | 'book' | 'clock' | 'keyboard' | 'festival' | 'other';

function guessKind(name: string): AmbientKind {
  const n = name.toLowerCase();
  const table: [RegExp, AmbientKind][] = [
    [/雷|thunder|storm/, 'storm'],
    [/雨|rain/, 'rain'],
    [/川|river|stream|brook|水|water/, 'river'],
    [/海|波|sea|ocean|wave/, 'sea'],
    [/焚|火|fire|camp/, 'fire'],
    [/虫|insect|cricket|cicada|蝉|セミ/, 'insects'],
    [/鳥|bird/, 'birds'],
    [/風|wind/, 'wind'],
    [/森|forest|wood/, 'forest'],
    [/雪|snow/, 'snow'],
    [/カフェ|cafe|café|coffee/, 'cafe'],
    [/電車|train|rail/, 'train'],
    [/祭|festival|matsuri/, 'festival'],
    [/図書|library|page|ページ/, 'book'],
    [/時計|clock|tick/, 'clock'],
    [/キーボード|keyboard|typing/, 'keyboard'],
  ];
  return table.find(([re]) => re.test(n))?.[1] ?? 'other';
}

export function getAmbientSounds() {
  return sounds;
}

/** フォルダの一覧（sounds.json）を読む。列車の走行音（sounds/train.*）は列車モードが使うので外す */
async function readFolder(dir: 'ambient' | 'sounds'): Promise<AmbientSound[]> {
  try {
    const res = await fetch(`./${dir}/sounds.json`, { cache: 'no-cache' });
    if (!res.ok) return [];
    const json = (await res.json()) as { sounds?: ManifestSound[] };
    const strip = new RegExp(`^\\.?\\/?(${dir}\\/)?`);
    return (json.sounds ?? [])
      .filter((t) => t && typeof t.file === 'string' && t.file.trim())
      .filter((t) => !(dir === 'sounds' && /^train[^/]*$/i.test(t.file.replace(strip, ''))))
      .map((t) => {
        const url = /^https?:\/\//.test(t.file) ? t.file : `./${dir}/${t.file.replace(strip, '').split('/').map(encodeURIComponent).join('/')}`;
        const title = t.title?.trim() || fileName(t.file);
        return {
          id: dir === 'ambient' ? `amb-${t.file}` : `snd-${t.file}`,
          url,
          title,
          kind: guessKind(`${title} ${t.file}`),
          gain: Math.max(0, Math.min(2, t.gain ?? 1)),
          crossfade: Math.max(0, Math.min(10, t.crossfade ?? DEFAULT_CROSSFADE)),
          loopStart: t.loopStart,
          loopEnd: t.loopEnd,
          trimSilence: t.trimSilence !== false,
        };
      });
  } catch {
    /* 一覧がない・壊れている → そのフォルダの音はなし */
    return [];
  }
}

/** public/ambient と public/sounds の一覧を読み込む */
export async function loadAmbientLibrary() {
  if (loaded) return;
  loaded = true;
  const lists = await Promise.all([readFolder('ambient'), readFolder('sounds')]);
  sounds = lists.flat();
  if (sounds.length) listeners.forEach((l) => l());
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
