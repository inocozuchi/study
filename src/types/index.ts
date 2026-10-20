export type ID = string;

/** 科目アイコンのキー（lib/subjects.ts の SUBJECT_ICONS に対応） */
export type SubjectIconKey =
  | 'book' | 'calculator' | 'coins' | 'languages' | 'code' | 'landmark'
  | 'flask' | 'pen' | 'music' | 'brain' | 'globe' | 'scale';

/** 科目 = 1 本の山岳ルート */
export interface Subject {
  id: ID;
  name: string;
  color: string;
  icon: SubjectIconKey;
  /** 割り当てた山の名前 */
  mountainName: string;
  /** 登頂に必要な累計集中分 */
  targetMinutes: number;
  createdAt: number;
  /** 登頂達成日時（epoch ms） */
  summitedAt?: number;
  archived?: boolean;
}

export type TimerMode = 'pomodoro' | 'countdown' | 'stopwatch';
export type SessionSource = TimerMode | 'manual';

/** 完了した集中セッション（実績） */
export interface FocusSession {
  id: ID;
  subjectId: ID;
  start: number;
  end: number;
  /** 実際に集中していた分（一時停止を除く） */
  minutes: number;
  source: SessionSource;
  note?: string;
  /** ディープ集中で離脱して終わったか */
  strayed?: boolean;
}

/** タイムラインの予定ブロック */
export interface PlanBlock {
  id: ID;
  subjectId: ID;
  /** YYYY-MM-DD */
  date: string;
  /** 0時からの分 */
  startMin: number;
  endMin: number;
  title?: string;
}

export type AmbientChannel = 'rain' | 'fire' | 'wind' | 'river';
export type AmbientMix = Record<AmbientChannel, number>;

export type SkyOverride = 'auto' | 'dawn' | 'day' | 'sunset' | 'night';

export interface Settings {
  pomodoroFocus: number;
  pomodoroShortBreak: number;
  pomodoroLongBreak: number;
  longBreakEvery: number;
  countdownMinutes: number;
  mode: TimerMode;
  deepFocus: boolean;
  wakeLock: boolean;
  chime: boolean;
  ambient: AmbientMix;
  ambientPlaying: boolean;
  selectedSubjectId: ID | null;
  sky: SkyOverride;
}

export type TimerPhase = 'idle' | 'focus' | 'break';

/** 実行中タイマーの永続状態 */
export interface ActiveTimer {
  phase: TimerPhase;
  mode: TimerMode;
  running: boolean;
  /** 現在の走行区間の開始時刻（running 時のみ有効） */
  startedAt: number | null;
  /** 過去の走行区間の合計 ms */
  accumulatedMs: number;
  /** カウントダウン長（ms）。stopwatch は null */
  targetMs: number | null;
  subjectId: ID | null;
  /** フォーカスの最初の開始時刻（記録用） */
  sessionStartedAt: number | null;
  /** ポモドーロで完了した集中回数 */
  cycle: number;
  longBreak: boolean;
}

export interface AppData {
  subjects: Subject[];
  sessions: FocusSession[];
  plans: PlanBlock[];
  settings: Settings;
}
