import { useEffect, useSyncExternalStore } from 'react';

/**
 * Google カレンダー（読み取りだけ）。
 *
 * サーバーを置かずに GitHub Pages から使えるよう、OAuth 2.0 の「ブラウザ向けの流れ」（response_type=token）で
 * Google のログイン画面へ移動し、戻ってきた URL の # からアクセストークンを受け取る。
 * ポップアップは iPhone のホーム画面アプリでうまく戻れないことがあるので、同じ画面での移動にしている。
 *
 *  - 権限は calendar.readonly（見るだけ。予定を書き換えない）
 *  - トークンは約 1 時間で切れる。切れたら「再接続」を押すまで、最後に読んだ予定（キャッシュ）を表示する
 *  - 使うには Google Cloud で「OAuth クライアント ID（ウェブ）」を作り、設定に貼る（README に手順）
 */

export interface GoogleCalendarInfo {
  id: string;
  name: string;
  primary: boolean;
  color: string;
  /** Google カレンダーの画面で表示にしているか */
  selected: boolean;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  calendarName: string;
  title: string;
  /** epoch ms。終日の予定はその日の 0 時〜翌日 0 時 */
  start: number;
  end: number;
  allDay: boolean;
  location?: string;
  url?: string;
}

/** ここにクライアント ID を書いておくと、端末ごとに貼らなくてよい（公開して問題ない値） */
export const BUILTIN_CLIENT_ID = '';

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const API = 'https://www.googleapis.com/calendar/v3';
const P = 'focus-trail:v1:gcal-';
const K = { token: `${P}token`, state: `${P}state`, events: `${P}events`, calendars: `${P}calendars`, error: `${P}error` };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  try {
    if (v == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* 保存できなくても動く */
  }
}

export function resolveClientId(fromSettings?: string) {
  return (fromSettings ?? '').trim() || BUILTIN_CLIENT_ID;
}

/** 戻ってくる URL（Google Cloud の「承認済みのリダイレクト URI」にこれを登録する） */
export function redirectUri() {
  const path = location.pathname.replace(/index\.html$/, '');
  return `${location.origin}${path.endsWith('/') ? path : `${path}/`}`;
}

// ───────────── 接続（ログイン）─────────────

export function startConnect(clientId: string) {
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  write(K.state, state);
  write(K.error, null);
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: SCOPE,
    include_granted_scopes: 'true',
    state,
  });
  location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${q}`);
}

/** 起動時に呼ぶ：Google から戻ってきた URL ならトークンを受け取って、URL をきれいにする */
export function consumeRedirect(): 'connected' | 'error' | null {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : '';
  if (!hash || !/(access_token|error)=/.test(hash)) return null;
  const h = new URLSearchParams(hash);
  const expected = read<string | null>(K.state, null);
  write(K.state, null);
  history.replaceState(null, '', location.pathname + location.search);
  if (!expected || h.get('state') !== expected) {
    write(K.error, '接続を確認できませんでした。もう一度お試しください。');
    return 'error';
  }
  const error = h.get('error');
  if (error) {
    write(K.error, error === 'access_denied' ? '接続がキャンセルされました。' : `接続できませんでした（${error}）`);
    return 'error';
  }
  const token = h.get('access_token');
  const expiresIn = Number(h.get('expires_in') ?? 3600);
  if (!token) return 'error';
  write(K.token, { token, exp: Date.now() + (expiresIn - 60) * 1000 });
  return 'connected';
}

function validToken(): string | null {
  const t = read<{ token: string; exp: number } | null>(K.token, null);
  return t && t.exp > Date.now() ? t.token : null;
}

export function disconnect() {
  const t = read<{ token: string } | null>(K.token, null);
  if (t) void fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(t.token)}`, { method: 'POST' }).catch(() => {});
  for (const k of Object.values(K)) write(k, null);
  cache = { ...EMPTY };
  emit();
}

// ───────────── 読み込み ─────────────

class AuthError extends Error {}

async function api<T>(path: string): Promise<T> {
  const token = validToken();
  if (!token) throw new AuthError('expired');
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    write(K.token, null);
    throw new AuthError('expired');
  }
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

