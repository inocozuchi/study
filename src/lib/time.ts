import { lang } from './i18n';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function dateKey(d: Date | number): string {
  const x = typeof d === 'number' ? new Date(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date | number): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function addDays(d: Date | number, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** 月曜始まりの週の開始 */
export function startOfWeek(d: Date | number): number {
  const x = new Date(startOfDay(d));
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x.getTime();
}

export function startOfMonth(d: Date | number): number {
  const x = new Date(startOfDay(d));
  x.setDate(1);
  return x.getTime();
}

export function minutesOfDay(t: number): number {
  const d = new Date(t);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

export function fmtClock(min: number): string {
  const m = Math.round(min);
  const h = Math.floor(m / 60);
  return `${h}:${pad(m % 60)}`;
}

export function fmtTime(t: number): string {
  const d = new Date(t);
  return `${d.getHours()}:${pad(d.getMinutes())}`;
}

/** 1時間20分 / 45分 */
export function fmtDuration(min: number, short = false): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (short) {
    if (h === 0) return `${r}m`;
    return r === 0 ? `${h}h` : `${h}h ${r}m`;
  }
  if (lang() === 'en') {
    if (h === 0) return `${r} min`;
    return r === 0 ? `${h}h` : `${h}h ${r}m`;
  }
  if (h === 0) return `${r}分`;
  return r === 0 ? `${h}時間` : `${h}時間${r}分`;
}

/** タイマー表示 mm:ss / h:mm:ss */
export function fmtTimer(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function weekdayJa(d: Date | number) {
  return (lang() === 'en' ? WEEKDAYS_EN : WEEKDAYS)[new Date(d).getDay()];
}

/** 月曜始まりの曜日の短い名前（カレンダーの見出し） */
export const weekdaysMonFirst = () => (lang() === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['月', '火', '水', '木', '金', '土', '日']);

/** 日付の言語（toLocaleDateString などに渡す） */
export const locale = () => (lang() === 'en' ? 'en-US' : 'ja-JP');

export function fmtDateJa(d: Date | number, withWeekday = true) {
  const x = new Date(d);
  if (lang() === 'en') return `${withWeekday ? `${weekdayJa(x)}, ` : ''}${MONTHS_EN[x.getMonth()]} ${x.getDate()}`;
  return `${x.getMonth() + 1}月${x.getDate()}日${withWeekday ? `（${weekdayJa(x)}）` : ''}`;
}

export function timeToInput(min: number) {
  const m = Math.round(min);
  return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
}

export function inputToMin(v: string) {
  const [h, m] = v.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
