import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';
import { SUBJECT_ICONS } from '@/lib/subjects';
import { hm } from './parts';
import type { SubjectIconKey } from '@/types';

export interface PassData {
  from: { code: string; name: string };
  to: { code: string; name: string };
  minutes: number;
  km: number;
  seat: string;
  task: string;
  icon: SubjectIconKey;
  date: Date;
  /** 搭乗の時刻（「今」など） */
  board: string;
  flight: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;

/** 切り欠き（ノッチ）：上の券面は下の角、半券は上の角を半円にくり抜く */
const NOTCH_BOTTOM = 'radial-gradient(circle 13px at 0 100%, transparent 12.5px, #000 13px) left / 51% 100% no-repeat, radial-gradient(circle 13px at 100% 100%, transparent 12.5px, #000 13px) right / 51% 100% no-repeat';
export const NOTCH_TOP = 'radial-gradient(circle 13px at 0 0, transparent 12.5px, #000 13px) left / 51% 100% no-repeat, radial-gradient(circle 13px at 100% 0, transparent 12.5px, #000 13px) right / 51% 100% no-repeat';

/**
 * Liquid Glass の搭乗券（上の券面）。半券（バーコード）は stub として下につなげる（PassStep で切り離す）。
 * 背景にドットの世界地図を透かす。landed なら「着陸済み」のバッジ。
 */
export function PassCard({ data, stub, landed = false, compact = false }: { data: PassData; stub?: ReactNode; landed?: boolean; compact?: boolean }) {
  const Icon = SUBJECT_ICONS[data.icon]?.icon ?? SUBJECT_ICONS.book.icon;
  return (
    <div className="relative w-full">
      <div className="fl-glass relative overflow-hidden rounded-t-[26px] px-5 pb-5 pt-4" style={{ WebkitMask: NOTCH_BOTTOM, mask: NOTCH_BOTTOM }}>
        {/* ドットの世界地図をうすく透かす */}
        <span className="fl-dots pointer-events-none absolute inset-0 opacity-[0.14]" style={{ backgroundImage: 'url(./flight/dots.svg)' }} />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[12px] font-bold tracking-[0.18em] text-white/80">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#FF9F0A] text-[#1A1206]">
                <Plane size={13} strokeWidth={2.6} className="-rotate-45" />
              </span>
              FOCUS AIR
            </span>
            <span className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-[3px] text-[11.5px] font-semibold">
                <Icon size={12} strokeWidth={2.4} />
                {data.task}
              </span>
              <span className="fl-num text-[11.5px] font-semibold text-white/55">{data.flight}</span>
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className={`fl-num font-bold leading-none tracking-tight ${compact ? 'text-[34px]' : 'text-[42px]'}`}>{data.from.code}</p>
              <p className="mt-1 text-[13px] text-white/65">{data.from.name}</p>
            </div>
            <div className="flex flex-1 flex-col items-center px-2">
              <span className="flex w-full items-center gap-1.5 text-white/45">
                <span className="h-px flex-1 border-t border-dashed border-white/30" />
                <Plane size={16} strokeWidth={2.2} className="text-[#FF9F0A]" />
                <span className="h-px flex-1 border-t border-dashed border-white/30" />
              </span>
              <span className="fl-num mt-1 text-[12.5px] font-semibold text-white/75">{hm(data.minutes)}</span>
            </div>
            <div className="text-right">
              <p className={`fl-num font-bold leading-none tracking-tight ${compact ? 'text-[34px]' : 'text-[42px]'}`}>{data.to.code}</p>
              <p className="mt-1 text-[13px] text-white/65">{data.to.name}</p>
            </div>
          </div>

          <dl className={`grid grid-cols-2 gap-x-4 ${compact ? 'mt-3 gap-y-2' : 'mt-5 gap-y-3.5'}`}>
            {[
              ['席', data.seat],
              ['距離', `${data.km.toLocaleString()} km`],
              ['搭乗', data.board],
              ['日付', ymd(data.date)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11.5px] text-white/50">{k}</dt>
                <dd className="fl-num text-[19px] font-bold leading-tight">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {landed && (
          <motion.span
            initial={{ scale: 1.8, opacity: 0, rotate: -18 }}
            animate={{ scale: 1, opacity: 1, rotate: -12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.5 }}
            className="absolute right-4 top-[46%] rounded-[10px] border-2 border-[#30D158] px-2.5 py-1 text-center text-[#30D158]"
          >
            <span className="block text-[15px] font-black leading-none tracking-[0.12em]">LANDED</span>
            <span className="block text-[10px] font-bold">着陸済み</span>
          </motion.span>
        )}
      </div>
      {/* ミシン目 */}
      <div className="mx-[14px] border-t-2 border-dashed border-white/25" />
      {stub}
    </div>
  );
}
