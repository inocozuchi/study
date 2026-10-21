import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ActiveTimer, JourneyBooking, TimerMode } from '@/types';
import { repository } from '@/data';
import { useApp } from './AppStore';
import { ambient } from '@/audio/ambient';
import { useWakeLock } from '@/hooks/useWakeLock';
import { MIN, fmtTimer } from '@/lib/time';

/** 休憩明けに自動で次の集中へ進めるのは、休憩が終わってからこの時間内に気づいたときだけ */
const AUTO_CONTINUE_WINDOW_MS = 60_000;

const IDLE: ActiveTimer = {
  phase: 'idle',
  mode: 'pomodoro',
  running: false,
  startedAt: null,
  accumulatedMs: 0,
  targetMs: null,
  subjectId: null,
  sessionStartedAt: null,
  cycle: 0,
  longBreak: false,
};

/** 旅を終えたとき（長押し、または予約した時間に到着）のリザルト */
export interface JourneyResult {
  startedAt: number;
  endedAt: number;
  focusMs: number;
  subjectId: string | null;
  cycles: number;
  /** 予約した旅（列車・航空） */
  booking?: JourneyBooking | null;
  /** 予約した時間まで集中して到着したか */
  arrived?: boolean;
  /** 進んだ距離（km。予約の距離 × 進み具合） */
  km?: number;
}

export interface StartJourneyOptions {
  subjectId: string;
  mode: TimerMode;
  /** 1 回の集中の長さ（分） */
  minutes: number;
  /** 旅の予定の集中時間（分）。届くと到着する。省略すると終わりなし */
  journeyMinutes?: number;
  booking?: JourneyBooking;
}

interface TimerContextValue {
  timer: ActiveTimer;
  now: number;
  elapsedMs: number;
  remainingMs: number | null;
  /** 0..1（stopwatch は 1 時間で 1 周） */
  progress: number;
  isFocusing: boolean;
  isResting: boolean;
  wakeLockHeld: boolean;

  start: () => void;
  pause: () => void;
  toggle: () => void;
  /** 集中を終えて記録し、休憩へ */
  finishFocus: () => void;
  /** 記録せず破棄 */
  discard: () => void;
  skipBreak: () => void;
  setMode: (mode: TimerMode) => void;
  setSubject: (id: string) => void;
  /** 予定ブロックから：科目と長さを指定してカウントダウンを開始 */
  startPlanned: (subjectId: string, minutes: number) => boolean;
  /** 旅を始める（準備シート・予約画面から） */
  startJourney: (opts: StartJourneyOptions) => void;
  /** 旅を終える（長押し）。集中中なら記録してリザルトを返す */
  endJourney: () => JourneyResult | null;
  /** 旅の累計集中（記録済み + 進行中） */
  journeyFocusMs: number;
  /** 予約した旅の進み具合 0..1（予定の時間がない旅は null） */
  journeyProgress: number | null;
  /** 到着までの残りの集中時間（ms。予定の時間がない旅は null） */
  journeyRemainingMs: number | null;
  /** 予約した時間に届いて自動で旅を終えたときのリザルト（App が受け取って clearArrival する） */
  arrival: JourneyResult | null;
  clearArrival: () => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

function elapsedOf(t: ActiveTimer, now: number) {
  return t.accumulatedMs + (t.running && t.startedAt ? now - t.startedAt : 0);
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings, addSession, addLog, ready, activeSubjects, subjects } = useApp();
  const [arrival, setArrival] = useState<JourneyResult | null>(null);
  const [timer, setTimerState] = useState<ActiveTimer>(() => repository.loadActiveTimer() ?? IDLE);
  const [now, setNow] = useState(() => Date.now());

  const timerRef = useRef(timer);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const setTimer = useCallback((next: ActiveTimer) => {
    timerRef.current = next;
    setTimerState(next);
    repository.saveActiveTimer(next.phase === 'idle' && !next.running && next.cycle === 0 ? null : next);
  }, []);

