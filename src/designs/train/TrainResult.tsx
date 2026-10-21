import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppStore';
import { taskIcon } from '@/lib/tasks';
import { MIN, pad } from '@/lib/time';
import { springBouncy, springSoft } from '@/lib/motion';
import { goalName, originName } from './stations';
import { HardTicket } from './booking/HardTicket';
import { fare, lastPassed, stationByName, stopsFrom } from './booking/line';
import type { DesignResultProps } from '../types';

function fmtSpent(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}秒`;
  const m = Math.round(s / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}時間${m % 60 ? `${m % 60}分` : ''}` : `${m}分`;
}

/**
 * 列車デザイン：終着。予約した旅は改札鋏の入った硬券に到着印（途中で終えたら途中下車の印）と乗車の記録。
 * 予約のない旅（予定から出発したなど）は乗車記念の硬券。
 */
export function TrainResult({ result, onContinue }: DesignResultProps) {
  const { settings, subjectById, subjects, logs } = useApp();
  const subject = subjectById(result.subjectId);
  const b = result.booking;
  const d = new Date(result.endedAt);
  const spent = fmtSpent(result.focusMs);
  const rides = useMemo(() => logs.filter((l) => l.mode === 'train').sort((a, z) => z.endedAt - a.endedAt), [logs]);
  const totalKm = Math.round(rides.reduce((s, l) => s + l.km, 0) * 10) / 10;

  // 途中で終えたときは、通り過ぎた最後の駅で降りる
  const reached = b ? (result.arrived ? b.to : lastPassed(stopsFrom(b.from), result.focusMs / MIN)?.station.name ?? b.from) : null;

  return (
    <div className="tr-mincho absolute inset-0 overflow-y-auto overscroll-contain bg-black/35">
      <div className="mx-auto flex w-[min(92vw,360px)] flex-col items-center pb-[calc(env(safe-area-inset-bottom)+28px)] pt-[calc(env(safe-area-inset-top)+18px)]">
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springSoft, delay: 0.2 }} className="text-[13px] font-bold tracking-[0.3em] text-[#F6ECD2]/80">
          {b ? (result.arrived ? `終着 · ${b.to}` : `途中下車 · ${reached}`) : `終着 · ${goalName(settings)}`}
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-1 text-[22px] font-bold tracking-[0.15em] text-[#F6ECD2] [text-shadow:0_2px_10px_rgba(0,0,0,0.6)]">
          {b ? (result.arrived ? `${b.to}に着きました` : `${reached}で降りました`) : 'おつかれさまでした'}
        </motion.p>

        {b ? (
          <motion.div className="mt-[8vh] w-full" initial={{ opacity: 0, y: 30, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: -1.5 }} transition={{ ...springBouncy, delay: 0.5 }}>
            <HardTicket
              punched
              stamp={result.arrived ? `到着 ${b.to}` : `途中下車 ${reached}`}
              data={{
                from: b.from,
                to: b.to,
                km: b.km,
                minutes: b.minutes,
                seat: b.seat,
                task: b.task,
                icon: taskIcon(b.task, subjects),
                express: settings.trainClass === 'express',
                fare: fare(b.km, settings.trainClass === 'express'),
                date: new Date(result.startedAt),
                serial: `${pad(d.getHours())}${pad(d.getMinutes())}`,
              }}
            />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 30, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: -1.5 }} transition={{ ...springBouncy, delay: 0.5 }} className="tr-hard relative mt-[14vh] w-full rounded-[6px] px-5 pb-4 pt-3 shadow-[0_20px_40px_-14px_rgba(0,0,0,0.7)]">
            <span className="absolute right-4 top-3.5 h-2.5 w-2.5 rounded-full bg-[#3E2B20] shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)]" />
            <p className="text-[13px] font-extrabold tracking-[0.4em]">乗車記念</p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <p className="truncate text-[24px] font-extrabold tracking-[0.1em]">{originName(settings)}</p>
              <span className="text-[18px] font-bold opacity-70">→</span>
              <p className="truncate text-[24px] font-extrabold tracking-[0.1em] text-[#B0382C]">{goalName(settings)}</p>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="tr-paper mt-7 w-full rounded-[6px] px-4 py-3 text-center shadow-[0_0_0_2px_#6B4A2B,0_0_0_4px_#F1E3C4,0_0_0_5px_#6B4A2B]">
          <p className="text-[15px] font-bold leading-relaxed">
            <span className="text-[#6E1F2B]">{subject?.name ?? b?.task ?? '集中'}</span> に <span className="text-[#6E1F2B]">{spent}</span> 乗車
          </p>
          <p className="text-[12px] text-[#6B4A2B]">
            {settings.trainClass === 'express' ? '特急' : '普通'}
            {result.cycles > 0 ? ` · 途中 ${result.cycles} 駅に停車` : ''}
            {b && result.km != null ? ` · ${result.km} 粁` : ''}
          </p>
          {b && (
            <div className="mt-2.5 border-t border-dashed border-[#B9A57E] pt-2 text-left">
              <p className="flex justify-between text-[12px] font-bold text-[#4A2E1C]">
                <span>乗車の記録</span>
                <span className="tabular-nums">累計 {totalKm} 粁 · {rides.length} 回</span>
              </p>
              <ul className="mt-1 space-y-0.5 text-[12.5px]">
                {rides.slice(0, 4).map((l) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {l.from} → {l.arrived ? l.to : `${l.to}（途中下車）`}
                    </span>
                    <span className="shrink-0 tabular-nums text-[#6B4A2B]">
                      {new Date(l.endedAt).getMonth() + 1}/{new Date(l.endedAt).getDate()} · {l.minutes}分
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springBouncy, delay: 1.1 }} whileTap={{ scale: 0.95 }} onClick={onContinue} className="tr-enji mt-6 h-12 rounded-[10px] px-10 text-[17px] font-bold tracking-[0.3em]">
          改札を出る
        </motion.button>
        {b && <p className="mt-2 text-[11px] text-[#F6ECD2]/50">{stationByName(b.from).name}から {b.km} 粁の旅</p>}
      </div>
    </div>
  );
}
