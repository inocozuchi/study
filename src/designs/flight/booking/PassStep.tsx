import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Plane } from 'lucide-react';
import { playSfx } from '@/audio/sfx';
import { cabinSound } from '@/audio/cabinSound';
import { airportByCode, flightNo, type Route } from '../airports';
import { Barcode2D } from '../parts';
import { NOTCH_TOP, PassCard, type PassData } from '../PassCard';
import { Steps } from './RouteStep';
import type { FlightDraft } from './FlightBooking';

type Phase = 'ready' | 'torn' | 'scanning';

/**
 * ③ 搭乗券の発券と搭乗ゲート。
 *  1.「チェックイン」：ミシン目に沿って半券（バーコード）がピリッと斜めに切り離され、少し下に傾いて浮く。機内モードの帯が出る
 *  2.「搭乗」（または半券を下へスワイプ）：バーコードが光ってスキャンされ、ピッ → 電子音 → ポーン。地図の画面へ溶けていく
 */
export function PassStep({ draft, route, onBack, onBoard }: { draft: FlightDraft; route: Route; onBack: () => void; onBoard: () => void }) {
  const [phase, setPhase] = useState<Phase>('ready');
  const busy = useRef(false);
  const from = airportByCode(draft.origin);
  const data: PassData = useMemo(
    () => ({
      from: { code: from.code, name: from.name },
      to: { code: route.airport.code, name: route.airport.name },
      minutes: draft.minutes,
      km: route.km,
      seat: draft.seat ?? '—',
      task: draft.task ?? 'フォーカス',
      icon: draft.icon ?? 'target',
      date: new Date(),
      board: '今',
      flight: flightNo(`${from.code}${route.airport.code}${draft.seat}${new Date().toDateString()}`),
    }),
    [from, route, draft.minutes, draft.seat, draft.task, draft.icon],
  );

  const checkIn = () => {
    if (busy.current || phase !== 'ready') return;
    playSfx('tear');
    navigator.vibrate?.(12);
    cabinSound.prepare();
    setPhase('torn');
    setTimeout(() => playSfx('blip'), 420);
  };
  const board = () => {
    if (busy.current || phase !== 'torn') return;
    busy.current = true;
    setPhase('scanning');
    playSfx('beep');
    playSfx('beep', 0.16);
    playSfx('chime', 0.62);
    setTimeout(onBoard, 1050);
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#050608]">
      {/* ガラスが透けて見えるよう、うしろに色の光をにじませる */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_28%_at_22%_34%,rgba(255,159,10,0.32),transparent),radial-gradient(46%_30%_at_80%_58%,rgba(10,132,255,0.3),transparent),radial-gradient(30%_20%_at_50%_80%,rgba(191,90,242,0.18),transparent)]" />

      <div className="absolute inset-x-0 top-0 z-10 px-4 pt-safe">
        <div className="mt-1 flex items-center justify-between">
          <button onClick={onBack} disabled={phase !== 'ready'} aria-label="戻る" className="fl-btn fl-glass h-11 w-11 disabled:opacity-0">
            <ChevronLeft size={21} />
          </button>
          <div className="text-center">
            <p className="text-[15px] font-semibold">搭乗券</p>
            <Steps at={3} />
          </div>
          <span className="w-11" />
        </div>
        {/* 機内モードの帯 */}
        <AnimatePresence>
          {phase !== 'ready' && (
            <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 28, delay: 0.25 }} className="fl-glass mx-auto mt-3 flex w-fit items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#FF9F0A] text-[#1A1206]">
                <Plane size={13} strokeWidth={2.6} />
              </span>
              <span className="text-[13px] font-semibold">機内モード</span>
              <span className="text-[12px] text-white/55">{phase === 'scanning' ? 'ご搭乗ありがとうございます' : '搭乗の準備ができました'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+126px)] mx-auto w-[min(92vw,360px)]">
        <motion.div initial={{ y: 40, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 24 }}>
          <PassCard
            data={data}
            stub={
              <motion.div
                drag={phase === 'torn' ? 'y' : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={(_, info) => info.offset.y > 50 && board()}
                animate={phase === 'ready' ? { rotate: 0, x: 0, y: 0 } : { rotate: 6, x: 14, y: 30 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                style={{ transformOrigin: '0% 0%' }}
                className={`relative ${phase !== 'ready' ? 'cursor-grab touch-none' : ''}`}
              >
                <div
                  className={`fl-glass relative overflow-hidden rounded-b-[26px] px-5 pb-4 pt-4 ${phase !== 'ready' ? 'fl-torn-top shadow-[0_24px_40px_-18px_rgba(0,0,0,0.9)]' : ''}`}
                  style={phase === 'ready' ? { WebkitMask: NOTCH_TOP, mask: NOTCH_TOP } : undefined}
                >
                  <div className="relative">
                    <Barcode2D seed={data.flight + data.seat} className="h-[72px] w-full" />
                    {phase === 'scanning' && (
                      <motion.span
                        className="pointer-events-none absolute inset-x-[-8px] h-[3px] rounded-full bg-[#FFD60A] shadow-[0_0_14px_4px_rgba(255,214,10,0.75)]"
                        initial={{ top: 0, opacity: 0 }}
                        animate={{ top: ['0%', '100%', '0%'], opacity: [1, 1, 0] }}
                        transition={{ duration: 0.9, ease: 'easeInOut' }}
                      />
                    )}
                  </div>
                  <p className="fl-num mt-2 flex justify-between text-[11px] font-semibold tracking-[0.12em] text-white/55">
                    <span>BOARDING · {data.seat}</span>
                    <span>{data.flight}</span>
                  </p>
                  {phase === 'scanning' && <motion.span className="absolute inset-0 bg-[#FFD60A]/15" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.5, delay: 0.1 }} />}
                </div>
              </motion.div>
            }
          />
        </motion.div>
        <AnimatePresence>
          {phase === 'torn' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.6 }} className="mt-14 text-center text-[12.5px] text-white/50">
              半券を下へスワイプしても搭乗できます
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)]">
        <button onClick={phase === 'ready' ? checkIn : board} disabled={phase === 'scanning'} className="fl-cta h-14 w-full text-[17px]">
          {phase === 'ready' ? 'チェックイン' : phase === 'torn' ? '搭乗' : '搭乗中…'}
        </button>
      </div>
    </div>
  );
}
