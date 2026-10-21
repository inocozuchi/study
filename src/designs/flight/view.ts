import { useSyncExternalStore } from 'react';
import { motionValue } from 'framer-motion';
import type { Camera } from './FlightMap';

/**
 * 背景のシーン（地図）と、上に重なるフライト中の HUD が共有する表示の状態。
 * カメラは MotionValue（HUD の指の操作で地図だけが動き、React は描き直さない）。
 */
export const flightCam: Camera = { cx: motionValue(1500), cy: motionValue(800), zoom: motionValue(0.45) };

export type CameraMode = 'route' | 'plane' | 'free';

export interface FlightView {
  /** ルート全体 / 機体を追う / 指で動かした */
  camera: CameraMode;
  layer: 'dark' | 'lines';
  /** 大きな時計の表示 */
  clock: boolean;
  /** 窓の外の景色 */
  window: boolean;
}

let view: FlightView = { camera: 'route', layer: 'dark', clock: false, window: false };
const listeners = new Set<() => void>();

export function setFlightView(patch: Partial<FlightView>) {
  view = { ...view, ...patch };
  listeners.forEach((l) => l());
}

export function useFlightView() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => view,
  );
}
