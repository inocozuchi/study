import './train.css';
import { TrainScene } from './TrainScene';
import { TrainSession } from './TrainSession';
import { TrainResult } from './TrainResult';
import { ClassPicker } from './ClassPicker';
import { Ticket } from './Ticket';
import { assets, isNight } from './scene/views';
import type { TimerDesign } from '../types';

/**
 * 列車デザイン：集中は国鉄の客車でゆく旅。休憩は途中の駅、一時停止は信号場、終わりは終着駅。
 * 車窓はアニメ美術の画像（public/train）を重ねた視差スクロール。このフォルダの中だけで完結させる（登山のコードは使わない）。
 */
export const trainDesign: TimerDesign = {
  id: 'train',
  name: '列車',
  tagline: '集中は車窓の旅。休憩は途中の駅、終わりは目標の駅',
  ProfileCard: Ticket,
  Scene: TrainScene,
  Session: TrainSession,
  Result: TrainResult,
  SetupOptions: ClassPicker,
  setupLabel: '列車',
  // 画面の外の帯は車内の絵の上端・下端の色（夜は暗く）
  edgeColors: (hour) => (isNight(hour) ? { top: '#15130F', bottom: '#110E0D' } : { top: assets.frame.edge.top, bottom: assets.frame.edge.bottom }),
};