interface ApiCalendar { id: string; summary: string; summaryOverride?: string; primary?: boolean; backgroundColor?: string; selected?: boolean }
interface ApiEvent {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

function parseDate(d?: { date?: string; dateTime?: string }) {
  if (!d) return { t: NaN, allDay: false };
  if (d.dateTime) return { t: new Date(d.dateTime).getTime(), allDay: false };
  if (d.date) {
    const [y, m, day] = d.date.split('-').map(Number);
    return { t: new Date(y, m - 1, day).getTime(), allDay: true };
  }
  return { t: NaN, allDay: false };
}

async function loadCalendars(): Promise<GoogleCalendarInfo[]> {
  const out: GoogleCalendarInfo[] = [];
  let pageToken = '';
  do {
    const r = await api<{ items?: ApiCalendar[]; nextPageToken?: string }>(`/users/me/calendarList?minAccessRole=reader${pageToken ? `&pageToken=${pageToken}` : ''}`);
    for (const c of r.items ?? []) {
      out.push({ id: c.id, name: c.summaryOverride || c.summary, primary: !!c.primary, color: c.backgroundColor ?? '#9AA0A6', selected: c.selected !== false });
    }
    pageToken = r.nextPageToken ?? '';
  } while (pageToken);
  return out.sort((a, b) => Number(b.primary) - Number(a.primary));
}

async function loadEvents(cal: GoogleCalendarInfo, from: number, to: number): Promise<CalendarEvent[]> {
  const out: CalendarEvent[] = [];
  let pageToken = '';
  do {
    const q = new URLSearchParams({
      timeMin: new Date(from).toISOString(),
      timeMax: new Date(to).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });
    if (pageToken) q.set('pageToken', pageToken);
    const r = await api<{ items?: ApiEvent[]; nextPageToken?: string }>(`/calendars/${encodeURIComponent(cal.id)}/events?${q}`);
    for (const e of r.items ?? []) {
      if (e.status === 'cancelled') continue;
      const s = parseDate(e.start);
      const en = parseDate(e.end);
      if (!Number.isFinite(s.t) || !Number.isFinite(en.t)) continue;
      out.push({
        id: `${cal.id}/${e.id}`,
        calendarId: cal.id,
        calendarName: cal.name,
        title: e.summary?.trim() || '（タイトルなし）',
        start: s.t,
        end: Math.max(en.t, s.t),
        allDay: s.allDay,
        location: e.location,
        url: e.htmlLink,
      });
    }
    pageToken = r.nextPageToken ?? '';
  } while (pageToken);
  return out;
}

// ───────────── 状態（どの画面からでも同じものを見る）─────────────

export type GoogleStatus = 'off' | 'needs-auth' | 'loading' | 'ready' | 'error';

interface CacheState {
  status: GoogleStatus;
  calendars: GoogleCalendarInfo[];
  /** 読み込み済みの範囲の予定（範囲が変わると足していく） */
  events: CalendarEvent[];
  /** 最後に読み込んだ時刻 */
  fetchedAt: number | null;
  message: string | null;
}

const EMPTY: CacheState = { status: 'off', calendars: [], events: [], fetchedAt: null, message: null };
let cache: CacheState = {
  ...EMPTY,
  calendars: read<GoogleCalendarInfo[]>(K.calendars, []),
  ...read<Pick<CacheState, 'events' | 'fetchedAt'>>(K.events, { events: [], fetchedAt: null }),
  message: read<string | null>(K.error, null),
};
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function set(patch: Partial<CacheState>) {
  cache = { ...cache, ...patch };
  emit();
}

/** 読み込み済みの範囲（同じ範囲を何度も読みに行かない） */
const loaded = new Map<string, number>();
const RELOAD_MS = 5 * 60_000;

export function isConnected() {
  return validToken() != null || cache.fetchedAt != null;
}

/** from〜to の予定を読み込む（接続していなければ何もしない） */
export async function ensureRange(from: number, to: number, hidden: string[], force = false) {
  if (!validToken()) {
    set({ status: cache.fetchedAt ? 'needs-auth' : 'off' });
    return;
  }
  const key = `${from}-${to}-${hidden.join(',')}`;
  if (!force && Date.now() - (loaded.get(key) ?? 0) < RELOAD_MS) return;
  loaded.set(key, Date.now());
  set({ status: 'loading', message: null });
  try {
    const calendars = await loadCalendars();
    write(K.calendars, calendars);
    const shown = calendars.filter((c) => c.selected && !hidden.includes(c.id));
    const lists = await Promise.all(shown.map((c) => loadEvents(c, from, to)));
    const fresh = lists.flat();
    // 範囲の外に読んであった予定は残し、範囲の中は入れ替える
    const kept = cache.events.filter((e) => e.end <= from || e.start >= to || hidden.includes(e.calendarId) || !shown.some((c) => c.id === e.calendarId));
    const events = [...kept.filter((e) => !hidden.includes(e.calendarId)), ...fresh].sort((a, b) => a.start - b.start);
    const fetchedAt = Date.now();
    write(K.events, { events, fetchedAt });
    set({ status: 'ready', calendars, events, fetchedAt });
  } catch (e) {
    loaded.delete(key);
    if (e instanceof AuthError) set({ status: 'needs-auth' });
    else set({ status: 'error', message: '予定を読み込めませんでした。通信を確認してください。' });
  }
}

export function useGoogleCalendar() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => cache,
  );
}

/** 画面に出す範囲の予定を読み込む（接続済みのときだけ）。表示しないカレンダーの予定は外して返す */
export function useCalendarRange(from: number, to: number, hidden: string[]) {
  const state = useGoogleCalendar();
  const hiddenKey = hidden.join(',');
  useEffect(() => {
    void ensureRange(from, to, hidden);
  }, [from, to, hiddenKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const events = state.events.filter((e) => e.end > from && e.start < to && !hidden.includes(e.calendarId));
  return { ...state, events };
}
