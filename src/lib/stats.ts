import type { FocusSession } from '@/types';
import { DAY, addDays, dateKey, startOfDay, startOfMonth, startOfWeek } from './time';

export function sumBetween(sessions: FocusSession[], from: number, to: number) {
  let m = 0;
  for (const s of sessions) if (s.start >= from && s.start < to) m += s.minutes;
  return m;
}

export function minutesByDate(sessions: FocusSession[]) {
  const m = new Map<string, number>();
  for (const s of sessions) {
    const k = dateKey(s.start);
    m.set(k, (m.get(k) ?? 0) + s.minutes);
  }
  return m;
}

/** 今日（または昨日）まで連続して学習した日数と、過去最長 */
export function streaks(sessions: FocusSession[], now = Date.now()) {
  const byDate = minutesByDate(sessions);
  let current = 0;
  let d = new Date(startOfDay(now));
  if (!byDate.get(dateKey(d))) d = addDays(d, -1);
  while (byDate.get(dateKey(d))) {
    current++;
    d = addDays(d, -1);
  }
  const keys = [...byDate.keys()].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of keys) {
    const [y, mo, da] = k.split('-').map(Number);
    const t = new Date(y, mo - 1, da).getTime();
    run = prev != null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return { current, best: Math.max(best, current), todayDone: !!byDate.get(dateKey(now)) };
}

export function summary(sessions: FocusSession[], now = Date.now()) {
  const today0 = startOfDay(now);
  const tomorrow = today0 + DAY;
  const last7 = sumBetween(sessions, today0 - 6 * DAY, tomorrow);
  return {
    today: sumBetween(sessions, today0, tomorrow),
    yesterday: sumBetween(sessions, today0 - DAY, today0),
    week: sumBetween(sessions, startOfWeek(now), tomorrow),
    lastWeek: sumBetween(sessions, startOfWeek(now) - 7 * DAY, startOfWeek(now)),
    month: sumBetween(sessions, startOfMonth(now), tomorrow),
    avg7: last7 / 7,
    total: sessions.reduce((a, s) => a + s.minutes, 0),
  };
}

export interface DayBar {
  key: string;
  date: Date;
  total: number;
  bySubject: Record<string, number>;
}

export function dailyBars(sessions: FocusSession[], days: number, now = Date.now()): DayBar[] {
  const today0 = startOfDay(now);
  const bars: DayBar[] = Array.from({ length: days }, (_, i) => {
    const date = new Date(today0 - (days - 1 - i) * DAY);
    return { key: dateKey(date), date, total: 0, bySubject: {} };
  });
  const index = new Map(bars.map((b, i) => [b.key, i]));
  for (const s of sessions) {
    const i = index.get(dateKey(s.start));
    if (i == null) continue;
    bars[i].total += s.minutes;
    bars[i].bySubject[s.subjectId] = (bars[i].bySubject[s.subjectId] ?? 0) + s.minutes;
  }
  return bars;
}

/** 曜日(月=0) × 時刻 の集中分（直近 n 日） */
export function heatmap(sessions: FocusSession[], days = 28, now = Date.now()) {
  const from = startOfDay(now) - (days - 1) * DAY;
  const grid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const s of sessions) {
    if (s.start < from) continue;
    // 分単位で時間帯へ割り振る
    let t = s.start;
    const end = s.end;
    const step = 60_000;
    const perMinute = s.minutes / Math.max(1, (end - s.start) / step);
    while (t < end) {
      const d = new Date(t);
      grid[(d.getDay() + 6) % 7][d.getHours()] += perMinute;
      t += step;
    }
  }
  return grid;
}

export function bySubject(sessions: FocusSession[], from: number, to: number) {
  const m: Record<string, number> = {};
  for (const s of sessions) if (s.start >= from && s.start < to) m[s.subjectId] = (m[s.subjectId] ?? 0) + s.minutes;
  return m;
}
