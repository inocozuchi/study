import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ActiveTimer, TimerMode } from '@/types';
import { repository } from '@/data';
import { useApp } from './AppStore';
import { ambient } from '@/audio/ambient';
import { useWakeLock } from '@/hooks/useWakeLock';
import { MIN, fmtTimer } from '@/lib/time';

/** ディープ集中で「離脱」とみなすまでの猶予 */
const STRAY_GRACE_MS = 5_000;

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

export interface StrayEvent {
  awayMs: number;
  focusedMs: number;
}

/** 長押しで旅を終えたときのリザルト */
export interface JourneyResult {
  startedAt: number;
  endedAt: number;
  focusMs: number;
  subjectId: string | null;
  cycles: number;
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
  stray: StrayEvent | null;

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
  resolveStray: (action: 'resume' | 'break') => void;
  /** 予定ブロックから：科目と長さを指定してカウントダウンを開始 */
  startPlanned: (subjectId: string, minutes: number) => boolean;
  /** 旅を始める（準備シートから） */
  startJourney: (opts: { subjectId: string; mode: TimerMode; minutes: number }) => void;
  /** 旅を終える（長押し）。集中中なら記録してリザルトを返す */
  endJourney: () => JourneyResult | null;
  /** 旅の累計集中（記録済み + 進行中） */
  journeyFocusMs: number;
}

const TimerContext = createContext<TimerContextValue | null>(null);

function elapsedOf(t: ActiveTimer, now: number) {
  return t.accumulatedMs + (t.running && t.startedAt ? now - t.startedAt : 0);
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings, addSession, ready, activeSubjects } = useApp();
  const [timer, setTimerState] = useState<ActiveTimer>(() => repository.loadActiveTimer() ?? IDLE);
  const [now, setNow] = useState(() => Date.now());
  const [stray, setStray] = useState<StrayEvent | null>(null);

  const timerRef = useRef(timer);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const hiddenAtRef = useRef<number | null>(null);

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

  const focusTargetMs = useCallback((mode: TimerMode) => {
    const s = settingsRef.current;
    if (mode === 'pomodoro') return s.pomodoroFocus * MIN;
    if (mode === 'countdown') return s.countdownMinutes * MIN;
    return null;
  }, []);

  /** フォーカスを記録して休憩を開始する。endAt はフォーカス終了の実時刻 */
  const enterBreak = useCallback(
    (endAt: number, focusedMs: number, opts: { completed: boolean; strayed?: boolean }) => {
      const t = timerRef.current;
      const s = settingsRef.current;
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
    [addSession, setTimer],
  );

  /** 次の登りを始める（休憩明け） */
  const nextFocus = useCallback(
    (at: number) => {
      const t = timerRef.current;
      setTimer({
        ...t,
        phase: 'focus',
        running: true,
        startedAt: at,
        accumulatedMs: 0,
        targetMs: t.mode === 'pomodoro' ? settingsRef.current.pomodoroFocus * MIN : t.mode === 'countdown' ? settingsRef.current.countdownMinutes * MIN : null,
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
      setTimer({ ...IDLE, mode: t.mode, subjectId: t.subjectId, cycle: keepCycle ? t.cycle : 0, journeyStartedAt: t.journeyStartedAt, journeyFocusMs: t.journeyFocusMs });
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
        // ディープ集中で離脱中なら、復帰時に判定する
        const hiddenAt = hiddenAtRef.current;
        if (settingsRef.current.deepFocus && hiddenAt != null && doneAt > hiddenAt + STRAY_GRACE_MS) return;
        enterBreak(doneAt, t.targetMs, { completed: true });
        // 休憩も既に終わっていれば続けて判定
        evaluate(at);
      } else if (t.phase === 'break') {
        if (settingsRef.current.chime) ambient.chime('break');
        if (settingsRef.current.autoContinue && t.journeyStartedAt) {
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
      setNow(n);
      evaluate(n);
    };
    worker.postMessage({ type: 'start', interval: 250 });
    return () => {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
    };
  }, [timer.running, evaluate]);

  // Page Visibility：ディープ集中の離脱検知 + 復帰時の即時再計算
  useEffect(() => {
    const onVis = () => {
      const n = Date.now();
      const t = timerRef.current;
      if (document.visibilityState === 'hidden') {
        if (settingsRef.current.deepFocus && t.phase === 'focus' && t.running) hiddenAtRef.current = n;
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      setNow(n);
      if (hiddenAt != null && t.phase === 'focus' && t.running && t.startedAt && n - hiddenAt > STRAY_GRACE_MS) {
        const focusedAtHide = t.accumulatedMs + (hiddenAt - t.startedAt);
        const doneAt = t.targetMs != null ? t.startedAt + (t.targetMs - t.accumulatedMs) : Infinity;
        if (doneAt > hiddenAt + STRAY_GRACE_MS) {
          // 離脱した時刻まで遡って一時停止
          setTimer({ ...t, running: false, startedAt: null, accumulatedMs: focusedAtHide });
          setStray({ awayMs: n - hiddenAt, focusedMs: focusedAtHide });
          return;
        }
      }
      evaluate(n);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [evaluate, setTimer]);

  // 起動時に復元したタイマーの経過を判定
  useEffect(() => {
    evaluate(Date.now());
  }, [evaluate]);

  const start = useCallback(() => {
    ambient.unlock();
    const n = Date.now();
    setNow(n);
    const t = timerRef.current;
    if (t.running) return;
    if (t.phase === 'idle') {
      const subjectId = settingsRef.current.selectedSubjectId;
      if (!subjectId) return;
      const mode = settingsRef.current.mode;
      setTimer({
        ...t,
        phase: 'focus',
        mode,
        running: true,
        startedAt: n,
        accumulatedMs: 0,
        targetMs: focusTargetMs(mode),
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
    ({ subjectId, mode, minutes }: { subjectId: string; mode: TimerMode; minutes: number }) => {
      ambient.unlock();
      const patch: Partial<typeof settingsRef.current> = { selectedSubjectId: subjectId, mode };
      if (mode === 'pomodoro') patch.pomodoroFocus = minutes;
      if (mode === 'countdown') patch.countdownMinutes = minutes;
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
      });
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
    return { startedAt: t.journeyStartedAt ?? n, endedAt: n, focusMs, subjectId: t.subjectId, cycles: t.cycle };
  }, [addSession, setTimer]);

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

  const resolveStray = useCallback(
    (action: 'resume' | 'break') => {
      const ev = stray;
      setStray(null);
      if (!ev) return;
      if (action === 'resume') start();
      else {
        const t = timerRef.current;
        const sessionEnd = (t.sessionStartedAt ?? Date.now()) + ev.focusedMs;
        enterBreak(Math.min(Date.now(), sessionEnd), ev.focusedMs, { completed: false, strayed: true });
        // 休憩は今から
        const b = timerRef.current;
        setTimer({ ...b, startedAt: Date.now() });
      }
    },
    [stray, start, enterBreak, setTimer],
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
      stray,
      start,
      pause,
      toggle,
      finishFocus,
      discard,
      skipBreak,
      setMode,
      setSubject,
      resolveStray,
      startPlanned,
      startJourney,
      endJourney,
      journeyFocusMs: (timer.journeyFocusMs ?? 0) + (timer.phase === 'focus' ? elapsedMs : 0),
    }),
    [timer, now, elapsedMs, remainingMs, idleTarget, progress, isFocusing, isResting, wakeLockHeld, stray, start, pause, toggle, finishFocus, discard, skipBreak, setMode, setSubject, resolveStray, startPlanned, startJourney, endJourney],
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
