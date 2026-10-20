import type { ActiveTimer, Settings } from '@/types';
/** 止まる場所の種類：出発駅（ホーム）・途中の駅（休憩）・信号場（一時停止）・終着駅（旅の終わり） */
export type StopKind = 'origin' | 'station' | 'signal' | 'terminal';

export interface StopInfo {
  kind: StopKind;
  name: string;
  roman: string;
  prev: string;
  next: string;
}

/** 途中の駅（休憩のたびに 1 駅ずつ進む） */
const STATIONS: [string, string][] = [
  ['ひだまり', 'Hidamari'],
  ['こもれび', 'Komorebi'],
  ['すずかぜ', 'Suzukaze'],
  ['ほたるの', 'Hotaruno'],
  ['わたすげ', 'Watasuge'],
  ['かやの', 'Kayano'],
  ['あおば', 'Aoba'],
  ['ねむのき', 'Nemunoki'],
];

export const originName = (s: Pick<Settings, 'departure'>) => s.departure.trim() || 'はじまり';
export const goalName = (s: Pick<Settings, 'goal'>) => s.goal.trim() || '目標';

const roman = (text: string, fallback: string) => (/^[\x20-\x7E]+$/.test(text) ? text.toUpperCase() : fallback);
const station = (i: number) => STATIONS[((i % STATIONS.length) + STATIONS.length) % STATIONS.length];

/** いま止まる（止まっている）場所 */
export function stopFor(timer: ActiveTimer, settings: Settings, ended: boolean): StopInfo {
  const journeying = timer.phase !== 'idle' || !!timer.journeyStartedAt;
  const origin = originName(settings);
  const goal = goalName(settings);
  // 休憩のたびに 1 駅進む（cycle は終えた集中の回数）
  const at = Math.max(0, timer.cycle - 1);
  if (ended) return { kind: 'terminal', name: goal, roman: roman(goal, 'TERMINAL'), prev: timer.cycle > 0 ? station(at)[0] : origin, next: '' };
  if (!journeying) return { kind: 'origin', name: origin, roman: roman(origin, 'DEPARTURE'), prev: '', next: station(0)[0] };
  if (timer.phase === 'focus') return { kind: 'signal', name: '', roman: '', prev: '', next: '' };
  const [name, rom] = station(at);
  return { kind: 'station', name, roman: rom, prev: at === 0 ? origin : station(at - 1)[0], next: station(at + 1)[0] };
}
