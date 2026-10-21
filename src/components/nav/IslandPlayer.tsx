import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Footprints, Pause, Play } from 'lucide-react';
import { useTimer } from '@/store/TimerStore';
import { useApp } from '@/store/AppStore';
import { fmtTimer } from '@/lib/time';
import { springBouncy } from '@/lib/motion';

/** タイマー稼働中、他の画面で表示するダイナミックアイランド風ミニプレイヤー */
export function IslandPlayer({ visible, onOpen }: { visible: boolean; onOpen: () => void }) {
  const { timer, remainingMs, elapsedMs, progress, toggle } = useTimer();
  const { subjectById } = useApp();
  const subject = subjectById(timer.subjectId);
  const show = visible && timer.phase !== 'idle';
  const rest = timer.phase === 'break';
  const tint = rest ? '#FF8A4C' : subject?.color ?? '#8EC5FF';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 20, scale: 0.6, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 16, scale: 0.6, filter: 'blur(6px)' }}
          transition={{ ...springBouncy, filter: { duration: 0.25 } }}
          className="mx-auto mb-2 flex w-fit items-center gap-3 rounded-full bg-black/85 py-1.5 pl-1.5 pr-1.5 shadow-float"
        >
          <button onClick={onOpen} className="flex items-center gap-3 pl-0.5" aria-label="トレイル画面を開く">
            <span className="relative grid h-9 w-9 place-items-center">
              <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none" stroke={tint} strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 15.5}
                  strokeDashoffset={2 * Math.PI * 15.5 * (1 - progress)}
                  style={{ transition: 'stroke-dashoffset 0.3s linear' }}
                />
              </svg>
              {rest ? <Flame size={15} color={tint} /> : <Footprints size={15} color={tint} />}
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[11px] font-medium text-white/55">{rest ? '焚き火で休憩' : subject?.name ?? '集中'}</span>
              <span className="tabular text-[16px] font-semibold tracking-tight">{fmtTimer(remainingMs ?? elapsedMs)}</span>
            </span>
          </button>
          <motion.button
            onClick={toggle}
            aria-label={timer.running ? '一時停止' : '再開'}
            className="ml-1 grid h-9 w-9 place-items-center rounded-full"
            style={{ background: `${tint}33`, color: tint }}
          >
            {timer.running ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
