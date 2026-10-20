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

/** 空の時間。auto＝旅の時間（集中の進み具合で朝→昼→夕、休憩は夜）、clock＝今の時刻 */
export type SkyOverride = 'auto' | 'clock' | 'dawn' | 'day' | 'sunset' | 'night';

/** 旅の季節（シーンの配色・木々・舞うものが変わる） */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'sakura';

/** 外観：端末に合わせる / ライト / ダーク */
export type Appearance = 'system' | 'light' | 'dark';

/** 文字のフォント（lib/fonts.ts の FONTS） */
export type FontId = 'ud' | 'system' | 'noto' | 'rounded' | 'maru' | 'hand' | 'mincho';

/** 旅のモード。'flight'（航空）は準備中（カードだけ） */
export type TravelMode = 'mountain' | 'train' | 'flight';
/** タイマーのデザインとして選べるモード */
export type TimerDesignId = Exclude<TravelMode, 'flight'>;
export type TrainClass = 'local' | 'express';

export interface Settings {
  pomodoroFocus: number;
  pomodoroShortBreak: number;
  pomodoroLongBreak: number;
  longBreakEvery: number;
  countdownMinutes: number;
  mode: TimerMode;
  wakeLock: boolean;
  chime: boolean;
  /** 内蔵（合成）の環境音の音量 */
  ambient: AmbientMix;
  /** アップロードした環境音（public/ambient）の音量。キーは音の ID */
  ambientFiles: Record<string, number>;
  ambientPlaying: boolean;
  selectedSubjectId: ID | null;
  sky: SkyOverride;
  /** 挨拶で呼ぶ名前 */
  userName: string;
  season: Season;
  /** 休憩が終わったら自動で次の登りへ */
  autoContinue: boolean;
  /** 集中を始めたら BGM を流す */
  bgmOnFocus: boolean;
  bgmPlaying: boolean;
  /** 選んでいる BGM（tracks.json の曲の ID）。null は先頭の曲 */
  bgmTrackId: string | null;
  bgmVolume: number;
  /** 集中開始時の深呼吸 */
  breathing: boolean;
  /** 旅のモード（タイマーのデザイン）。航空は準備中で選べない */
  timerDesign: TimerDesignId;
  /** 目標（列車の「行き先」、飛行機の DESTINATION）。空なら「目標」 */
  goal: string;
  /** 出発駅（列車のきっぷ）。空なら「はじまり」 */
  departure: string;
  /** 列車：普通 / 特急 */
  trainClass: TrainClass;
  /** 列車の走行音（public/sounds/train.*） */
  trainSound: boolean;
  /** 登山：ハイカーの服（0..2） */
  hikerLook: number;
  /** 登山：テント（0..2） */
  tentStyle: number;
  font: FontId;
  appearance: Appearance;
  /** Google カレンダー：OAuth クライアント ID（端末ごと。lib/googleCalendar の BUILTIN_CLIENT_ID があれば不要） */
  googleClientId: string;
  /** Google カレンダー：表示しないカレンダーの ID */
  googleHiddenCalendars: string[];
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
