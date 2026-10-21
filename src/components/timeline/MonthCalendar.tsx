import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, dateKey, startOfMonth, startOfWeek, weekdaysMonFirst } from '@/lib/time';

export interface DayMarks {
  /** その日の科目の色（集中・予定）。最大 3 つまで点で出す */
  colors: string[];
  /** Google カレンダーの予定がある */
  events: boolean;
}


/**
 * 月のカレンダー。日をタップするとその日のタイムラインを下に出す。
 * 色は「選択中＝青」と、科目の色の小さな点だけ（Google の予定はグレーの点）。
 */
export function MonthCalendar({ month, selected, today, marks, onSelect, onMonth }: { month: number; selected: string; today: string; marks: Record<string, DayMarks>; onSelect: (key: string) => void; onMonth: (delta: number) => void }) {
  const first = new Date(month);
  const gridStart = startOfWeek(first);
  // 6 週分（その月が何週にまたがっても高さを変えない）
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const label = `${first.getFullYear()}年${first.getMonth() + 1}月`;

  return (
    <div className="card px-3 pb-3 pt-2">
      <div className="flex items-center justify-between px-1">
        <button aria-label="前の月" onClick={() => onMonth(-1)} className="hit grid h-9 w-9 place-items-center rounded-full text-accent-ink active:bg-accent-soft">
          <ChevronLeft size={20} strokeWidth={2.4} />
        </button>
        <motion.p key={label} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-ui-[15px] font-extrabold tabular">
          {label}
        </motion.p>
        <button aria-label="次の月" onClick={() => onMonth(1)} className="hit grid h-9 w-9 place-items-center rounded-full text-accent-ink active:bg-accent-soft">
          <ChevronRight size={20} strokeWidth={2.4} />
        </button>
      </div>
      <div className="mt-1 grid grid-cols-7">
        {weekdaysMonFirst().map((w, i) => (
          <span key={w} className={`py-1 text-center text-ui-[11px] font-bold ${i === 6 ? 'text-danger-ink/80' : 'text-fg-2'}`}>
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5" role="grid" aria-label={label}>
        {days.map((d) => {
          const k = dateKey(d);
          const inMonth = d.getMonth() === first.getMonth();
          const isSel = k === selected;
          const isToday = k === today;
          const m = marks[k];
          return (
            <button
              key={k}
              role="gridcell"
              aria-selected={isSel}
              aria-label={`${d.getMonth() + 1}月${d.getDate()}日`}
              onClick={() => onSelect(k)}
              className="flex flex-col items-center gap-[3px] py-1"
            >
              <span
                className={`tabular grid h-8 w-8 place-items-center rounded-full text-ui-[13px] transition-colors ${
                  isSel ? 'bg-accent font-extrabold text-white' : isToday ? 'font-extrabold text-accent-ink ring-[1.5px] ring-inset ring-accent' : inMonth ? 'font-semibold text-fg' : 'font-medium text-fg-3'
                }`}
              >
                {d.getDate()}
              </span>
              <span className="flex h-[5px] items-center gap-[3px]">
                {m?.colors.slice(0, 3).map((c, i) => <span key={i} className="h-[5px] w-[5px] rounded-full" style={{ background: c, opacity: inMonth ? 1 : 0.4 }} />)}
                {m?.events && <span className="h-[5px] w-[5px] rounded-full bg-fg-3" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** カレンダーに出す範囲（表示中の月の 6 週分） */
export function monthGridRange(month: number) {
  const from = startOfWeek(new Date(month));
  return { from, to: addDays(from, 42).getTime() };
}

export { startOfMonth };
