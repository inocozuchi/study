import { mountainDesign } from './mountain';
import type { TimerDesign, TimerDesignId } from './types';

/** 実装済みのタイマーデザイン。鉄道・飛行機はここに追加する */
export const TIMER_DESIGNS: Record<TimerDesignId, TimerDesign> = {
  mountain: mountainDesign,
};

export function getDesign(id: TimerDesignId | undefined): TimerDesign {
  return (id && TIMER_DESIGNS[id]) || mountainDesign;
}

export type { TimerDesign, TimerDesignId } from './types';
