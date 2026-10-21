import type { ComponentType, MouseEvent } from 'react';
import type { JourneyResult } from '@/store/TimerStore';
import type { JourneyBooking, Settings, Subject, SubjectIconKey, TimerDesignId, TimeStep, TravelMode } from '@/types';

/**
 * ポモドーロタイマーの「デザイン」（登山・鉄道・飛行機…）の契約。
 * タイマーの状態・記録・音・設定はアプリ共通（store / audio）。デザインは見た目と演出だけを持ち、
 * デザイン同士でコードを共有しない（鉄道は登山の複製ではなく別物として作る）。
 */
export type { TimerDesignId };

export interface DesignSceneProps {
  /** 0..24（空の時間設定を反映済み） */
  hour: number;
  /** 旅の終わり（リザルト表示中） */
  ended: boolean;
  /** 他のタブで覆われている間は描画を止める */
  paused: boolean;
  /** 見せるのに必要な画像のデコードが終わったら 1 回呼ぶ（それまでシーンは隠れている） */
  onReady?: () => void;
}

export interface DesignSessionProps {
  onMusic: () => void;
  /** 長押しなどで旅を終える */
  onEnd: () => void;
}

export interface DesignResultProps {
  result: JourneyResult;
  onContinue: () => void;
}

export interface DesignSetupProps {
  /** 出発時に設定へ保存される下書き */
  draft: Partial<Settings>;
  onChange: (patch: Partial<Settings>) => void;
}

/** 予約が終わって出発するときに渡すもの（HomeScreen が科目を作り、設定を保存し、旅を始める） */
export interface BookingPlan {
  /** 集中すること（科目の名前）と、新しく作るときのアイコン */
  task: string;
  icon: SubjectIconKey;
  step: TimeStep;
  /** 予定の集中時間（分） */
  minutes: number;
  booking: Omit<JourneyBooking, 'bookedAt'>;
  /** あわせて保存する設定（出発地・列車の種別など） */
  settings?: Partial<Settings>;
}

export interface DesignBookingProps {
  open: boolean;
  onClose: () => void;
  /** 出発の儀式（改札・搭乗）が終わったら呼ぶ。呼ぶと旅が始まり、予約画面は閉じる */
  onStart: (plan: BookingPlan) => void;
}

/** ルートの画面（科目ごとの道のり）の絵 */
export interface RouteArtProps {
  subject: Subject;
  /** 0..1（登頂・完乗・到着で 1） */
  progress: number;
  summited: boolean;
  className?: string;
}

/** 道のりの途中の印（駅・空港）。at は道のりの割合 0..1 */
export interface RouteStop {
  name: string;
  at: number;
}

/**
 * ルートの画面をこのモードの見た目にする（登山＝山岳ルート、列車＝路線図、航空＝航路図）。
 * 科目ごとの累計の集中が、このモードの道のりの上の現在地になる。ないモードは山岳ルート。
 */
export interface DesignRoutes {
  /** 見出し（路線図・航路図） */
  title: string;
  /** 「3 路線 · 完乗 1」の数え方と、終わりの言葉（完乗・到着） */
  unit: string;
  doneWord: string;
  /** 一覧・記録の切り替えの名前 */
  tabs: [string, string];
  /** 道のりの名前（東海道本線 · 東京 → 大阪 など） */
  lineName: string;
  Art: ComponentType<RouteArtProps>;
  /** 途中の印 */
  stops: RouteStop[];
  /** 進んだ距離の表記（例：231.5 / 556.4 粁） */
  distance: (progress: number) => string;
  /** 記録帳に出す旅のモード（ログブック） */
  logMode: TravelMode;
  /** 「この路線を次の旅に選ぶ」 */
  chooseLabel: string;
}

/** プロフィールのカード（登山者 ID カード・きっぷ・搭乗券）に出す値。ニックネームと目標はモード共通 */
export interface ProfileInfo {
  name: string;
  goal: string;
  departure: string;
  /** これまでの集中の合計（分） */
  totalMinutes: number;
  /** 記録した回数 */
  sessions: number;
  /** はじめて記録した日（epoch ms）。記録がなければ null */
  since: number | null;
  settings: Settings;
}

export interface ProfileCardProps {
  info: ProfileInfo;
}

export interface TimerDesign {
  id: TimerDesignId;
  name: string;
  /** いつも背景にあるシーン（ホームでも集中中でも） */
  Scene: ComponentType<DesignSceneProps>;
  /** 集中・休憩中の全画面 UI */
  Session: ComponentType<DesignSessionProps>;
  /** 旅の終わりの画面 */
  Result: ComponentType<DesignResultProps>;
  /** 支度シートに差し込む、このデザイン固有の設定（任意） */
  SetupOptions?: ComponentType<DesignSetupProps>;
  /**
   * 予約の画面（任意）。あれば「集中」で支度シートの代わりに開く（列車・航空）。
   * 時間と行き先 → 座席（集中すること）→ きっぷ・搭乗券と出発の儀式、の 3 ステップ。
   */
  Booking?: ComponentType<DesignBookingProps>;
  /** 支度シートでの見出し */
  setupLabel?: string;
  /** モードの説明（切り替えの一覧に出す） */
  tagline: string;
  /** プロフィールのカード */
  ProfileCard: ComponentType<ProfileCardProps>;
  /** プロフィールに差し込む、このモード固有のカスタマイズ（登山：服・テント） */
  ProfileOptions?: ComponentType<DesignSetupProps>;
  /** ルートの画面（任意。ないモードは山岳ルート） */
  routes?: DesignRoutes;
  /** ホームで画面の外側の帯（上＝ステータスバー、下＝ホームバー）を塗る色。シーンの空と地面に合わせる */
  edgeColors?: (hour: number, settings: Settings) => { top: string; bottom: string };
  /** シーンの画像を読み込んでいる間の地の色（落ち着いた暗い色。シーンはそのあとフェードインする） */
  skeleton?: string;
  /** ホームの部品の着せ替え（上のボタン・ツールの縦タブ・バッジ・タブバー・「集中」ボタン）。モードの世界観に合わせる */
  home: HomeSkin;
}

/**
 * ホームの着せ替え。寸法（42px のボタン・タブバーの形）はアプリ共通で、色と質感だけをモードが決める。
 * クラスは各デザインの CSS（mt- / tr- / fl-）に置く。
 */
export interface HomeSkin {
  /** 丸いボタン・モードのピル・ツールの縦タブ・記録のバッジの面 */
  chip: string;
  /** 挨拶の文字 */
  greeting: string;
  /** ホームにいる間のタブバー：バー・選択のピル・選択中 / ほかのアイコンの色 */
  tabbar: { bar: string; pill: string; on: string; off: string };
  /** 「集中」ボタン（直径 80px。呼吸する光や輪もここで描く）。押すと光が広がる色が bloom */
  Focus: ComponentType<{ onClick: (e: MouseEvent<HTMLButtonElement>) => void }>;
  bloom: string;
}

