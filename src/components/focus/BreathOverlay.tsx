import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const INHALE = 4;
const EXHALE = 4;

/** 集中開始直後：同心円が呼吸するように広がり、縮む */
export function BreathOverlay({ open, onDone }: { open: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (!open) return;
    setPhase('in');
    const a = setTimeout(() => setPhase('out'), INHALE * 1000);
    const b = setTimeout(onDone, (INHALE + EXHALE) * 1000 + 300);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [open, onDone]);

  return (
    <AnimatePresence>
      {open && (
        <motion.button
          key="breath"
          aria-label="深呼吸をスキップ"
          onClick={onDone}
          className="fixed inset-0 z-50 grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
          style={{ background: 'radial-gradient(circle at 50% 45%, rgba(23,37,61,0.35), rgba(23,37,61,0.78))', backdropFilter: 'blur(2px)' }}
        >
          <div className="relative grid h-[78vmin] w-[78vmin] max-h-[420px] max-w-[420px] place-items-center">
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  inset: `${i * 11}%`,
                  border: `${2.6 - i * 0.4}px solid rgba(255,244,222,${0.75 - i * 0.14})`,
                  background: i === 3 ? 'rgba(255,244,222,0.14)' : 'transparent',
                  filter: 'url(#crayon-soft)',
                }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: phase === 'in' ? 1 : 0.55, opacity: 1 }}
                transition={{ duration: phase === 'in' ? INHALE : EXHALE, ease: [0.45, 0, 0.35, 1], delay: i * 0.12 }}
              />
            ))}
            <div className="relative text-center">
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 1.2 }} className="font-maru text-[20px] font-bold text-paper drop-shadow">
                深呼吸して、
                <br />
                準備をしよう
              </motion.p>
              <AnimatePresence mode="wait">
                <motion.p key={phase} initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="mt-3 font-maru text-[14px] text-paper">
                  {phase === 'in' ? 'すって…' : 'はいて…'}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
          <span className="absolute bottom-[calc(env(safe-area-inset-bottom)+28px)] text-[12px] text-paper/60">タップでスキップ</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
