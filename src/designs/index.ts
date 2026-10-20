import { mountainDesign } from './mountain';
import { trainDesign } from './train';
import { flightMode } from './flight';
import type { TravelMode } from '@/types';
import type { ComingSoonMode, TimerDesign, TimerDesignId } from './types';

/** 実装済みのタイマーデザイン（旅のモード） */
export const TIMER_DESIGNS: Record<TimerDesignId, TimerDesign> = {
  mountain: mountainDesign,
  train: trainDesign,
};

export function getDesign(id: TimerDesignId | undefined): TimerDesign {
  return (id && TIMER_DESIGNS[id]) || mountainDesign;
}

/** モードの切り替えに並べる順（航空は準備中） */
export const TRAVEL_MODES: { id: TravelMode; mode: TimerDesign | ComingSoonMode; available: boolean; emoji: string }[] = [
  { id: 'mountain', mode: mountainDesign, available: true, emoji: '⛰️' },
  { id: 'train', mode: trainDesign, available: true, emoji: '🚃' },
  { id: 'flight', mode: flightMode, available: false, emoji: '✈️' },
];

export type { ComingSoonMode, ProfileInfo, TimerDesign, TimerDesignId } from './types';
