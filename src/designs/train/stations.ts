import type { ActiveTimer, JourneyBooking, Settings } from '@/types';
import { lastPassed, stationByName, stopsFrom } from './booking/line';
/** 止まる場所の種類：出発駅（ホーム）・途中の駅（休憩）・信号場（一時停止）・終着駅（旅の終わり） */
export type StopKind = 'origin' | 'station' | 'signal' | 'terminal';

export interface StopInfo {
  kind: StopKind;
  name: string;
  roman: string;
  prev: string;
  next: string;
}

/** 途中の駅（予約のない旅：休憩のたびに 1 駅ずつ進む） */
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

/**
 * 予約した旅の止まる場所：休憩は「ここまでに集中した分」で通り過ぎた最後の駅（東海道本線の実際の駅）。
 * まだどの駅も過ぎていなければ、次の駅に臨時停車する。
 */
function bookedStop(timer: ActiveTimer, b: JourneyBooking, focusMin: number, ended: boolean): StopInfo {
  const stops = stopsFrom(b.from).filter((s) => s.minutes <= b.minutes + 0.01 || s.station.name === b.to);
  const origin = stationByName(b.from);
  if (ended) {
    const at = lastPassed(stops, focusMin);
    const dest = focusMin >= b.minutes - 0.5 ? stationByName(b.to) : at?.station ?? origin;
    const i = stops.findIndex((s) => s.station.name === dest.name);
    return { kind: 'terminal', name: dest.name, roman: dest.roman.toUpperCase(), prev: i > 0 ? stops[i - 1].station.name : origin.name, next: '' };
  }
  if (timer.phase === 'focus') return { kind: 'signal', name: '', roman: '', prev: '', next: '' };
  const passed = lastPassed(stops, focusMin);
  const here = passed ?? stops[0];
  const i = stops.indexOf(here);
  return { kind: 'station', name: here.station.name, roman: here.station.roman.toUpperCase(), prev: i > 0 ? stops[i - 1].station.name : origin.name, next: stops[i + 1]?.station.name ?? b.to };
}

/** いま止まる（止まっている）場所。focusMin はここまでに集中した分（予約した旅で使う） */
export function stopFor(timer: ActiveTimer, settings: Settings, ended: boolean, focusMin = 0): StopInfo {
  const journeying = timer.phase !== 'idle' || !!timer.journeyStartedAt;
  if (timer.booking) return bookedStop(timer, timer.booking, focusMin, ended);
  const origin = originName(settings);
  const goal = goalName(settings);
  // 休憩のたびに 1 駅進む（cycle は終えた集中の回数）
  const at = Math.max(0, timer.cycle - 1);
  if (ended) return { kind: 'terminal', name: goal, roman: roman(goal, 'TERMINAL'), prev: timer.cycle > 0 ? station(at)[0] : origin, next: '' };
  if (!journeying) {
    const from = settings.trainFrom || origin;
    // 東海道本線の駅なら、隣は実際の次の駅
    const onLine = stationByName(from).name === from;
    return { kind: 'origin', name: from, roman: roman(from, stationByName(from).roman.toUpperCase()), prev: '', next: onLine ? stopsFrom(from)[0]?.station.name ?? '' : station(0)[0] };
  }
  if (timer.phase === 'focus') return { kind: 'signal', name: '', roman: '', prev: '', next: '' };
  const [name, rom] = station(at);
  return { kind: 'station', name, roman: rom, prev: at === 0 ? origin : station(at - 1)[0], next: station(at + 1)[0] };
}

/** 方向幕の行き先：予約した旅は行き先の駅、ないときは目標 */
export const destinationOf = (timer: ActiveTimer, settings: Settings) => timer.booking?.toName ?? goalName(settings);
