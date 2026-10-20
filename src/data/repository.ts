import type { ActiveTimer, AppData, FocusSession, PlanBlock, Settings, Subject } from '@/types';

/**
 * データ層の抽象。UI/ストアはこのインターフェースだけに依存する。
 * Firebase へ移行する場合は FirestoreRepository を実装し data/index.ts で差し替える。
 */
export interface FocusRepository {
  /** 初回起動ならサンプルデータを投入して返す */
  load(): Promise<AppData>;

  upsertSubject(subject: Subject): Promise<void>;
  deleteSubject(id: string): Promise<void>;

  addSession(session: FocusSession): Promise<void>;
  updateSession(session: FocusSession): Promise<void>;
  deleteSession(id: string): Promise<void>;

  upsertPlan(plan: PlanBlock): Promise<void>;
  deletePlan(id: string): Promise<void>;

  saveSettings(settings: Settings): Promise<void>;

  /** タイマーは同期 API（リロード直後に即座に復元するため） */
  loadActiveTimer(): ActiveTimer | null;
  saveActiveTimer(timer: ActiveTimer | null): void;

  /** サンプルデータで初期化し直す */
  resetToSample(): Promise<AppData>;
  /** 全データ消去（空の状態から始める） */
  clearAll(): Promise<AppData>;
}
