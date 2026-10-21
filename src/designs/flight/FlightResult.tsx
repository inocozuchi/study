import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpenCheck } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { taskIcon } from '@/lib/tasks';
import { flightNo } from './airports';
import { PassCard, ymd } from './PassCard';
import { hm } from './parts';
import type { DesignResultProps } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

/** 航空デザイン：着陸。「着陸済み」の搭乗券と、今回の距離（マイレージ）・集中時間、ログブック */
export function FlightResult({ result, onContinue }: DesignResultProps) {
  const { logs, subjects } = useApp();
  const b = result.booking;
  const focusMin = Math.round(result.focusMs / 60_000);
  const flights = useMemo(() => logs.filter((l) => l.mode === 'flight').sort((a, z) => z.endedAt - a.endedAt), [logs]);
  const totalKm = flights.reduce((s, l) => s + l.km, 0);
  const start = new Date(result.startedAt);

  return (
    <div className="fl-root absolute inset-0 overflow-y-auto overscroll-contain bg-[#050608]/55">
      <div className="mx-auto w-[min(92vw,360px)] pb-[calc(env(safe-area-inset-bottom)+28px)] pt-[calc(var(--safe-top)+14px)]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center">
          <p className="text-[13px] font-semibold text-[#FF9F0A]">{result.arrived ? 'ようこそ' : '途中の空港に着陸しました'}</p>
          <p className="mt-0.5 text-[24px] font-bold tracking-tight">{b ? `${b.toName}に着陸しました` : '着陸しました'}</p>
        </motion.div>

        {b && (
          <motion.div className="mt-4" initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.35 }}>
            <PassCard
              compact
              landed={!!result.arrived}
              data={{
                from: { code: b.from, name: b.fromName },
                to: { code: b.to, name: b.toName },
                minutes: b.minutes,
                km: b.km,
                seat: b.seat,
                task: b.task,
                icon: taskIcon(b.task, subjects),
                date: start,
                board: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
                flight: flightNo(`${b.from}${b.to}${b.seat}${start.toDateString()}`),
              }}
            />
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="fl-glass mt-4 grid grid-cols-2 rounded-[22px] px-5 py-3.5">
          <div>
            <p className="text-[11.5px] text-white/50">今回のフライト</p>
            <p className="fl-num text-[26px] font-bold leading-tight">
              {(result.km ?? 0).toLocaleString()}
              <span className="ml-1 text-[13px] text-white/50">km</span>
            </p>
          </div>
          <div>
            <p className="text-[11.5px] text-white/50">集中した時間</p>
            <p className="fl-num text-[26px] font-bold leading-tight">{hm(focusMin)}</p>
          </div>
        </motion.div>

        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }} className="fl-glass mt-3 rounded-[22px] px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold">
              <BookOpenCheck size={15} className="text-[#FFD60A]" /> ログブック
            </p>
            <p className="fl-num text-[12px] text-white/55">累計 {totalKm.toLocaleString()} km · {flights.length} 便</p>
          </div>
          <ul className="mt-2 divide-y divide-white/8">
            {flights.slice(0, 4).map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2">
                <span className="fl-num w-[92px] shrink-0 text-[14px] font-bold">
                  {l.from} <span className="text-white/40">→</span> {l.to}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-white/55">
                  {ymd(new Date(l.endedAt))} · {l.task}
                </span>
                <span className="fl-num text-right text-[12px] text-white/75">
                  {l.km.toLocaleString()} km
                  <span className="block text-white/45">{hm(l.minutes)}</span>
                </span>
              </li>
            ))}
            {!flights.length && <li className="py-3 text-center text-[12px] text-white/45">まだ記録はありません</li>}
          </ul>
        </motion.section>

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} onClick={onContinue} className="fl-cta mt-5 h-14 w-full text-[17px]">
          到着ロビーへ
        </motion.button>
      </div>
    </div>
  );
}
