import './train.css';
import { TrainScene } from './TrainScene';
import { TrainSession } from './TrainSession';
import { TrainResult } from './TrainResult';
import { ClassPicker } from './ClassPicker';
import { Ticket } from './Ticket';
import { WALL_BOTTOM, WALL_TOP } from './scene/Interior';
import type { TimerDesign } from '../types';

/**
 * 列車デザイン：集中は国鉄の客車でゆく旅。休憩は途中の駅、一時停止は信号場、終わりは終着駅。
 * 窓の外の 5 層の視差と窓枠はこのフォルダの中だけで完結させる（登山のコードは使わない）。
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
  edgeColors: () => ({ top: WALL_TOP, bottom: WALL_BOTTOM }),
};
