import type { ActiveTimer, AppData, DiaryEntry, FocusSession, Habit, MemoBoard, MemoEdge, MemoNode, PlanBlock, Settings, Subject, Todo, TravelLog } from '@/types';

/**
 * データ層の抽象。UI/ストアはこのインターフェースだけに依存する。
 * Firebase へ移行する場合は FirestoreRepository を実装し data/index.ts で差し替える。
 */
export interface FocusRepository {
  /** 初回起動なら空のデータを作って返す */
  load(): Promise<AppData>;

  upsertSubject(subject: Subject): Promise<void>;
  deleteSubject(id: string): Promise<void>;

  addSession(session: FocusSession): Promise<void>;
  updateSession(session: FocusSession): Promise<void>;
  deleteSession(id: string): Promise<void>;

  upsertPlan(plan: PlanBlock): Promise<void>;
  deletePlan(id: string): Promise<void>;

  saveSettings(settings: Settings): Promise<void>;

  saveDiary(entry: DiaryEntry): Promise<void>;
  upsertTodo(todo: Todo): Promise<void>;
  deleteTodo(id: string): Promise<void>;
  upsertHabit(habit: Habit): Promise<void>;
  deleteHabit(id: string): Promise<void>;
  /** 思考マップ：ボード（消すとその上のメモと線も消える）・メモ（消すとつながる線も消える）・線 */
  upsertMemoBoard(board: MemoBoard): Promise<void>;
  deleteMemoBoard(id: string): Promise<void>;
  upsertMemoNode(node: MemoNode): Promise<void>;
  deleteMemoNode(id: string): Promise<void>;
  upsertMemoEdge(edge: MemoEdge): Promise<void>;
  deleteMemoEdge(id: string): Promise<void>;
  /** 旅の記録（ログブック） */
  addLog(log: TravelLog): Promise<void>;

  /** タイマーは同期 API（リロード直後に即座に復元するため） */
  loadActiveTimer(): ActiveTimer | null;
  saveActiveTimer(timer: ActiveTimer | null): void;

  /** バックアップから戻す（いまのデータはすべて置き換える）。戻したデータを返す */
  importAll(data: AppData): Promise<AppData>;

  /** 全データ消去（空の状態から始める） */
  clearAll(): Promise<AppData>;
}
