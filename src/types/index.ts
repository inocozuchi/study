export type ID = string;

/** 科目アイコンのキー（lib/subjects.ts の SUBJECT_ICONS に対応） */
export type SubjectIconKey =
  | 'book' | 'calculator' | 'coins' | 'languages' | 'code' | 'landmark'
  | 'flask' | 'pen' | 'music' | 'brain' | 'globe' | 'scale'
  | 'target' | 'briefcase' | 'dumbbell' | 'flower';

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

/** 旅のモード（登山 / 列車 / 航空） */
export type TravelMode = 'mountain' | 'train' | 'flight';
/** タイマーのデザインとして選べるモード（いまはすべてのモード） */
export type TimerDesignId = TravelMode;
/** 予約の時間の刻み：ポモドーロ（25 分ごと、間に休憩）/ フリー（5 分刻みで 1 本の集中） */
export type TimeStep = 'pomodoro' | 'free';

/** 旅の予約（列車・航空の予約画面で決める）。集中中のタイマーに持たせ、リロードしても残る */
export interface JourneyBooking {
  mode: TravelMode;
  /** 出発地・到着地（空港コード / 駅名）と表示名 */
  from: string;
  fromName: string;
  to: string;
  toName: string;
  /** 予定の集中時間（分。休憩は含まない） */
  minutes: number;
  /** 距離（km） */
  km: number;
  /** 座席（'12A' / '7番A席'） */
  seat: string;
  /** 集中すること（＝科目の名前） */
  task: string;
  step: TimeStep;
  bookedAt: number;
  /** 列車：路線・進む向き（1 = 下り、-1 = 上り）・種別 */
  line?: TrainLine;
  dir?: 1 | -1;
  cls?: TrainClass;
}

/** 旅の記録（ログブック）。到着、または途中で旅を終えたときに 1 件残す */
export interface TravelLog {
  id: ID;
  mode: TravelMode;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  seat: string;
  task: string;
  /** 実際に進んだ距離（km）と、予定の距離 */
  km: number;
  plannedKm: number;
  /** 実際に集中した分と、予定の分 */
  minutes: number;
  plannedMinutes: number;
  startedAt: number;
  endedAt: number;
  arrived: boolean;
}
/** 列車の種別：普通 / 快速 / 急行 / 特急 */
export type TrainClass = 'local' | 'rapid' | 'kyuko' | 'express';
/** 列車の路線：函館・宗谷本線 / 東北本線 / 東海道・山陽本線 / 鹿児島本線・指宿枕崎線 / 稚内〜枕崎 全線走破 */
export type TrainLine = 'hokkaido' | 'tohoku' | 'tokaido' | 'kyushu' | 'trail';
export type TrainWeather = 'clear' | 'rain';

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
  /** 1 日の始まり（起床）と終わり（就寝）。0 時からの分。就寝は 24 時を過ぎてもよい（25:00 = 翌 1 時） */
  wakeMin: number;
  sleepMin: number;
  /** 列車：普通 / 快速 / 急行 / 特急 */
  trainClass: TrainClass;
  /** 列車の走行音（public/sounds/train.*） */
  trainSound: boolean;
  /** 列車：天気（雨なら雨の景色） */
  trainWeather: TrainWeather;
  /** 列車の予約：出発駅（路線の駅名） */
  trainFrom: string;
  /** 列車の路線と進む向き（1 = 下り、-1 = 上り）。着いた駅から同じ向きに乗り継ぐ */
  trainLine: TrainLine;
  trainDir: 1 | -1;
  /** 航空の予約：出発空港（空港コード） */
  flightFrom: string;
  /** 航空：機内の環境音（ジェットの低い音） */
  flightCabin: boolean;
  /** 予約のダイヤル：刻みと、前に選んだ時間（分） */
  bookingStep: TimeStep;
  bookingMinutes: number;
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
  /** 旅の予定の集中時間（ms）。集中の合計がここに届くと到着（自動で旅を終える）。null は終わりなし */
  journeyTargetMs?: number | null;
  /** 予約した旅（列車・航空） */
  booking?: JourneyBooking | null;
  /** 予約した旅の 1 回の集中の長さ（ms）。ふだんの設定の代わりに使う */
  blockMs?: number | null;
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
  logs: TravelLog[];
}
