import type { ActiveTimer, AppData, DiaryEntry, FocusSession, Habit, MemoBoard, MemoEdge, MemoNode, PlanBlock, Settings, Subject, Todo, TravelLog } from '@/types';
import type { FocusRepository } from './repository';
import { DEFAULT_SETTINGS } from './defaults';

const PREFIX = 'focus-trail:v1:';
const K = {
  initialized: `${PREFIX}initialized`,
  /** 試作版のサンプル記録を一度だけ消したしるし */
  freshStart: `${PREFIX}fresh-start`,
  subjects: `${PREFIX}subjects`,
  sessions: `${PREFIX}sessions`,
  plans: `${PREFIX}plans`,
  settings: `${PREFIX}settings`,
  timer: `${PREFIX}timer`,
  diary: `${PREFIX}diary`,
  todos: `${PREFIX}todos`,
  habits: `${PREFIX}habits`,
  logs: `${PREFIX}logs`,
  memoBoards: `${PREFIX}memo-boards`,
  memoNodes: `${PREFIX}memo-nodes`,
  memoEdges: `${PREFIX}memo-edges`,
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[focus-trail] storage write failed', e);
  }
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

/** 旧バージョンの設定にも新しい項目を補う（再生状態は起動時に必ず停止） */
function mergeSettings(stored: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    ambient: { ...DEFAULT_SETTINGS.ambient, ...(stored.ambient ?? {}) },
    ambientFiles: { ...(stored.ambientFiles ?? {}) },
    ambientPlaying: false,
    bgmPlaying: false,
  };
}

function emptyData(settings: Settings): AppData {
  return { subjects: [], sessions: [], plans: [], settings, diary: [], todos: [], habits: [], logs: [], memoBoards: [], memoNodes: [], memoEdges: [] };
}

export class LocalStorageRepository implements FocusRepository {
  private persistAll(data: AppData) {
    write(K.subjects, data.subjects);
    write(K.sessions, data.sessions);
    write(K.plans, data.plans);
    write(K.settings, data.settings);
    write(K.diary, data.diary);
    write(K.todos, data.todos);
    write(K.habits, data.habits);
    write(K.logs, data.logs);
    write(K.memoBoards, data.memoBoards);
    write(K.memoNodes, data.memoNodes);
    write(K.memoEdges, data.memoEdges);
    write(K.initialized, true);
  }

  async load(): Promise<AppData> {
    // 初めて開いたとき：記録はすべて 0、科目もなし（科目は集中の準備で名前を入れると作られる）
    if (!read(K.initialized, false)) {
      const empty = emptyData(DEFAULT_SETTINGS);
      this.persistAll(empty);
      write(K.freshStart, true);
      return empty;
    }
    // 試作版で入っていたサンプルの記録を一度だけ消す（設定は残す）
    if (!read(K.freshStart, false)) {
      const settings = { ...mergeSettings(read<Partial<Settings>>(K.settings, {})), selectedSubjectId: null };
      const empty = emptyData(settings);
      this.persistAll(empty);
      this.saveActiveTimer(null);
      write(K.freshStart, true);
      return empty;
    }
    return {
      subjects: read<Subject[]>(K.subjects, []),
      sessions: read<FocusSession[]>(K.sessions, []),
      plans: read<PlanBlock[]>(K.plans, []),
      settings: mergeSettings(read<Partial<Settings>>(K.settings, {})),
      diary: read<DiaryEntry[]>(K.diary, []),
      todos: read<Todo[]>(K.todos, []),
      habits: read<Habit[]>(K.habits, []),
      logs: read<TravelLog[]>(K.logs, []),
      memoBoards: read<MemoBoard[]>(K.memoBoards, []),
      memoNodes: read<MemoNode[]>(K.memoNodes, []),
      memoEdges: read<MemoEdge[]>(K.memoEdges, []),
    };
  }

  async upsertSubject(subject: Subject) {
    write(K.subjects, upsert(read<Subject[]>(K.subjects, []), subject));
  }
  async deleteSubject(id: string) {
    write(K.subjects, read<Subject[]>(K.subjects, []).filter((s) => s.id !== id));
    write(K.sessions, read<FocusSession[]>(K.sessions, []).filter((s) => s.subjectId !== id));
    write(K.plans, read<PlanBlock[]>(K.plans, []).filter((p) => p.subjectId !== id));
  }

