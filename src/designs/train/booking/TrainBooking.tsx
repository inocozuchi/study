import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/store/AppStore';
import { useHoldScene } from '@/lib/sceneHold';
import { nearestStop, stationByName, stopsFrom, type Stop } from './line';
import { LineStep } from './LineStep';
import { CarStep } from './CarStep';
import { TicketStep } from './TicketStep';
import type { DesignBookingProps } from '../../types';
import type { Settings, SubjectIconKey, TimeStep, TrainClass } from '@/types';

export interface TrainDraft {
  origin: string;
  step: TimeStep;
  minutes: number;
  /** 地図の駅を押して選んだ行き先。null ならダイヤルの時間にいちばん近い駅 */
  dest: string | null;
  cls: TrainClass;
  seat: string | null;
  task: string | null;
  icon: SubjectIconKey | null;
  /** 旅の支度（天気・時間帯・走行音） */
  options: Pick<Settings, 'trainWeather' | 'sky' | 'trainSound'>;
}

export const DIAL = {
  pomodoro: { min: 25, max: 250, step: 25 },
  free: { min: 5, max: 250, step: 5 },
} as const;

export const snapTo = (m: number, step: TimeStep) => {
  const d = DIAL[step];
  return Math.min(d.max, Math.max(d.min, Math.round(m / d.step) * d.step));
};

/**
 * 列車モードの予約（大正・昭和レトロ）：① 路線図とダイヤルで行き先 → ② 客車の座席（集中すること）→ ③ 硬券と改札。
 * 改札鋏が入ると発車ベルと汽笛が鳴り、車窓へズームインして旅が始まる。
 */
export function TrainBooking({ open, onClose, onStart }: DesignBookingProps) {
  const { settings } = useApp();
  const [page, setPage] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<TrainDraft>(() => fresh());
  useHoldScene(open);

  function fresh(): TrainDraft {
    const step = settings.bookingStep ?? 'pomodoro';
    return {
      origin: settings.trainFrom || '東京',
      step,
      minutes: snapTo(settings.bookingMinutes || 50, step),
      dest: null,
      cls: settings.trainClass,
      seat: null,
      task: null,
      icon: null,
      options: { trainWeather: settings.trainWeather, sky: settings.sky, trainSound: settings.trainSound },
    };
  }

  useEffect(() => {
    if (!open) return;
    setPage(1);
    setDraft(fresh());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const stops = useMemo(() => stopsFrom(draft.origin), [draft.origin]);
  const stop: Stop = (draft.dest && stops.find((s) => s.station.name === draft.dest)) || nearestStop(stops, draft.minutes);
  const patch = (p: Partial<TrainDraft>) => setDraft((d) => ({ ...d, ...p }));

  const depart = () => {
    const from = stationByName(draft.origin);
    onStart({
      task: draft.task ?? 'フォーカス',
      icon: draft.icon ?? 'target',
      step: draft.step,
      minutes: draft.minutes,
      booking: { mode: 'train', from: from.name, fromName: from.name, to: stop.station.name, toName: stop.station.name, minutes: draft.minutes, km: stop.km, seat: draft.seat ?? '1番A席', task: draft.task ?? 'フォーカス', step: draft.step },
      settings: { trainFrom: draft.origin, trainClass: draft.cls, ...draft.options },
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="train-booking"
          className="tr-wood fixed inset-x-0 top-0 z-[70] h-app overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.35 } }}
          // 改札を通ったら、車窓へ吸い込まれるようにズームイン
          // （動く全画面に filter はかけない：iPhone で重い）
          exit={{ opacity: 0, scale: 1.7, transition: { duration: 0.9, ease: [0.5, 0, 0.75, 0] } }}
        >
          <div className="absolute inset-0 isolate">
            <LineStep draft={draft} stops={stops} stop={stop} patch={patch} onClose={onClose} onNext={() => setPage(2)} />
          </div>
          <AnimatePresence>
            {page >= 2 && (
              <motion.div key="car" className="absolute inset-0 isolate z-10" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 240, damping: 32 }}>
                <CarStep draft={draft} stop={stop} patch={patch} onBack={() => setPage(1)} onNext={() => setPage(3)} />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {page === 3 && (
              <motion.div key="ticket" className="absolute inset-0 isolate z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                <TicketStep draft={draft} stop={stop} onBack={() => setPage(2)} onDepart={depart} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
