import { motion } from 'framer-motion';
import { Flame, Footprints } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useTimer } from '@/store/TimerStore';
import { fmtDuration, MIN } from '@/lib/time';

export function StrayModal() {
  const { stray, resolveStray } = useTimer();
  return (
    <Modal open={!!stray} dismissable={false}>
      <div className="p-6 text-center">
        <motion.div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sun/15 text-[30px]"
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          🧭
        </motion.div>
        <h2 className="mt-4 text-[20px] font-bold tracking-tight">立ち止まりました</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-white/60">
          よそ見検知がオンのまま画面を離れていました
          {stray && (
            <>
              （約<span className="tabular font-semibold text-white/85">{fmtDuration(Math.max(1, stray.awayMs / MIN))}</span>）。
              <br />
              離れた時点でタイマーを止めています。
            </>
          )}
        </p>
        <div className="mt-6 grid gap-2">
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => resolveStray('resume')} className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[15px] font-bold text-night-950">
            <Footprints size={17} /> 集中に戻る
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => resolveStray('break')} className="flex items-center justify-center gap-2 rounded-2xl bg-ember/15 py-3.5 text-[15px] font-semibold text-ember">
            <Flame size={17} /> ここで記録して休憩する
          </motion.button>
        </div>
      </div>
    </Modal>
  );
}