  async addSession(session: FocusSession) {
    write(K.sessions, [...read<FocusSession[]>(K.sessions, []), session]);
  }
  async updateSession(session: FocusSession) {
    write(K.sessions, upsert(read<FocusSession[]>(K.sessions, []), session));
  }
  async deleteSession(id: string) {
    write(K.sessions, read<FocusSession[]>(K.sessions, []).filter((s) => s.id !== id));
  }

  async upsertPlan(plan: PlanBlock) {
    write(K.plans, upsert(read<PlanBlock[]>(K.plans, []), plan));
  }
  async deletePlan(id: string) {
    write(K.plans, read<PlanBlock[]>(K.plans, []).filter((p) => p.id !== id));
  }

  async saveSettings(settings: Settings) {
    write(K.settings, settings);
  }

  async saveDiary(entry: DiaryEntry) {
    const list = read<DiaryEntry[]>(K.diary, []).filter((d) => d.date !== entry.date);
    write(K.diary, entry.text.trim() || entry.mood ? [...list, entry] : list);
  }
  async upsertTodo(todo: Todo) {
    write(K.todos, upsert(read<Todo[]>(K.todos, []), todo));
  }
  async deleteTodo(id: string) {
    write(K.todos, read<Todo[]>(K.todos, []).filter((t) => t.id !== id));
  }
  async upsertHabit(habit: Habit) {
    write(K.habits, upsert(read<Habit[]>(K.habits, []), habit));
  }
  async deleteHabit(id: string) {
    write(K.habits, read<Habit[]>(K.habits, []).filter((h) => h.id !== id));
  }

  async upsertMemoBoard(board: MemoBoard) {
    write(K.memoBoards, upsert(read<MemoBoard[]>(K.memoBoards, []), board));
  }
  async deleteMemoBoard(id: string) {
    write(K.memoBoards, read<MemoBoard[]>(K.memoBoards, []).filter((b) => b.id !== id));
    write(K.memoNodes, read<MemoNode[]>(K.memoNodes, []).filter((n) => n.boardId !== id));
    write(K.memoEdges, read<MemoEdge[]>(K.memoEdges, []).filter((e) => e.boardId !== id));
  }
  async upsertMemoNode(node: MemoNode) {
    write(K.memoNodes, upsert(read<MemoNode[]>(K.memoNodes, []), node));
  }
  async deleteMemoNode(id: string) {
    write(K.memoNodes, read<MemoNode[]>(K.memoNodes, []).filter((n) => n.id !== id));
    write(K.memoEdges, read<MemoEdge[]>(K.memoEdges, []).filter((e) => e.from !== id && e.to !== id));
  }
  async upsertMemoEdge(edge: MemoEdge) {
    write(K.memoEdges, upsert(read<MemoEdge[]>(K.memoEdges, []), edge));
  }
  async deleteMemoEdge(id: string) {
    write(K.memoEdges, read<MemoEdge[]>(K.memoEdges, []).filter((e) => e.id !== id));
  }

  async addLog(log: TravelLog) {
    write(K.logs, [...read<TravelLog[]>(K.logs, []), log]);
  }

  loadActiveTimer(): ActiveTimer | null {
    return read<ActiveTimer | null>(K.timer, null);
  }
  saveActiveTimer(timer: ActiveTimer | null) {
    if (timer) write(K.timer, timer);
    else localStorage.removeItem(K.timer);
  }

  async importAll(data: AppData) {
    const next: AppData = {
      ...emptyData(mergeSettings(data.settings ?? {})),
      ...Object.fromEntries((['subjects', 'sessions', 'plans', 'diary', 'todos', 'habits', 'logs', 'memoBoards', 'memoNodes', 'memoEdges'] as const).map((k) => [k, Array.isArray(data[k]) ? data[k] : []])),
    } as AppData;
    this.persistAll(next);
    this.saveActiveTimer(null);
    write(K.freshStart, true);
    return next;
  }

  async clearAll() {
    const empty = emptyData(DEFAULT_SETTINGS);
    this.persistAll(empty);
    this.saveActiveTimer(null);
    return empty;
  }
}
