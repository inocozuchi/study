import './mountain.css';
import { MountainScene } from './MountainScene';
import { MountainSession } from './MountainSession';
import { MountainResult } from './MountainResult';
import { SeasonPicker } from './SeasonPicker';
import type { TimerDesign } from '../types';

/**
 * 登山デザイン：集中は山を登る旅、休憩は焚き火、終わりはキャンプの夜。
 * クレヨン × 布の見た目はこのフォルダの中だけで完結させる。
 */
export const mountainDesign: TimerDesign = {
  id: 'mountain',
  name: '登山',
  Scene: MountainScene,
  Session: MountainSession,
  Result: MountainResult,
  SetupOptions: SeasonPicker,
  setupLabel: 'シーズン',
};
