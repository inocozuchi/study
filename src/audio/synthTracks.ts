/** ブラウザ内で合成する Lo-Fi 曲のデータ（音声ファイルなしで鳴る既定の BGM） */

export interface SynthTrack {
  title: string;
  subtitle: string;
  bpm: number;
  /** ルート音（MIDI） */
  root: number;
  /** 小節ごとのコード（ルートからの半音） */
  chords: number[][];
  /** 旋律に使う音階（ルートからの半音） */
  scale: number[];
  /** カセットのラベル・小窓の配色 */
  colors: { label: string; band: string; sky: string; ground: string };
}

export const SYNTH_TRACKS: SynthTrack[] = [
  {
    title: '朝の草原',
    subtitle: 'Morning Meadow',
    bpm: 74,
    root: 53,
    chords: [[0, 4, 7, 11], [-1, 2, 7, 11], [-3, 0, 4, 7], [-5, -1, 2, 7]],
    scale: [0, 2, 4, 7, 9, 12, 14, 16],
    colors: { label: '#F4C64E', band: '#2F6FB5', sky: '#8CC8EE', ground: '#9BC85A' },
  },
  {
    title: '焚き火のワルツ',
    subtitle: 'Campfire Waltz',
    bpm: 68,
    root: 57,
    chords: [[0, 3, 7, 10], [-4, 0, 3, 7], [3, 7, 10, 14], [-2, 2, 5, 9]],
    scale: [0, 3, 5, 7, 10, 12, 15, 17],
    colors: { label: '#E8743A', band: '#3B2F4A', sky: '#2B3560', ground: '#D9822B' },
  },
  {
    title: '雨上がりの尾根',
    subtitle: 'After the Rain',
    bpm: 70,
    root: 50,
    chords: [[0, 3, 7, 10, 14], [5, 9, 12, 16], [10, 14, 17, 21], [7, 10, 14, 17]],
    scale: [0, 2, 3, 5, 7, 9, 10, 12, 14],
    colors: { label: '#7FB8A4', band: '#2E4A44', sky: '#A9BFD0', ground: '#5E8A6A' },
  },
  {
    title: '星降る稜線',
    subtitle: 'Starfall Ridge',
    bpm: 62,
    root: 51,
    chords: [[0, 4, 7, 11], [4, 7, 11, 14], [-3, 0, 3, 7], [-2, 2, 5, 10]],
    scale: [0, 2, 4, 7, 9, 12, 14, 16],
    colors: { label: '#B9A6E8', band: '#1E2550', sky: '#1C2550', ground: '#36406E' },
  },
];