  // 初回：選択科目がなければ先頭を選ぶ
  useEffect(() => {
    if (!ready) return;
    if (!settings.selectedSubjectId || !activeSubjects.some((s) => s.id === settings.selectedSubjectId)) {
      if (activeSubjects[0]) updateSettings({ selectedSubjectId: activeSubjects[0].id });
    }
  }, [ready, activeSubjects, settings?.selectedSubjectId, updateSettings]);

  // 実行中の科目が削除されたら、記録先のない旅は片付ける
  useEffect(() => {
    if (!ready || !timer.subjectId || subjects.some((x) => x.id === timer.subjectId)) return;
    if (timer.phase !== 'idle' || timer.journeyStartedAt) setTimer({ ...IDLE, mode: timer.mode });
  }, [ready, subjects, timer.subjectId, timer.phase, timer.journeyStartedAt, timer.mode, setTimer]);

  const focusTargetMs = useCallback((mode: TimerMode) => {
    const s = settingsRef.current;
    if (mode === 'pomodoro') return s.pomodoroFocus * MIN;
    if (mode === 'countdown') return s.countdownMinutes * MIN;
    return null;
  }, []);

  /** 予約した旅をログブックに残し、リザルトを作る */
  const closeJourney = useCallback(
    (t: ActiveTimer, focusMs: number, endedAt: number, arrived: boolean): JourneyResult => {
      const b = t.booking ?? null;
      const ratio = arrived ? 1 : t.journeyTargetMs ? Math.min(1, focusMs / t.journeyTargetMs) : 0;
      const km = b ? Math.round(b.km * ratio) : undefined;
      if (b && focusMs >= MIN) {
        addLog({
          mode: b.mode, from: b.from, fromName: b.fromName, to: b.to, toName: b.toName, seat: b.seat, task: b.task,
          km: km ?? 0, plannedKm: b.km, minutes: Math.round(focusMs / MIN), plannedMinutes: b.minutes,
          startedAt: t.journeyStartedAt ?? endedAt - focusMs, endedAt, arrived,
        });
      }
      return { startedAt: t.journeyStartedAt ?? endedAt, endedAt, focusMs, subjectId: t.subjectId, cycles: t.cycle, booking: b, arrived, km };
    },
    [addLog],
  );

  /** 予約した時間まで集中した：記録して旅を終える（到着） */
  const arrive = useCallback(
    (endAt: number, focusedMs: number) => {
      const t = timerRef.current;
      const minutes = Math.round(focusedMs / MIN);
      if (minutes >= 1 && t.subjectId) {
        addSession({ subjectId: t.subjectId, start: t.sessionStartedAt ?? endAt - focusedMs, end: endAt, minutes, source: t.mode });
      }
      if (settingsRef.current.chime) ambient.chime('focus');
      const result = closeJourney({ ...t, cycle: t.cycle + 1 }, (t.journeyFocusMs ?? 0) + focusedMs, endAt, true);
      setTimer({ ...IDLE, mode: t.mode, subjectId: t.subjectId });
      setArrival(result);
    },
    [addSession, closeJourney, setTimer],
  );

  /** フォーカスを記録して休憩を開始する。endAt はフォーカス終了の実時刻 */
  const enterBreak = useCallback(
    (endAt: number, focusedMs: number, opts: { completed: boolean; strayed?: boolean }) => {
      const t = timerRef.current;
      const s = settingsRef.current;
      // 予約した時間に届いたら、休憩ではなく到着
      if (t.journeyTargetMs != null && (t.journeyFocusMs ?? 0) + focusedMs >= t.journeyTargetMs - 1000) {
        arrive(endAt, focusedMs);
        return;
      }
      const minutes = Math.round(focusedMs / MIN);
      if (minutes >= 1 && t.subjectId) {
        addSession({
          subjectId: t.subjectId,
          start: t.sessionStartedAt ?? endAt - focusedMs,
          end: endAt,
          minutes,
          source: t.mode,
          strayed: opts.strayed || undefined,
        });
      }
      const cycle = opts.completed ? t.cycle + 1 : t.cycle;
      const longBreak = t.mode === 'pomodoro' && opts.completed && cycle % Math.max(1, s.longBreakEvery) === 0;
      const breakMin = longBreak ? s.pomodoroLongBreak : s.pomodoroShortBreak;
      if (s.chime && opts.completed) ambient.chime('focus');
      setTimer({
        ...t,
        phase: 'break',
        running: true,
        startedAt: endAt,
        accumulatedMs: 0,
        targetMs: breakMin * MIN,
        sessionStartedAt: null,
        cycle,
        longBreak,
        journeyFocusMs: (t.journeyFocusMs ?? 0) + focusedMs,
      });
    },
    [addSession, arrive, setTimer],
  );

