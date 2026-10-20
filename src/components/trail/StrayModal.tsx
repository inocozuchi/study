import { motion } from 'framer-motion';
import { Flame, Footprints } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useTimer } from '@/store/TimerStore';
import { fmtDuration, MIN } from '@/lib/time';

export function StrayModal() {
  const { stray, resolveStray } = useTimer();
  return (
    <Modal open={!!stray} dismissable={false} tone="paper">
      <div className="p-6 text-center">
        <motion.div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-crayon-yellow/25 text-[30px]"
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          🧭
        </motion.div>
        <h2 className="mt-4 font-maru text-[21px] font-bold tracking-tight">旅人が立ち止まりました</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          ディープ集中中に画面を離れていました
          {stray && (
            <>
              （約<span className="tabular font-semibold text-ink">{fmtDuration(Math.max(1, stray.awayMs / MIN))}</span>）。
              <br />
              離れた時点でタイマーを止めています。
            </>
          )}
        </p>
        <div className="mt-6 grid gap-2">
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => resolveStray('resume')} className="ink-btn flex items-center justify-center gap-2 py-3.5 text-[15px]">
            <Footprints size={17} /> 集中に戻る
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => resolveStray('break')} className="flex items-center justify-center gap-2 rounded-full bg-crayon-red/15 py-3.5 text-[15px] font-bold text-crayon-red">
            <Flame size={17} /> ここで記録して休憩する
          </motion.button>
        </div>
      </div>
    </Modal>
  );
}
