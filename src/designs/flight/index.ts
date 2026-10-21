import './flight.css';
import { BoardingPass } from './BoardingPass';
import { FlightFocus } from './HomeFocus';
import { FlightBooking } from './booking/FlightBooking';
import { FlightScene } from './FlightScene';
import { FlightSession } from './FlightSession';
import { FlightResult } from './FlightResult';
import { flightRoutes } from './routes';
import type { TimerDesign } from '../types';

/**
 * 航空デザイン：集中はナイトフライト。漆黒の地に Liquid Glass（すりガラス）、計器のアンバーとレーダーイエロー。
 * 予約（航路と時間 → 座席＝集中すること → 搭乗券と搭乗ゲート）から始まり、夜の地図の上を機体が進む。
 * このフォルダの中だけで完結させる（ほかのデザインのコードは使わない）。
 */
export const flightDesign: TimerDesign = {
  id: 'flight',
  name: '航空',
  tagline: '集中はナイトフライト。予約して搭乗し、目的地まで飛ぶ',
  ProfileCard: BoardingPass,
  Scene: FlightScene,
  Session: FlightSession,
  Result: FlightResult,
  Booking: FlightBooking,
  routes: flightRoutes,
  edgeColors: () => ({ top: '#050608', bottom: '#050608' }),
  skeleton: '#050608',
  home: {
    chip: 'fl-chip',
    greeting: 'text-[#F5F6F8] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]',
    tabbar: { bar: 'fl-tabbar', pill: 'fl-tabbar-pill', on: 'text-[#1A1206]', off: 'text-white/60' },
    Focus: FlightFocus,
    bloom: 'rgba(255,159,10,0.75)',
  },
};
