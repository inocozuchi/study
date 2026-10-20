import { useApp } from '@/store/AppStore';
import { useTimer } from '@/store/TimerStore';
import { TrainStage } from './scene/TrainStage';
import type { DesignSceneProps } from '../types';

/** 列車デザインの背景：タイマーの状態 → 走る（加速・巡航）/ 止まる（休憩・一時停止・旅の終わり）。景色は時間帯と天気で選ぶ */
export function TrainScene({ hour, ended, paused }: DesignSceneProps) {
  const { settings } = useApp();
  const { timer } = useTimer();
  const journeying = timer.phase !== 'idle' || !!timer.journeyStartedAt;
  const moving = !ended && timer.phase === 'focus' && timer.running;
  return (
    <TrainStage
      hour={ended ? 21.6 : hour}
      moving={moving}
      express={settings.trainClass === 'express'}
      rain={settings.trainWeather === 'rain'}
      paused={paused}
      sound={settings.trainSound && journeying && !ended}
    />
  );
}
