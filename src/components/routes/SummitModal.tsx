import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { SummitStamp } from './SummitStamp';
import { useApp } from '@/store/AppStore';
import { METERS_PER_MINUTE, fmtMeters } from '@/lib/altitude';
import { fmtDuration } from '@/lib/time';
import { springBouncy } from '@/lib/motion';

export function SummitModal() {
  const { summit, dismissSummit } = useApp();

  useEffect(() => {
    if (!summit) return;
    const colors = [summit.subject.color, '#FFD27A', '#ffffff', '#FF8A4C'];
    const end = Date.now() + 1600;
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors, zIndex: 100, disableForReducedMotion: true });
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, zIndex: 100, disableForReducedMotion: true });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, zIndex: 100, disableForReducedMotion: true });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [summit]);

  return (
    <Modal open={!!summit} onClose={dismissSummit}>
      {summit && (
        <div className="relative p-6 text-center">
          <div className="absolute inset-x-0 top-0 h-40" style={{ background: `radial-gradient(60% 100% at 50% 0%, ${summit.subject.color}40, transparent)` }} />
          <motion.div className="relative mx-auto w-fit" initial={{ scale: 0.3, rotate: -25, opacity: 0 }} animate={{ scale: 1, rotate: -8, opacity: 1 }} transition={{ ...springBouncy, delay: 0.15 }}>
            <SummitStamp subject={summit.subject} size={140} date={summit.subject.summitedAt} />
          </motion.div>
          <p className="relative mt-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-accent-ink">Summit reached</p>
          <h2 className="relative mt-1 text-[24px] font-bold tracking-tight">{summit.subject.mountainName} 登頂！</h2>
          <p className="relative mt-2 text-[14px] leading-relaxed text-fg-2">
            {summit.subject.name}で累計 <span className="font-semibold text-fg">{fmtDuration(summit.minutes)}</span>。<br />
            標高 {fmtMeters(summit.minutes * METERS_PER_MINUTE)} の雲海を越えました。
          </p>
          <motion.button whileTap={{ scale: 0.96 }} onClick={dismissSummit} className="relative mt-6 w-full rounded-2xl bg-accent py-3.5 text-[15px] font-bold text-white">
            旅の記録帳にしまう
          </motion.button>
        </div>
      )}
    </Modal>
  );
}
