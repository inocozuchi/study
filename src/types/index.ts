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

export type AmbientChannel = 'rain' | 'fire' | 'wind' | 'river' | 'insects';
export type AmbientMix = Record<AmbientChannel, number>;

export type SkyOverride = 'auto' | 'dawn' | 'day' | 'sunset' | 'night';

/** 旅の季節（シーンの配色・木々・舞うものが変わる） */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'sakura';

export type StudyStyle = 'solo' | 'multi';

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
  /** 挨拶で呼ぶ名前 */
  userName: string;
  season: Season;
  style: StudyStyle;
  /** マルチの部屋コード */
  roomCode: string;
  /** 休憩が終わったら自動で次の登りへ */
  autoContinue: boolean;
  /** 集中を始めたら BGM を流す */
  bgmOnFocus: boolean;
  bgmPlaying: boolean;
  bgmTrack: number;
  bgmVolume: number;
  /** 集中開始時の深呼吸 */
  breathing: boolean;
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
  /** 旅（集中開始〜長押しで終了まで）の開始時刻と、記録済みの集中 ms */
  journeyStartedAt?: number | null;
  journeyFocusMs?: number;
}

/** ノート（その日の振り返り） */
export interface DiaryEntry {
  /** YYYY-MM-DD */
  date: string;
  text: string;
  mood?: 1 | 2 | 3 | 4 | 5;
  updatedAt: number;
}

export interface Todo {
  id: ID;
  text: string;
  done: boolean;
  createdAt: number;
  doneAt?: number;
}

export interface Habit {
  id: ID;
  name: string;
  emoji: string;
  color: string;
  createdAt: number;
  /** 達成した日（YYYY-MM-DD） */
  log: string[];
}

export interface AppData {
  subjects: Subject[];
  sessions: FocusSession[];
  plans: PlanBlock[];
  settings: Settings;
  diary: DiaryEntry[];
  todos: Todo[];
  habits: Habit[];
}
