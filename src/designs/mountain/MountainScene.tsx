import { useApp } from '@/store/AppStore';
import { useTimer } from '@/store/TimerStore';
import { routeProgress, stageFor } from '@/lib/altitude';
import { MIN } from '@/lib/time';
import { CrayonDefs } from './CrayonDefs';
import { TrailStage, type TravelerMood } from './scene/TrailStage';
import type { DesignSceneProps } from '../types';

/** 登山デザインの背景：タイマーの状態をハイカーの気分（歩く・立つ・座る・眠る）に変換して描く */
export function MountainScene({ hour, ended, paused }: DesignSceneProps) {
  const { settings, subjectById, minutesBySubject } = useApp();
  const { timer, elapsedMs } = useTimer();
  const subject = subjectById(timer.subjectId ?? settings.selectedSubjectId);
  const live = (subject ? minutesBySubject[subject.id] ?? 0 : 0) + (timer.phase === 'focus' ? elapsedMs / MIN : 0);
  const stage = subject ? (subject.summitedAt ? 4 : stageFor(routeProgress(subject, live)).index) : 0;
  const mood: TravelerMood = ended ? 'sleep' : timer.phase === 'break' ? 'rest' : timer.phase === 'focus' && timer.running ? 'walk' : 'stand';
  return (
    <>
      <CrayonDefs />
      <TrailStage hour={ended ? 21.6 : hour} stage={stage} mood={mood} season={settings.season} paused={paused} />
    </>
  );
}