  /** 次の登りを始める（休憩明け） */
  const nextFocus = useCallback(
    (at: number) => {
      const t = timerRef.current;
      const base = t.blockMs ?? (t.mode === 'pomodoro' ? settingsRef.current.pomodoroFocus * MIN : t.mode === 'countdown' ? settingsRef.current.countdownMinutes * MIN : null);
      // 予約した旅は、到着までの残りより長くしない
      const left = t.journeyTargetMs != null ? Math.max(MIN, t.journeyTargetMs - (t.journeyFocusMs ?? 0)) : null;
      setTimer({
        ...t,
        phase: 'focus',
        running: true,
        startedAt: at,
        accumulatedMs: 0,
        targetMs: base != null && left != null ? Math.min(base, left) : base ?? left,
        sessionStartedAt: at,
        longBreak: false,
      });
    },
    [setTimer],
  );

  const toIdle = useCallback(
    (keepCycle = true) => {
      const t = timerRef.current;
      // 旅の情報は残す（休憩明けに自動で続けない設定のとき、ここから再開できる）
      setTimer({ ...IDLE, mode: t.mode, subjectId: t.subjectId, cycle: keepCycle ? t.cycle : 0, journeyStartedAt: t.journeyStartedAt, journeyFocusMs: t.journeyFocusMs, journeyTargetMs: t.journeyTargetMs, booking: t.booking, blockMs: t.blockMs });
    },
    [setTimer],
  );

  /** 時間経過による自動遷移の判定 */
  const evaluate = useCallback(
    (at: number) => {
      const t = timerRef.current;
      if (!t.running || !t.startedAt || t.targetMs == null) return;
      const doneAt = t.startedAt + (t.targetMs - t.accumulatedMs);
      if (at < doneAt) return;
      if (t.phase === 'focus') {
        enterBreak(doneAt, t.targetMs, { completed: true });
        // 休憩も既に終わっていれば続けて判定
        evaluate(at);
      } else if (t.phase === 'break') {
        if (settingsRef.current.chime) ambient.chime('break');
        // 休憩明けの自動出発は「いま終わった」ときだけ。長く閉じていた間の集中を作り出さない
        if (settingsRef.current.autoContinue && t.journeyStartedAt && at - doneAt < AUTO_CONTINUE_WINDOW_MS) {
          nextFocus(doneAt);
          evaluate(at);
        } else toIdle();
      }
    },
    [enterBreak, toIdle, nextFocus],
  );

  // Worker tick
  useEffect(() => {
    if (!timer.running) return;
    const worker = new Worker(new URL('../timer/timer.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = () => {
      const n = Date.now();
      // 表示は秒単位なので、秒が変わったときだけ再描画する（250ms ごとに全体を描き直さない）
      setNow((prev) => (Math.floor(prev / 1000) === Math.floor(n / 1000) ? prev : n));
      evaluate(n);
    };
    worker.postMessage({ type: 'start', interval: 250 });
    return () => {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
    };
  }, [timer.running, evaluate]);

  /** 画面に戻ったとき・起動したとき：止まっていた間の経過をすぐ判定する */
  const onReturn = useCallback(
    (n: number) => {
      setNow(n);
      evaluate(n);
    },
    [evaluate],
  );

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') onReturn(Date.now());
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [onReturn]);

