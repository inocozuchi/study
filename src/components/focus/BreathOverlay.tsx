import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const INHALE = 4;
const EXHALE = 4;
const PETALS = 6;

/** 集中開始直後の深呼吸（Apple Watch の「呼吸」のような花びらの輪が、ふくらんで、しぼむ） */
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

  const inhale = phase === 'in';
  const ease = [0.45, 0, 0.35, 1] as const;

  return (
    <AnimatePresence>
      {open && (
        <motion.button
          key="breath"
          aria-label="深呼吸をスキップ"
          onClick={onDone}
          className="fixed inset-x-0 top-0 h-app z-50 grid place-items-center bg-night-950/70"
          style={{ backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
        >
          <div className="relative grid h-[64vmin] max-h-[340px] w-[64vmin] max-w-[340px] place-items-center">
            {/* 同心円のガイド */}
            {[1, 0.72, 0.44].map((s, i) => (
              <motion.span
                key={s}
                className="absolute rounded-full border border-line"
                style={{ width: `${s * 100}%`, height: `${s * 100}%` }}
                animate={{ scale: inhale ? 1 : 0.6, opacity: inhale ? 1 : 0.5 }}
                transition={{ duration: inhale ? INHALE : EXHALE, ease, delay: i * 0.1 }}
              />
            ))}
            {/* 花びら */}
            <motion.div className="absolute inset-0" animate={{ rotate: inhale ? 60 : 0 }} transition={{ duration: inhale ? INHALE : EXHALE, ease }}>
              {Array.from({ length: PETALS }, (_, i) => (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 h-[46%] w-[46%] rounded-full mix-blend-screen"
                  style={{ background: i % 2 ? 'rgba(94,224,230,0.42)' : 'rgba(127,209,168,0.42)', marginLeft: '-23%', marginTop: '-23%' }}
                  initial={{ x: 0, y: 0, scale: 0.4 }}
                  animate={{
                    x: inhale ? `${Math.cos((i / PETALS) * Math.PI * 2) * 50}%` : '0%',
                    y: inhale ? `${Math.sin((i / PETALS) * Math.PI * 2) * 50}%` : '0%',
                    scale: inhale ? 1 : 0.45,
                  }}
                  transition={{ duration: inhale ? INHALE : EXHALE, ease }}
                />
              ))}
            </motion.div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-[22%] text-center">
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 1 }} className="text-[22px] font-semibold tracking-tight">
              深呼吸して、準備をしよう
            </motion.p>
            {/* 入れ子の AnimatePresence は親の退場を止めることがあるため、キーを変えて入場だけ */}
            <motion.p key={phase} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ duration: 0.5 }} className="mt-2 text-[15px]">
              {inhale ? '吸って…' : '吐いて…'}
            </motion.p>
          </div>
          <span className="absolute bottom-[calc(env(safe-area-inset-bottom)+28px)] text-[12px] text-fg-2">タップでスキップ</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
