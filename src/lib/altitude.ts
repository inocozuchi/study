import type { FocusSession, Subject } from '@/types';

/** 1分 = 10m */
export const METERS_PER_MINUTE = 10;

export interface Stage {
  index: number; // 0..4
  name: string;
  short: string;
  description: string;
  /** ルート進捗のしきい値（0..1） */
  from: number;
  tint: string;
}

export const STAGES: Stage[] = [
  { index: 0, name: '麓のベースキャンプ', short: '麓', description: '草原に朝露が光る。旅はここから始まる。', from: 0, tint: '#9AD99B' },
  { index: 1, name: '緑の樹林帯', short: '樹林帯', description: '針葉樹の香りと木漏れ日。静かな登り坂が続く。', from: 0.2, tint: '#5FB98A' },
  { index: 2, name: '霧の尾根道', short: '尾根道', description: '森林限界を越え、岩と霧の稜線を歩く。', from: 0.45, tint: '#A9B4C8' },
  { index: 3, name: '万年雪の氷壁', short: '雪渓', description: '空気が澄み、足元には万年雪。一歩ずつ確かに。', from: 0.7, tint: '#CFE6FF' },
  { index: 4, name: '雲海の山頂', short: '山頂', description: '眼下に広がる雲の海。ここまで来た。', from: 0.95, tint: '#FFD27A' },
];

export function stageFor(progress: number): Stage {
  let s = STAGES[0];
  for (const st of STAGES) if (progress >= st.from) s = st;
  return s;
}

export function subjectMinutes(subjectId: string, sessions: FocusSession[]) {
  let m = 0;
  for (const s of sessions) if (s.subjectId === subjectId) m += s.minutes;
  return m;
}

export function routeProgress(subject: Subject, minutes: number) {
  return Math.min(1, minutes / Math.max(1, subject.targetMinutes));
}

export const LANDMARKS = [
  { name: '高尾山', meters: 599 },
  { name: '筑波山', meters: 877 },
  { name: '六甲山', meters: 931 },
  { name: '大山', meters: 1729 },
  { name: '槍ヶ岳', meters: 3180 },
  { name: '富士山', meters: 3776 },
  { name: 'モンブラン', meters: 4808 },
  { name: 'キリマンジャロ', meters: 5895 },
  { name: 'デナリ', meters: 6190 },
  { name: 'アコンカグア', meters: 6961 },
  { name: 'エベレスト', meters: 8848 },
];

export function fmtMeters(m: number) {
  return `${Math.round(m).toLocaleString('ja-JP')}m`;
}

/** 5分ごとの旅のフレーバーテキスト */
const FLAVORS: string[][] = [
  ['草原を抜ける風が心地いい', '小川のせせらぎが聞こえてきた', '道標が見えた。順調だ', '朝露に濡れた花が揺れている', '鳥のさえずりが背中を押す'],
  ['針葉樹林に入った', '木漏れ日が足元を照らす', '苔むした倒木をまたいだ', 'リスが枝の上からこちらを見ている', '森の空気が深くなってきた'],
  ['森林限界を超えた！', '霧の向こうに稜線が見える', 'ハイマツの間を抜けていく', '岩場をしっかりと踏みしめる', '風が強くなってきた。集中を保とう'],
  ['雪渓に足を踏み入れた', '吐く息が白い', '氷壁が陽を受けて輝いている', 'アイゼンが雪を噛む音だけが響く', '空がどこまでも青い'],
  ['雲海が足元に広がった', '山頂の標識が見えてきた', '世界が静まり返っている', '遠くの峰々が金色に染まる', 'ここまで来た自分を誇ろう'],
];

export function flavorText(stageIndex: number, step: number) {
  const list = FLAVORS[Math.max(0, Math.min(4, stageIndex))];
  const gain = step * 5 * METERS_PER_MINUTE;
  return { title: list[step % list.length], sub: `標高 +${gain}m` };
}
