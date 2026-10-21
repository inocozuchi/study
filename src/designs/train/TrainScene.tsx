import { useRef } from 'react';
import { useApp } from '@/store/AppStore';
import { useTimer } from '@/store/TimerStore';
import { MIN } from '@/lib/time';
import { TrainStage, type StationSign } from './scene/TrainStage';
import { stopFor, type StopInfo } from './stations';
import { STATIONS } from './booking/line';
import type { ActiveTimer, JourneyBooking } from '@/types';
import type { DesignSceneProps } from '../types';

/** 止まる場所 → 駅名標の文字（東海道本線の駅はかな、ほかの駅はローマ字を小さく） */
const toSign = (st: StopInfo): StationSign => ({
  name: st.name,
  reading: STATIONS.find((s) => s.name === st.name)?.kana ?? st.roman,
  prev: st.prev,
  next: st.next,
});

/**
 * 列車デザインの背景：タイマーの状態 → 走る（加速・巡航）/ 止まる（休憩・一時停止・旅の終わり）。景色は時間帯と天気で選ぶ。
 * 駅に止まるのは、出発前（出発駅）・休憩（途中の駅）・旅の終わり（行き先）。一時停止は信号場なので駅には入らない。
 * 集中の 1 回が終わる少し前からブレーキをかけ、終わる瞬間に次の駅のホームの真ん中で止まる。
 */
export function TrainScene({ hour, ended, paused }: DesignSceneProps) {
  const { settings } = useApp();
  const t = useTimer();
  const { timer } = t;
  const journeying = timer.phase !== 'idle' || !!timer.journeyStartedAt;
  const moving = !ended && timer.phase === 'focus' && timer.running;

  // 旅が終わるとタイマーから予約が消えるので、終着駅を出すために最後の予約と集中の分を覚えておく
  const last = useRef<{ booking: JourneyBooking | null; focusMin: number }>({ booking: timer.booking ?? null, focusMin: 0 });
  if (journeying) last.current = { booking: timer.booking ?? null, focusMin: t.journeyFocusMs / MIN };

  let station: StationSign | null = null;
  let approach: { inMs: number; sign: StationSign } | null = null;
  // 到着した直後（リザルトが出るまでの一瞬）も終着駅のまま
  if (ended || t.arrival) {
    const at: ActiveTimer = { ...timer, booking: last.current.booking };
    station = toSign(stopFor(at, settings, true, last.current.focusMin));
  } else if (!journeying || timer.phase === 'break' || timer.phase === 'idle') {
    station = toSign(stopFor(timer, settings, false, t.journeyFocusMs / MIN));
  } else if (moving && t.remainingMs != null) {
    // 次に止まる駅：この 1 回で予約の時間に届くなら終着、そうでなければ休憩の駅
    const endMin = (t.journeyFocusMs + t.remainingMs) / MIN;
    const arriving = t.journeyRemainingMs != null && t.journeyRemainingMs <= t.remainingMs + 500;
    const next = arriving ? stopFor(timer, settings, true, endMin) : stopFor({ ...timer, phase: 'break', cycle: timer.cycle + 1 }, settings, false, endMin);
    approach = { inMs: t.remainingMs, sign: toSign(next) };
  }

  return (
    <TrainStage
      hour={ended ? 21.6 : hour}
      moving={moving}
      express={settings.trainClass === 'express'}
      rain={settings.trainWeather === 'rain'}
      paused={paused}
      sound={settings.trainSound && journeying && !ended}
      station={station}
      approach={approach}
    />
  );
}
