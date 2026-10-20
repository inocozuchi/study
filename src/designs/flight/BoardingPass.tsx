import { Plane } from 'lucide-react';
import { pad } from '@/lib/time';
import type { ProfileCardProps } from '../types';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** 空港コード風の 3 文字（英字ならその頭文字、日本語なら文字から決まる 3 文字） */
function code(text: string, fallback: string) {
  const latin = text.toUpperCase().replace(/[^A-Z]/g, '');
  if (latin.length >= 3) return latin.slice(0, 3);
  if (!text.trim()) return fallback;
  let h = hash(text);
  let out = '';
  for (let i = 0; i < 3; i++) {
    out += String.fromCharCode(65 + (h % 26));
    h = Math.floor(h / 26);
  }
  return out;
}

/** バーコード（名前から決まる太さの縦線） */
function Barcode({ seed, className = '' }: { seed: string; className?: string }) {
  let h = hash(seed) || 1;
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  while (x < 120) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    const w = 1 + (h % 3);
    const gap = 1 + ((h >>> 4) % 3);
    bars.push({ x, w });
    x += w + gap;
  }
  return (
    <svg viewBox="0 0 120 30" preserveAspectRatio="none" className={className} aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="30" fill="currentColor" />
      ))}
    </svg>
  );
}

/** 航空モード（準備中）：搭乗券。PASSENGER NAME と DESTINATION（＝目標） */
export function BoardingPass({ info }: ProfileCardProps) {
  const { name, goal, departure, sessions, settings } = info;
  const now = new Date();
  const dest = goal.trim() || '目標';
  const from = departure.trim() || 'はじまり';
  const flight = `FT${String(settings.pomodoroFocus).padStart(3, '0')}`;
  const gate = `${'ABCD'[sessions % 4]}${(sessions % 24) + 1}`;
  const seat = `${(sessions % 38) + 1}${'ACDF'[hash(name) % 4]}`;
  const date = `${pad(now.getDate())}${MONTHS[now.getMonth()]}`;
  const boarding = `${pad(now.getHours())}:${pad(Math.floor(now.getMinutes() / 5) * 5)}`;

  const Field = ({ label, value, big }: { label: string; value: string; big?: boolean }) => (
    <div className="min-w-0">
      <p className="text-[8.5px] font-bold tracking-[0.16em] text-[#7D8797]">{label}</p>
      <p className={`tabular whitespace-nowrap font-bold text-[#1B2433] ${big ? 'truncate text-[15px]' : 'text-[12.5px] tracking-tight'}`}>{value}</p>
    </div>
  );

  return (
    <div className="relative flex aspect-[1.586] w-full overflow-hidden rounded-[18px] bg-[#FBFCFE] text-[#1B2433] shadow-[0_14px_30px_-14px_rgba(20,30,60,0.5)]" aria-label="搭乗券">
      {/* 本券 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 bg-[#1D3557] px-4 py-2.5 text-white">
          <p className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-extrabold tracking-[0.12em]">
            <Plane size={14} className="-rotate-45" /> FOCUS AIR
          </p>
          <p className="whitespace-nowrap text-right text-[8.5px] font-bold leading-tight tracking-[0.16em] opacity-80">
            BOARDING PASS
            <br />
            搭乗券
          </p>
        </div>
        <div className="flex flex-1 flex-col justify-between px-4 py-3">
          <Field label="PASSENGER NAME" value={name} big />
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[28px] font-extrabold leading-none tracking-wide">{code(from, 'HOM')}</p>
              <p className="mt-0.5 truncate text-[10px] font-bold text-[#7D8797]">{from}</p>
            </div>
            <Plane size={18} className="mb-4 shrink-0 rotate-45 text-[#E85D4A]" />
            <div className="min-w-0 text-right">
              <p className="text-[28px] font-extrabold leading-none tracking-wide text-[#E85D4A]">{code(dest, 'GOL')}</p>
              <p className="mt-0.5 truncate text-[10px] font-bold text-[#7D8797]">DESTINATION · {dest}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <Field label="FLIGHT" value={flight} />
            <Field label="DATE" value={date} />
            <Field label="GATE" value={gate} />
            <Field label="SEAT" value={seat} />
          </div>
        </div>
      </div>

      {/* ミシン目 */}
      <div className="relative w-0 border-l-2 border-dashed border-[#D5DBE5]">
        <span className="absolute -left-[9px] -top-2 h-4 w-4 rounded-full bg-surface" />
        <span className="absolute -bottom-2 -left-[9px] h-4 w-4 rounded-full bg-surface" />
      </div>

      {/* 半券 */}
      <div className="flex w-[30%] flex-col justify-between px-3 py-3">
        <div className="space-y-1.5">
          <Field label="BOARDING" value={boarding} />
          <Field label="SEAT" value={seat} />
        </div>
        {/* 準備中のスタンプ */}
        <p className="mx-auto -rotate-[10deg] rounded-[4px] px-1.5 py-0.5 text-center text-[9px] font-extrabold leading-tight tracking-[0.14em] text-[#E85D4A]" style={{ boxShadow: 'inset 0 0 0 1.5px rgba(232,93,74,0.85)' }}>
          COMING
          <br />
          SOON
        </p>
        <Barcode seed={name + dest} className="h-10 w-full text-[#1B2433]" />
      </div>
    </div>
  );
}
