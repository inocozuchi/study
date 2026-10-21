import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { easeIOS, springSheet } from '@/lib/motion';
import { usePresentDepth } from '@/lib/depth';
import { useApp } from '@/store/AppStore';
import { useHoldScene } from '@/lib/sceneHold';
import { airportByCode, nearestRoute, routesFrom, type Route } from '../airports';
import { RouteStep } from './RouteStep';
import { SeatStep } from './SeatStep';
import { PassStep } from './PassStep';
import type { DesignBookingProps } from '../../types';
import type { SubjectIconKey, TimeStep } from '@/types';

/** 予約の下書き（3 つのステップで共有） */
export interface FlightDraft {
  origin: string;
  step: TimeStep;
  minutes: number;
  /** カード・検索で選んだ行き先。null ならダイヤルの時間にいちばん近い空港 */
  dest: string | null;
  seat: string | null;
  task: string | null;
  icon: SubjectIconKey | null;
}

export const DIAL = {
  pomodoro: { min: 25, max: 250, step: 25 },
  free: { min: 5, max: 240, step: 5 },
} as const;

export const snapTo = (m: number, step: TimeStep) => {
  const d = DIAL[step];
  return Math.min(d.max, Math.max(d.min, Math.round(m / d.step) * d.step));
};

/**
 * 航空モードの予約：① フライト予約（地図とダイヤル）→ ② 座席指定（集中すること）→ ③ 搭乗券と搭乗ゲート。
 * 画面いっぱいの漆黒の上に重ねる（タブバーより上）。搭乗が終わると onStart で旅が始まり、この画面は溶けて地図へ。
 */
export function FlightBooking({ open, onClose, onStart }: DesignBookingProps) {
  const { settings } = useApp();
  const [page, setPage] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<FlightDraft>(() => fresh());
  useHoldScene(open);
  usePresentDepth(open);

  function fresh(): FlightDraft {
    const step = settings.bookingStep ?? 'pomodoro';
    return { origin: settings.flightFrom || 'HND', step, minutes: snapTo(settings.bookingMinutes || 50, step), dest: null, seat: null, task: null, icon: null };
  }

  useEffect(() => {
    if (!open) return;
    setPage(1);
    setDraft(fresh());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const routes = useMemo(() => routesFrom(draft.origin), [draft.origin]);
  const route: Route = (draft.dest && routes.find((r) => r.airport.code === draft.dest)) || nearestRoute(routes, draft.minutes);
  const patch = (p: Partial<FlightDraft>) => setDraft((d) => ({ ...d, ...p }));

  const board = () => {
    const from = airportByCode(draft.origin);
    onStart({
      task: draft.task ?? 'フォーカス',
      icon: draft.icon ?? 'target',
      step: draft.step,
      minutes: draft.minutes,
      booking: { mode: 'flight', from: from.code, fromName: from.name, to: route.airport.code, toName: route.airport.name, minutes: draft.minutes, km: route.km, seat: draft.seat ?? '1A', task: draft.task ?? 'フォーカス', step: draft.step },
      settings: { flightFrom: draft.origin },
    });
  };

  // body の直下に出す（後ろのアプリが奥へ引っ込む transform の影響を受けないように）
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="flight-booking"
          className="fl-root fixed inset-x-0 top-0 z-[70] h-app overflow-hidden bg-[#050608]"
          // 「集中」ボタンから広がるように、下から少し小さくふわっと現れる（バネ）
          initial={{ opacity: 0, scale: 0.92, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { ...springSheet, opacity: { duration: 0.3, ease: easeIOS } } }}
          style={{ willChange: 'transform, opacity' }}
          // 搭乗したら、搭乗券ごと少し大きくなりながら溶けて、下の地図（フライト中の画面）が現れる
          exit={{ opacity: 0, scale: 1.06, transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] } }}
        >
          <div className="absolute inset-0 isolate">
            <RouteStep draft={draft} routes={routes} route={route} patch={patch} onClose={onClose} onNext={() => setPage(2)} />
          </div>
          <AnimatePresence>
            {page >= 2 && (
              <motion.div key="seat" className="absolute inset-0 isolate z-10" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 32 }}>
                <SeatStep draft={draft} route={route} patch={patch} onBack={() => setPage(1)} onNext={() => setPage(3)} />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {page === 3 && (
              <motion.div key="pass" className="absolute inset-0 isolate z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                <PassStep draft={draft} route={route} onBack={() => setPage(2)} onBoard={board} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
