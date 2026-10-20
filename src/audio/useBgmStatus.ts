import { useSyncExternalStore } from 'react';
import { bgm } from './bgm';

/** BGM の状態（合成曲 / ファイルの読み込み中・再生中・エラー） */
export function useBgmStatus() {
  return useSyncExternalStore((l) => bgm.subscribe(l), () => bgm.status);
}
