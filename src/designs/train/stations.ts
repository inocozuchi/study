import type { ActiveTimer, JourneyBooking, Settings } from '@/types';
import { classOf, defaultDir, lastPassed, lineById, onLine, stationByName, stopsFrom, usableDir } from './booking/line';
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

/** 予約した旅の路線・向き・種別（前の版の予約は東海道本線・設定の種別） */
export function routeOf(b: JourneyBooking, settings: Pick<Settings, 'trainClass'>) {
  const line = lineById(b.line ?? 'tokaido');
  return { line, dir: b.dir ?? defaultDir(line, b.from), cls: classOf(b.cls ?? settings.trainClass) };
}

/**
 * 予約した旅の駅（進む向きの順。行き先まで）。所要は予約の時間に合わせて割り振る
 * （集中した分の割合 = 進んだキロの割合。予約の時間ちょうどで行き先に着く）
 */
export function bookedStops(b: JourneyBooking, settings: Pick<Settings, 'trainClass'>) {
  const { line, dir, cls } = routeOf(b, settings);
  const all = stopsFrom(line, b.from, dir, cls);
  const end = all.findIndex((s) => s.station.name === b.to);
  const list = end >= 0 ? all.slice(0, end + 1) : all.filter((s) => s.km <= b.km + 0.05);
  return list.map((s) => ({ ...s, minutes: b.km > 0 ? (s.km / b.km) * b.minutes : s.minutes }));
}

/**
 * 予約した旅の止まる場所：休憩は「ここまでに集中した分」で通り過ぎた最後の駅（路線の実際の駅）。
 * まだどの駅も過ぎていなければ、次の駅に臨時停車する。
 */
function bookedStop(timer: ActiveTimer, b: JourneyBooking, settings: Settings, focusMin: number, ended: boolean): StopInfo {
  const { line } = routeOf(b, settings);
  const stops = bookedStops(b, settings);
  const origin = stationByName(line, b.from);
  if (ended) {
    const at = lastPassed(stops, focusMin);
    const dest = focusMin >= b.minutes - 0.5 ? stationByName(line, b.to) : at?.station ?? origin;
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
  if (timer.booking) return bookedStop(timer, timer.booking, settings, focusMin, ended);
  const origin = originName(settings);
  const goal = goalName(settings);
  // 休憩のたびに 1 駅進む（cycle は終えた集中の回数）
  const at = Math.max(0, timer.cycle - 1);
  if (ended) return { kind: 'terminal', name: goal, roman: roman(goal, 'TERMINAL'), prev: timer.cycle > 0 ? station(at)[0] : origin, next: '' };
  if (!journeying) {
    const from = settings.trainFrom || origin;
    // 路線の駅なら、隣は実際の次の駅
    const line = lineById(settings.trainLine);
    if (onLine(line, from)) {
      const dir = usableDir(line, from, settings.trainDir ?? defaultDir(line, from));
      return { kind: 'origin', name: from, roman: stationByName(line, from).roman.toUpperCase(), prev: '', next: stopsFrom(line, from, dir, 'local')[0]?.station.name ?? '' };
    }
    return { kind: 'origin', name: from, roman: roman(from, 'START'), prev: '', next: station(0)[0] };
  }
  if (timer.phase === 'focus') return { kind: 'signal', name: '', roman: '', prev: '', next: '' };
  const [name, rom] = station(at);
  return { kind: 'station', name, roman: rom, prev: at === 0 ? origin : station(at - 1)[0], next: station(at + 1)[0] };
}

/** 方向幕の行き先：予約した旅は行き先の駅、ないときは目標 */
export const destinationOf = (timer: ActiveTimer, settings: Settings) => timer.booking?.toName ?? goalName(settings);
