import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData, DiaryEntry, FocusSession, Habit, PlanBlock, Settings, Subject, SubjectIconKey, Todo, TravelLog } from '@/types';
import { repository } from '@/data';
import { routeProgress, subjectMinutes } from '@/lib/altitude';
import { uid } from '@/lib/id';
import { MOUNTAIN_SUGGESTIONS, SUBJECT_COLORS } from '@/lib/subjects';

export interface SummitEvent {
  subject: Subject;
  minutes: number;
}

interface AppContextValue extends AppData {
  ready: boolean;
  /** 全消去のたびに増える（実行中タイマーを作り直す合図） */
  epoch: number;
  subjectById: (id: string | null | undefined) => Subject | undefined;
  minutesBySubject: Record<string, number>;
  activeSubjects: Subject[];

  saveSubject: (s: Omit<Subject, 'id' | 'createdAt'> & Partial<Pick<Subject, 'id' | 'createdAt'>>) => Subject;
  deleteSubject: (id: string) => void;

  addSession: (s: Omit<FocusSession, 'id'>) => FocusSession;
  updateSession: (s: FocusSession) => void;
  deleteSession: (id: string) => void;

  savePlan: (p: Omit<PlanBlock, 'id'> & { id?: string }) => void;
  deletePlan: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;

  /** 名前で科目を探し、なければ新しいルートとして作る（icon は新しく作るときのアイコン） */
  ensureSubject: (name: string, icon?: SubjectIconKey) => Subject;
  /** 旅の記録（ログブック）に 1 件足す */
  addLog: (log: Omit<TravelLog, 'id'>) => void;

  saveDiary: (date: string, patch: Partial<Omit<DiaryEntry, 'date'>>) => void;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  addHabit: (name: string, emoji: string, color: string) => void;
  toggleHabit: (id: string, date: string) => void;
  deleteHabit: (id: string) => void;

  clearAll: () => Promise<void>;

  summit: SummitEvent | null;
  dismissSummit: () => void;
}

function persistSettings(settings: Settings) {
  repository.saveSettings(settings);
  return settings;
}

const AppContext = createContext<AppContextValue | null>(null);

