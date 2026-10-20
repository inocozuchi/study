import { useMemo } from 'react';
import { useApp } from '@/store/AppStore';
import { useTimer } from '@/store/TimerStore';
import { TrainStage } from './scene/TrainStage';
import { stopFor } from './stations';
import type { DesignSceneProps } from '../types';

/** 列車デザインの背景：タイマーの状態 → 走る / 駅に止まる / 信号場で待つ / 終着駅 */
export function TrainScene({ hour, ended, paused }: DesignSceneProps) {
  const { settings } = useApp();
  const { timer } = useTimer();
  const journeying = timer.phase !== 'idle' || !!timer.journeyStartedAt;
  const moving = !ended && timer.phase === 'focus' && timer.running;
  const stop = stopFor(timer, settings, ended);
  const stopKey = `${stop.kind}|${stop.name}|${stop.prev}|${stop.next}`;
  const stable = useMemo(() => stop, [stopKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <TrainStage
      hour={ended ? 21.6 : hour}
      moving={moving}
      express={settings.trainClass === 'express'}
      stop={stable}
      paused={paused}
      sound={settings.trainSound && journeying && !ended}
    />
  );
}
