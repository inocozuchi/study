import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { playSfx } from '@/audio/sfx';
import { fare, type Stop } from './line';
import { HardTicket, type HardTicketData } from './HardTicket';
import { Steps } from './LineStep';
import type { TrainDraft } from './TrainBooking';

type Phase = 'ready' | 'insert' | 'punch' | 'out' | 'bell';

/** 切符の上端から改札口（差し込み口）までの距離・差し込んだときに見えている高さ（px） */
const GATE_TOP = 400;
const TICKET_TOP = 170;
const VISIBLE = 70;

function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * ③ 硬券の発券と改札。
 * 「改札を通る」（または切符を下へスワイプ）→ 切符が改札口へ差し込まれ、真鍮の改札鋏がパチン！と入る →
 * 切符が戻ってくると上の縁に切り欠き（入鋏痕）→ 発車ベル → 汽笛 → 車窓へズームイン。
 */
export function TicketStep({ draft, stop, onBack, onDepart }: { draft: TrainDraft; stop: Stop; onBack: () => void; onDepart: () => void }) {
  const [phase, setPhase] = useState<Phase>('ready');
  const busy = useRef(false);
  const express = draft.cls === 'express';
  const data: HardTicketData = useMemo(
    () => ({
      from: draft.origin,
      to: stop.station.name,
      km: stop.km,
      minutes: draft.minutes,
      seat: draft.seat ?? '—',
      task: draft.task ?? 'フォーカス',
      icon: draft.icon ?? 'target',
      express,
      fare: fare(stop.km, express),
      date: new Date(),
      serial: String(hash(`${draft.origin}${stop.station.name}${draft.seat}${new Date().toDateString()}`) % 10000).padStart(4, '0'),
    }),
    [draft.origin, draft.minutes, draft.seat, draft.task, draft.icon, stop, express],
  );

  const pass = () => {
    if (busy.current) return;
    busy.current = true;
    setPhase('insert');
    const at = (ms: number, fn: () => void) => setTimeout(fn, ms);
    at(480, () => setPhase('punch'));
    at(620, () => {
      playSfx('punch');
      navigator.vibrate?.(18);
    });
    at(980, () => setPhase('out'));
    at(1250, () => {
      setPhase('bell');
      playSfx('bell');
    });
    at(2950, () => playSfx('whistle'));
    at(3450, onDepart);
  };

  const inserted = phase === 'insert' || phase === 'punch';
  const punched = phase === 'out' || phase === 'bell';
  const insertY = GATE_TOP - VISIBLE - TICKET_TOP;

  return (
    <div className="tr-wood tr-mincho absolute inset-0 overflow-hidden">
      {/* ランプの明かり */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_30%_at_50%_18%,rgba(255,196,120,0.28),transparent_70%)]" />

      <div className="absolute inset-x-0 top-0 z-30 px-4 pt-safe">
        <div className="mt-1 flex items-center justify-between">
          <button onClick={onBack} disabled={phase !== 'ready'} aria-label="戻る" className="tr-brass grid h-11 w-11 place-items-center rounded-full active:scale-95 disabled:opacity-0">
            <ChevronLeft size={21} />
          </button>
          <div className="text-center">
            <p className="text-[17px] font-bold tracking-[0.2em] text-[#F6ECD2]">{phase === 'ready' ? '乗車券' : phase === 'bell' ? '発車いたします' : '改札'}</p>
            <Steps at={3} />
          </div>
          <span className="w-11" />
        </div>
      </div>

      {/* 硬券 */}
      <motion.div
        className="absolute inset-x-0 z-10 mx-auto w-[min(90vw,350px)]"
        style={{ top: `calc(var(--safe-top) + ${TICKET_TOP}px)` }}
        initial={{ y: -30, opacity: 0, rotate: -3 }}
        animate={inserted ? { y: insertY, opacity: 1, rotate: 0 } : phase === 'ready' ? { y: 0, opacity: 1, rotate: -1.5 } : { y: -6, opacity: 1, rotate: 1.5 }}
        transition={inserted ? { duration: 0.42, ease: [0.5, 0, 0.75, 0] } : { type: 'spring', stiffness: 200, damping: 18 }}
        drag={phase === 'ready' ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.5 }}
        onDragEnd={(_, info) => info.offset.y > 60 && pass()}
      >
        <HardTicket data={data} punched={punched} />
      </motion.div>

      {/* 改札鋏（真鍮）：切符の上の縁で噛む */}
      <AnimatePresence>
        {phase === 'punch' && (
          <motion.div
            className="absolute z-30"
            style={{ top: `calc(var(--safe-top) + ${GATE_TOP - VISIBLE - 14}px)`, left: 'calc(50% + min(45vw, 175px) * 0.47 - 18px)' }}
            initial={{ x: 60, y: -30, opacity: 0, rotate: 30 }}
            animate={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            exit={{ x: 50, y: -40, opacity: 0, rotate: 25 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          >
            <Punch />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 改札口：木の囲いと真鍮の差し込み口。切符はこの奥へ入る */}
      <div className="absolute inset-x-0 bottom-0 z-20" style={{ top: `calc(var(--safe-top) + ${GATE_TOP}px)` }}>
        <div className="mx-auto h-full w-[min(96vw,380px)] rounded-t-[10px]" style={{ background: 'linear-gradient(180deg,#6b4628,#4a2e1c 40%,#3b2416)', boxShadow: 'inset 0 2px 0 rgba(255,220,170,0.25), 0 -12px 24px -10px rgba(0,0,0,0.7)' }}>
          <div className="tr-brass mx-auto -mt-[7px] flex h-[16px] w-[86%] items-center justify-center rounded-[4px] px-2">
            <span className="h-[5px] w-full rounded-full bg-[#1a0f08] shadow-[inset_0_2px_3px_rgba(0,0,0,0.9)]" />
          </div>
          <div className="mx-auto mt-5 w-fit rounded-[4px] border-2 border-[#C9A86A] bg-[#F1E3C4] px-4 py-1 text-[18px] font-bold tracking-[0.5em] text-[#4A2E1C] shadow-[0_6px_12px_-6px_rgba(0,0,0,0.7)]" aria-label="改札口">
            口札改
          </div>
          <div className="absolute inset-x-0 bottom-0 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)]">
            <AnimatePresence mode="popLayout">
              {phase === 'ready' ? (
                <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-2 text-center text-[12.5px] text-[#F6ECD2]/60">
                  切符を下へスワイプしても通れます
                </motion.p>
              ) : (
                <motion.p key="bell" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-2 text-center text-[13px] font-bold tracking-[0.2em] text-[#E9CF94]">
                  {phase === 'bell' ? `${data.to}ゆき、まもなく発車いたします` : 'パチン'}
                </motion.p>
              )}
            </AnimatePresence>
            <button onClick={pass} disabled={phase !== 'ready'} className="tr-enji h-14 w-full rounded-[12px] text-[18px] font-bold tracking-[0.3em] active:scale-[0.98]">
              改札を通る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 改札鋏：真鍮の鋏。開いた刃がパチンと閉じる */
function Punch() {
  return (
    <svg width="74" height="84" viewBox="0 0 74 84" aria-hidden className="drop-shadow-[0_8px_10px_rgba(0,0,0,0.6)]">
      <defs>
        <linearGradient id="tr-brass-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2DA9E" />
          <stop offset="0.5" stopColor="#C19A5F" />
          <stop offset="1" stopColor="#7E5C2E" />
        </linearGradient>
      </defs>
      <motion.g style={{ originX: '20px', originY: '44px' }} initial={{ rotate: -16 }} animate={{ rotate: 0 }} transition={{ delay: 0.12, duration: 0.06 }}>
        <path d="M8 6 L30 6 L30 22 L22 30 L22 44 L16 44 L16 30 L8 22 Z" fill="url(#tr-brass-g)" stroke="#5E431F" strokeWidth="1.2" />
        <path d="M22 44 L30 80 L22 82 L14 46 Z" fill="#3B2614" />
      </motion.g>
      <motion.g style={{ originX: '20px', originY: '44px' }} initial={{ rotate: 16 }} animate={{ rotate: 0 }} transition={{ delay: 0.12, duration: 0.06 }}>
        <path d="M8 6 L30 6 L30 12 L8 12 Z" transform="translate(0 0)" fill="#E9CF94" stroke="#5E431F" strokeWidth="1" />
        <path d="M16 44 L4 78 L12 82 L24 46 Z" fill="#4A2E1C" />
      </motion.g>
      <circle cx="20" cy="44" r="4" fill="#E9CF94" stroke="#5E431F" />
    </svg>
  );
}
