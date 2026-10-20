import { BoardingPass } from './BoardingPass';
import type { ComingSoonMode } from '../types';

/**
 * 航空モード（準備中）。今は搭乗券のカードだけ。タイマーのデザインとしてはまだ選べない。
 * 実装するときは TimerDesign にして designs/index.ts の TIMER_DESIGNS へ移す。
 */
export const flightMode: ComingSoonMode = {
  id: 'flight',
  name: '航空',
  tagline: '集中は空の旅。目的地までまっすぐ飛ぶ',
  ProfileCard: BoardingPass,
};