  // 起動時に復元したタイマーの経過を判定
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    onReturn(Date.now());
  }, [onReturn]);

  const start = useCallback(() => {
    ambient.unlock();
    const n = Date.now();
    setNow(n);
    const t = timerRef.current;
    if (t.running) return;
    if (t.phase === 'idle') {
      const subjectId = settingsRef.current.selectedSubjectId;
      if (!subjectId) return;
      const mode = t.booking ? t.mode : settingsRef.current.mode;
      const base = t.blockMs ?? focusTargetMs(mode);
      const left = t.journeyTargetMs != null ? Math.max(MIN, t.journeyTargetMs - (t.journeyFocusMs ?? 0)) : null;
      setTimer({
        ...t,
        phase: 'focus',
        mode,
        running: true,
        startedAt: n,
        accumulatedMs: 0,
        targetMs: base != null && left != null ? Math.min(base, left) : base ?? left,
        subjectId,
        sessionStartedAt: n,
        longBreak: false,
        journeyStartedAt: t.journeyStartedAt ?? n,
        journeyFocusMs: t.journeyFocusMs ?? 0,
      });
    } else {
      setTimer({ ...t, running: true, startedAt: n });
    }
  }, [focusTargetMs, setTimer]);

  const pause = useCallback(() => {
    const t = timerRef.current;
    if (!t.running || !t.startedAt) return;
    const n = Date.now();
    setNow(n);
    setTimer({ ...t, running: false, startedAt: null, accumulatedMs: t.accumulatedMs + (n - t.startedAt) });
  }, [setTimer]);

  const toggle = useCallback(() => (timerRef.current.running ? pause() : start()), [pause, start]);

  const finishFocus = useCallback(() => {
    const t = timerRef.current;
    if (t.phase !== 'focus') return;
    const n = Date.now();
    const focused = elapsedOf(t, n);
    const completed = t.targetMs != null ? focused >= t.targetMs - 1000 : focused >= 5 * MIN;
    enterBreak(n, focused, { completed });
  }, [enterBreak]);

  const discard = useCallback(() => {
    const t = timerRef.current;
    setTimer({ ...IDLE, mode: t.mode, subjectId: t.subjectId });
  }, [setTimer]);
  /** 休憩を切り上げて次の登りへ */
  const skipBreak = useCallback(() => {
    if (timerRef.current.phase !== 'break') return;
    const n = Date.now();
    setNow(n);
    nextFocus(n);
  }, [nextFocus]);

  const startJourney = useCallback(
    ({ subjectId, mode, minutes, journeyMinutes, booking }: StartJourneyOptions) => {
      ambient.unlock();
      // 予約した旅は 1 回の長さをタイマーに持たせる（ふだんのポモドーロの設定は変えない）
      const patch: Partial<typeof settingsRef.current> = { selectedSubjectId: subjectId };
      if (!booking) {
        patch.mode = mode;
        if (mode === 'pomodoro') patch.pomodoroFocus = minutes;
        if (mode === 'countdown') patch.countdownMinutes = minutes;
      }
      updateSettings(patch);
      const n = Date.now();
      setNow(n);
      setTimer({
        ...IDLE,
        phase: 'focus',
        mode,
        running: true,
        startedAt: n,
        targetMs: mode === 'stopwatch' ? null : minutes * MIN,
        subjectId,
        sessionStartedAt: n,
        journeyStartedAt: n,
        journeyFocusMs: 0,
        journeyTargetMs: journeyMinutes ? journeyMinutes * MIN : null,
        booking: booking ?? null,
        blockMs: booking && mode !== 'stopwatch' ? minutes * MIN : null,
      });
      setArrival(null);
    },
    [setTimer, updateSettings],
  );

  const endJourney = useCallback((): JourneyResult | null => {
    const t = timerRef.current;
    if (!t.journeyStartedAt && t.phase === 'idle') return null;
    const n = Date.now();
    let focusMs = t.journeyFocusMs ?? 0;
    if (t.phase === 'focus') {
      const focused = elapsedOf(t, n);
      focusMs += focused;
      const minutes = Math.round(focused / MIN);
      if (minutes >= 1 && t.subjectId) {
        addSession({ subjectId: t.subjectId, start: t.sessionStartedAt ?? n - focused, end: n, minutes, source: t.mode });
      }
    }
    if (settingsRef.current.chime) ambient.chime('break');
    setTimer({ ...IDLE, mode: t.mode, subjectId: t.subjectId });
    return closeJourney(t, focusMs, n, false);
  }, [addSession, closeJourney, setTimer]);

  const setMode = useCallback(
    (mode: TimerMode) => {
      updateSettings({ mode });
      const t = timerRef.current;
      if (t.phase === 'idle') setTimer({ ...t, mode, cycle: 0 });
    },
    [setTimer, updateSettings],
  );

  const setSubject = useCallback(
    (id: string) => {
      updateSettings({ selectedSubjectId: id });
      const t = timerRef.current;
      if (t.phase !== 'break') setTimer({ ...t, subjectId: id });
    },
    [setTimer, updateSettings],
  );

  const startPlanned = useCallback(
    (subjectId: string, minutes: number) => {
      const t = timerRef.current;
      if (t.phase === 'focus') return false;
      ambient.unlock();
      const m = Math.max(10, Math.min(180, Math.round(minutes)));
      updateSettings({ selectedSubjectId: subjectId, mode: 'countdown', countdownMinutes: m });
      const n = Date.now();
      setNow(n);
      setTimer({
        ...IDLE,
        cycle: t.cycle,
        phase: 'focus',
        mode: 'countdown',
        running: true,
        startedAt: n,
        targetMs: m * MIN,
        subjectId,
        sessionStartedAt: n,
        journeyStartedAt: n,
        journeyFocusMs: 0,
      });
      return true;
    },
    [setTimer, updateSettings],
  );

  const elapsedMs = elapsedOf(timer, now);
  const remainingMs = timer.targetMs != null ? Math.max(0, timer.targetMs - elapsedMs) : null;
  const idleTarget = timer.phase === 'idle' && settings ? focusTargetMs(settings.mode) : null;
  const progress =
    timer.phase === 'idle' ? 0 : timer.targetMs != null ? Math.min(1, elapsedMs / timer.targetMs) : (elapsedMs % (60 * MIN)) / (60 * MIN);

  const journeyFocusMs = (timer.journeyFocusMs ?? 0) + (timer.phase === 'focus' ? elapsedMs : 0);
  const journeyProgress = timer.journeyTargetMs ? Math.min(1, journeyFocusMs / timer.journeyTargetMs) : null;
  const journeyRemainingMs = timer.journeyTargetMs ? Math.max(0, timer.journeyTargetMs - journeyFocusMs) : null;
  const clearArrival = useCallback(() => setArrival(null), []);

  const isFocusing = timer.phase === 'focus' && timer.running;
  const isResting = timer.phase === 'break';
  const wakeLockHeld = useWakeLock(!!settings?.wakeLock && timer.running);

  // タブタイトルに残り時間
  useEffect(() => {
    if (timer.phase === 'idle') {
      document.title = 'Focus Trail';
      return;
    }
    const shown = remainingMs ?? elapsedMs;
    document.title = `${fmtTimer(shown)} · ${timer.phase === 'focus' ? (timer.running ? '登山中' : '一時停止') : '焚き火で休憩'}`;
  }, [timer.phase, timer.running, Math.floor((remainingMs ?? elapsedMs) / 1000)]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<TimerContextValue>(
    () => ({
      timer,
      now,
      elapsedMs,
      remainingMs: timer.phase === 'idle' ? idleTarget : remainingMs,
      progress,
      isFocusing,
      isResting,
      wakeLockHeld,
      start,
      pause,
      toggle,
      finishFocus,
      discard,
      skipBreak,
      setMode,
      setSubject,
      startPlanned,
      startJourney,
      endJourney,
      journeyFocusMs,
      journeyProgress,
      journeyRemainingMs,
      arrival,
      clearArrival,
    }),
    [timer, now, elapsedMs, remainingMs, idleTarget, progress, isFocusing, isResting, wakeLockHeld, start, pause, toggle, finishFocus, discard, skipBreak, setMode, setSubject, startPlanned, startJourney, endJourney, journeyFocusMs, journeyProgress, journeyRemainingMs, arrival, clearArrival],
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