const EMPTY: AppData = {
  subjects: [],
  sessions: [],
  plans: [],
  settings: undefined as unknown as Settings,
  diary: [],
  todos: [],
  habits: [],
  logs: [],
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [summit, setSummit] = useState<SummitEvent | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    repository.load().then((d) => {
      setData(d);
      setReady(true);
    });
  }, []);

  const minutesBySubject = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of data.sessions) m[s.subjectId] = (m[s.subjectId] ?? 0) + s.minutes;
    return m;
  }, [data.sessions]);

  const subjectById = useCallback(
    (id: string | null | undefined) => (id ? data.subjects.find((s) => s.id === id) : undefined),
    [data.subjects],
  );

  const saveSubject: AppContextValue['saveSubject'] = useCallback((input) => {
    const subject: Subject = { ...input, id: input.id ?? uid('sub-'), createdAt: input.createdAt ?? Date.now() } as Subject;
    // 目標変更で登頂状態を再評価
    const mins = subjectMinutes(subject.id, dataRef.current.sessions);
    if (routeProgress(subject, mins) < 1) delete subject.summitedAt;
    else if (!subject.summitedAt) subject.summitedAt = Date.now();
    setData((d) => {
      const exists = d.subjects.some((s) => s.id === subject.id);
      return { ...d, subjects: exists ? d.subjects.map((s) => (s.id === subject.id ? subject : s)) : [...d.subjects, subject] };
    });
    repository.upsertSubject(subject);
    return subject;
  }, []);

  const deleteSubject = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      subjects: d.subjects.filter((s) => s.id !== id),
      sessions: d.sessions.filter((s) => s.subjectId !== id),
      plans: d.plans.filter((p) => p.subjectId !== id),
      settings: d.settings.selectedSubjectId === id ? persistSettings({ ...d.settings, selectedSubjectId: null }) : d.settings,
    }));
    repository.deleteSubject(id);
  }, []);

  /** セッション追加。登頂ラインを越えたら summit イベントを発火 */
  const addSession = useCallback((input: Omit<FocusSession, 'id'>) => {
    const session: FocusSession = { ...input, id: uid('ses-') };
    const d = dataRef.current;
    const subject = d.subjects.find((s) => s.id === session.subjectId);
    let updatedSubject: Subject | undefined;
    if (subject && !subject.summitedAt) {
      const before = subjectMinutes(subject.id, d.sessions);
      if (before + session.minutes >= subject.targetMinutes) {
        updatedSubject = { ...subject, summitedAt: session.end };
        repository.upsertSubject(updatedSubject);
        setSummit({ subject: updatedSubject, minutes: before + session.minutes });
      }
    }
    setData((prev) => ({
      ...prev,
      sessions: [...prev.sessions, session].sort((a, b) => a.start - b.start),
      subjects: updatedSubject ? prev.subjects.map((s) => (s.id === updatedSubject!.id ? updatedSubject! : s)) : prev.subjects,
    }));
    repository.addSession(session);
    return session;
  }, []);

  const updateSession = useCallback((session: FocusSession) => {
    setData((d) => ({ ...d, sessions: d.sessions.map((s) => (s.id === session.id ? session : s)).sort((a, b) => a.start - b.start) }));
    repository.updateSession(session);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
    repository.deleteSession(id);
  }, []);

  const savePlan = useCallback((input: Omit<PlanBlock, 'id'> & { id?: string }) => {
    const plan: PlanBlock = { ...input, id: input.id ?? uid('plan-') };
    setData((d) => {
      const exists = d.plans.some((p) => p.id === plan.id);
      return { ...d, plans: exists ? d.plans.map((p) => (p.id === plan.id ? plan : p)) : [...d.plans, plan] };
    });
    repository.upsertPlan(plan);
  }, []);

  const deletePlan = useCallback((id: string) => {
    setData((d) => ({ ...d, plans: d.plans.filter((p) => p.id !== id) }));
    repository.deletePlan(id);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => {
      const settings = { ...d.settings, ...patch };
      repository.saveSettings(settings);
      return { ...d, settings };
    });
  }, []);

  const ensureSubject = useCallback(
    (name: string, icon: SubjectIconKey = 'book') => {
      const trimmed = name.trim();
      const existing = dataRef.current.subjects.find((s) => s.name === trimmed && !s.archived);
      if (existing) return existing;
      const n = dataRef.current.subjects.length;
      return saveSubject({
        name: trimmed,
        color: SUBJECT_COLORS[n % SUBJECT_COLORS.length],
        icon,
        mountainName: MOUNTAIN_SUGGESTIONS[n % MOUNTAIN_SUGGESTIONS.length],
        targetMinutes: 600,
      });
    },
    [saveSubject],
  );

  const saveDiary = useCallback((date: string, patch: Partial<Omit<DiaryEntry, 'date'>>) => {
    setData((d) => {
      const prev = d.diary.find((e) => e.date === date);
      const entry: DiaryEntry = { date, text: '', ...prev, ...patch, updatedAt: Date.now() };
      repository.saveDiary(entry);
      return { ...d, diary: [...d.diary.filter((e) => e.date !== date), entry] };
    });
  }, []);

  const addTodo = useCallback((text: string) => {
    const todo: Todo = { id: uid('todo-'), text: text.trim(), done: false, createdAt: Date.now() };
    setData((d) => ({ ...d, todos: [...d.todos, todo] }));
    repository.upsertTodo(todo);
  }, []);
  const toggleTodo = useCallback((id: string) => {
    setData((d) => {
      const todos = d.todos.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? Date.now() : undefined } : t));
      const t = todos.find((x) => x.id === id);
      if (t) repository.upsertTodo(t);
      return { ...d, todos };
    });
  }, []);
  const deleteTodo = useCallback((id: string) => {
    setData((d) => ({ ...d, todos: d.todos.filter((t) => t.id !== id) }));
    repository.deleteTodo(id);
  }, []);

  const addHabit = useCallback((name: string, emoji: string, color: string) => {
    const habit: Habit = { id: uid('hab-'), name: name.trim(), emoji, color, createdAt: Date.now(), log: [] };
    setData((d) => ({ ...d, habits: [...d.habits, habit] }));
    repository.upsertHabit(habit);
  }, []);
  const toggleHabit = useCallback((id: string, date: string) => {
    setData((d) => {
      const habits = d.habits.map((h) => (h.id === id ? { ...h, log: h.log.includes(date) ? h.log.filter((x) => x !== date) : [...h.log, date] } : h));
      const h = habits.find((x) => x.id === id);
      if (h) repository.upsertHabit(h);
      return { ...d, habits };
    });
  }, []);
  const deleteHabit = useCallback((id: string) => {
    setData((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id) }));
    repository.deleteHabit(id);
  }, []);

  const addLog = useCallback((input: Omit<TravelLog, 'id'>) => {
    const log: TravelLog = { ...input, id: uid('log-') };
    setData((d) => ({ ...d, logs: [...d.logs, log] }));
    repository.addLog(log);
  }, []);

  // データを消したら epoch を進め、実行中のタイマー（メモリ上の状態）も作り直す
  const clearAll = useCallback(async () => {
    setData(await repository.clearAll());
    setEpoch((e) => e + 1);
  }, []);

  const activeSubjects = useMemo(() => data.subjects.filter((s) => !s.archived), [data.subjects]);

  const value: AppContextValue = {
    ...data,
    ready,
    epoch,
    subjectById,
    minutesBySubject,
    activeSubjects,
    saveSubject,
    deleteSubject,
    addSession,
    updateSession,
    deleteSession,
    savePlan,
    deletePlan,
    updateSettings,
    ensureSubject,
    saveDiary,
    addTodo,
    toggleTodo,
    deleteTodo,
    addHabit,
    toggleHabit,
    deleteHabit,
    addLog,
    clearAll,
    summit,
    dismissSummit: () => setSummit(null),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
