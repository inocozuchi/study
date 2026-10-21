import type { ComponentType } from 'react';
import type { JourneyResult } from '@/store/TimerStore';
import type { JourneyBooking, Settings, SubjectIconKey, TimerDesignId, TimeStep } from '@/types';

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
  /** ホームで画面の外側の帯（上＝ステータスバー、下＝ホームバー）を塗る色。シーンの空と地面に合わせる */
  edgeColors?: (hour: number, settings: Settings) => { top: string; bottom: string };
}

