import { mountainDesign } from './mountain';
import { trainDesign } from './train';
import { flightMode } from './flight';
import type { ComponentType } from 'react';
import { MountainPicto, PlanePicto, TrainPicto, type PictoProps } from '@/components/icons/Pictograms';
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
export const TRAVEL_MODES: { id: TravelMode; mode: TimerDesign | ComingSoonMode; available: boolean; Icon: ComponentType<PictoProps> }[] = [
  { id: 'mountain', mode: mountainDesign, available: true, Icon: MountainPicto },
  { id: 'train', mode: trainDesign, available: true, Icon: TrainPicto },
  { id: 'flight', mode: flightMode, available: false, Icon: PlanePicto },
];

export type { ComingSoonMode, ProfileInfo, TimerDesign, TimerDesignId } from './types';
