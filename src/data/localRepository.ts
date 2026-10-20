import type { ActiveTimer, AppData, DiaryEntry, FocusSession, Habit, PlanBlock, Settings, Subject, Todo } from '@/types';
import type { FocusRepository } from './repository';
import { DEFAULT_SETTINGS } from './defaults';
import { createSampleData } from './sampleData';

const PREFIX = 'focus-trail:v1:';
const K = {
  initialized: `${PREFIX}initialized`,
  subjects: `${PREFIX}subjects`,
  sessions: `${PREFIX}sessions`,
  plans: `${PREFIX}plans`,
  settings: `${PREFIX}settings`,
  timer: `${PREFIX}timer`,
  diary: `${PREFIX}diary`,
  todos: `${PREFIX}todos`,
  habits: `${PREFIX}habits`,
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
    ambientPlaying: false,
    bgmPlaying: false,
  };
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
    write(K.initialized, true);
  }

  async load(): Promise<AppData> {
    if (!read(K.initialized, false)) {
      const sample = createSampleData();
      this.persistAll(sample);
      return sample;
    }
    return {
      subjects: read<Subject[]>(K.subjects, []),
      sessions: read<FocusSession[]>(K.sessions, []),
      plans: read<PlanBlock[]>(K.plans, []),
      settings: mergeSettings(read<Partial<Settings>>(K.settings, {})),
      diary: read<DiaryEntry[]>(K.diary, []),
      todos: read<Todo[]>(K.todos, []),
      habits: read<Habit[]>(K.habits, []),
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

  loadActiveTimer(): ActiveTimer | null {
    return read<ActiveTimer | null>(K.timer, null);
  }
  saveActiveTimer(timer: ActiveTimer | null) {
    if (timer) write(K.timer, timer);
    else localStorage.removeItem(K.timer);
  }

  async resetToSample() {
    const sample = createSampleData();
    this.persistAll(sample);
    this.saveActiveTimer(null);
    return sample;
  }

  async clearAll() {
    const empty: AppData = { subjects: [], sessions: [], plans: [], settings: DEFAULT_SETTINGS, diary: [], todos: [], habits: [] };
    this.persistAll(empty);
    this.saveActiveTimer(null);
    return empty;
  }
}
