import { fmtDuration, pad } from '@/lib/time';
import { goalName, originName } from './stations';
import type { ProfileCardProps } from '../types';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

/** 名前から決まる席番号 */
function seatOf(name: string, n: number) {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193);
  return { car: ((h >>> 0) % 8) + 1, row: (n % 15) + 1, seat: 'ABCD'[(h >>> 8) % 4] };
}

/**
 * 列車のきっぷ：国鉄のマルス指定席券ふう（うすい緑の地紋）。
 * 改札鋏の切り欠きと、赤い日付印。〇〇様・出発駅 → 行き先（＝目標）
 */
export function Ticket({ info }: ProfileCardProps) {
  const { name, totalMinutes, sessions, settings } = info;
  const now = new Date();
  const express = settings.trainClass === 'express';
  const from = originName(settings);
  const to = goalName(settings);
  const s = seatOf(name, sessions);
  const date = `${now.getMonth() + 1}月${now.getDate()}日(${WEEK[now.getDay()]})`;
  const stamp = `${String(now.getFullYear()).slice(2)}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
  const fare = Math.max(140, Math.round(totalMinutes / 10) * 10 + 140);

  return (
    <div className="tr-ticket relative aspect-[1.586] w-full overflow-hidden rounded-[10px] shadow-[0_14px_30px_-14px_rgba(20,50,30,0.55)]" aria-label="きっぷ">
      {/* 改札鋏の切り欠き */}
      <span className="absolute left-[64%] top-[-7px] h-3.5 w-3.5 rotate-45 bg-surface" />
      <div className="flex h-full flex-col px-4 pb-3 pt-2.5" style={{ fontFeatureSettings: '"palt"' }}>
        <div className="flex items-baseline justify-between">
          <p className="text-[15px] font-extrabold tracking-[0.3em]">{express ? '乗車券・特急券' : '乗車券'}</p>
          <p className="text-[9px] font-bold tracking-[0.2em] opacity-60">FOCUS TRAIL 発行</p>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <p className="min-w-0 truncate text-[26px] font-extrabold leading-none tracking-[0.08em]">{from}</p>
          <span className="shrink-0 text-[20px] font-bold opacity-70">→</span>
          <p className="min-w-0 truncate text-[26px] font-extrabold leading-none tracking-[0.08em]">{to}</p>
        </div>

        <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 text-[13px] font-bold leading-relaxed">
          <span className="tabular">{date}</span>
          <span className="tabular">
            {express ? '特急 しゅうちゅう' : '普通'} {(settings.pomodoroFocus % 50) + 1}号
          </span>
          <span className="tabular">{s.car}号車</span>
          <span className="tabular">
            {s.row}番{s.seat}席 <span className="text-[11px] opacity-70">（窓側）</span>
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div>
            <p className="text-[20px] font-extrabold leading-none tracking-[0.06em]">
              {name}
              <span className="ml-1 text-[14px]">様</span>
            </p>
            <p className="tabular mt-1.5 text-[11px] font-bold opacity-70">
              累計乗車 {fmtDuration(totalMinutes)} · ¥{fare.toLocaleString()}
            </p>
          </div>
          {/* 日付印 */}
          <span className="tabular grid h-[58px] w-[58px] shrink-0 rotate-[-10deg] place-items-center rounded-full text-center text-[8.5px] font-extrabold leading-tight tracking-tight text-[#C8352B]" style={{ boxShadow: 'inset 0 0 0 1.6px rgba(200,53,43,0.8), inset 0 0 0 4px rgba(220,239,220,1), inset 0 0 0 5px rgba(200,53,43,0.5)' }}>
            <span>
              {stamp}
              <br />
              <span className="text-[10px]">{from.slice(0, 4)}</span>
              <br />
              入鋏
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
