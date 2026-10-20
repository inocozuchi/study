import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Flame, Mountain, TrendingDown, TrendingUp } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { useNow } from '@/hooks/useNow';
import { GlassCard } from '@/components/ui/GlassCard';
import { Segmented } from '@/components/ui/Segmented';
import { SubjectIcon } from '@/components/ui/SubjectBadge';
import { LANDMARKS, METERS_PER_MINUTE, fmtMeters } from '@/lib/altitude';
import { bySubject, dailyBars, heatmap, streaks, summary } from '@/lib/stats';
import { DAY, fmtDateJa, fmtDuration, startOfDay, weekdayJa } from '@/lib/time';
import { springSoft } from '@/lib/motion';
import type { Subject } from '@/types';

type Period = 'week' | 'month';

export function InsightsScreen() {
  const { sessions, activeSubjects, subjects } = useApp();
  const now = useNow(60_000);
  const [period, setPeriod] = useState<Period>('week');

  const sum = useMemo(() => summary(sessions, now), [sessions, now]);
  const streak = useMemo(() => streaks(sessions, now), [sessions, now]);
  const days = period === 'week' ? 7 : 30;
  const bars = useMemo(() => dailyBars(sessions, days, now), [sessions, days, now]);
  const heat = useMemo(() => heatmap(sessions, 28, now), [sessions, now]);
  const dist = useMemo(() => bySubject(sessions, startOfDay(now) - (days - 1) * DAY, startOfDay(now) + DAY), [sessions, days, now]);

  const delta = sum.today - sum.yesterday;

  return (
    <div className="mx-auto max-w-xl px-5 pb-40 pt-safe">
      <header className="pt-2">
        <p className="text-[13px] font-semibold text-white/50">{fmtDateJa(now)}</p>
        <h1 className="text-[32px] font-bold leading-tight tracking-tight">インサイト</h1>
      </header>

      {/* ヒーロー：今日 */}
      <GlassCard className="mt-4 overflow-hidden p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-semibold text-white/55">今日の集中</p>
            <p className="tabular mt-1 text-[44px] font-bold leading-none tracking-tight">
              {Math.floor(sum.today / 60)}
              <span className="text-[20px] font-semibold text-white/55">時間</span>
              {Math.round(sum.today % 60)}
              <span className="text-[20px] font-semibold text-white/55">分</span>
            </p>
            <p className={`mt-2 flex items-center gap-1 text-[13px] font-semibold ${delta >= 0 ? 'text-moss' : 'text-white/50'}`}>
              {delta >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
              昨日より {delta >= 0 ? '+' : '−'}{fmtDuration(Math.abs(delta))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-semibold text-white/45">獲得標高</p>
            <p className="tabular text-[20px] font-bold text-sun">+{fmtMeters(sum.today * METERS_PER_MINUTE)}</p>
          </div>
        </div>
      </GlassCard>

      {/* タイル */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tile label="今週" value={fmtDuration(sum.week, true)} sub={`先週 ${fmtDuration(sum.lastWeek, true)}`} delay={0.03} />
        <Tile label="今月" value={fmtDuration(sum.month, true)} sub={`${new Date(now).getMonth() + 1}月の合計`} delay={0.06} />
        <Tile
          label="連続学習"
          value={`${streak.current}日`}
          sub={streak.todayDone ? `最長 ${streak.best}日` : '今日はまだ — 火を絶やさずに'}
          icon={<Flame size={15} className="text-ember" />}
          delay={0.09}
        />
        <Tile label="1日あたりの平均" value={fmtDuration(sum.avg7, true)} sub="直近 7 日間" delay={0.12} />
      </div>

      <Segmented<Period>
        value={period}
        onChange={setPeriod}
        className="mt-6"
        options={[
          { value: 'week', label: '直近 7 日' },
          { value: 'month', label: '直近 30 日' },
        ]}
      />

      <BarsCard bars={bars} subjects={activeSubjects} period={period} />
      <DonutCard dist={dist} subjects={subjects} />
      <HeatmapCard grid={heat} />
      <AltitudeCard total={sum.total} />
    </div>
  );
}

function Tile({ label, value, sub, icon, delay }: { label: string; value: string; sub: string; icon?: ReactNode; delay: number }) {
  return (
    <GlassCard delay={delay} className="p-4">
      <p className="flex items-center gap-1 text-[12px] font-semibold text-white/50">{icon}{label}</p>
      <p className="tabular mt-1 text-[24px] font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-white/40">{sub}</p>
    </GlassCard>
  );
}

function CardTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>
      {sub && <p className="mt-0.5 text-[12px] text-white/45">{sub}</p>}
    </div>
  );
}

// ───────────── 日別棒グラフ（科目の積み上げ） ─────────────

function BarsCard({ bars, subjects, period }: { bars: ReturnType<typeof dailyBars>; subjects: Subject[]; period: Period }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(60, ...bars.map((b) => b.total));
  const top = Math.ceil(max / 60) * 60;
  const H = 150;
  const used = subjects.filter((s) => bars.some((b) => b.bySubject[s.id]));
  const hb = hover != null ? bars[hover] : null;
  const avg = bars.reduce((a, b) => a + b.total, 0) / bars.length;

  return (
    <GlassCard className="mt-3 p-5" delay={0.05}>
      <div className="flex items-start justify-between">
        <CardTitle title="日別の集中時間" sub={`平均 ${fmtDuration(avg)} / 日`} />
        <AnimatePresence>
          {hb && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-black/40 px-3 py-2 text-right text-[12px]">
              <p className="font-semibold text-white/60">{fmtDateJa(hb.date)}</p>
              <p className="tabular text-[15px] font-bold">{fmtDuration(hb.total)}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative" style={{ height: H + 22 }} onMouseLeave={() => setHover(null)}>
        {/* グリッド */}
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 flex items-center gap-2" style={{ top: H - H * f }}>
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="tabular w-7 text-right text-[11px] text-white/50">{Math.round((top * f) / 60)}h</span>
          </div>
        ))}
        <div className="absolute bottom-[22px] left-0 right-9 flex items-end" style={{ height: H, gap: period === 'week' ? 10 : 3 }}>
          {bars.map((b, i) => {
            const segs = subjects.filter((s) => b.bySubject[s.id]);
            const isToday = i === bars.length - 1;
            const dim = hover != null && hover !== i;
            return (
              <button
                key={b.key}
                className="relative flex h-full flex-1 flex-col justify-end"
                onMouseEnter={() => setHover(i)}
                onClick={() => setHover(hover === i ? null : i)}
                aria-label={`${fmtDateJa(b.date)} ${fmtDuration(b.total)}`}
              >
                <motion.div
                  className="flex w-full flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px]"
                  initial={{ height: 0 }}
                  animate={{ height: (b.total / top) * H, opacity: dim ? 0.4 : 1 }}
                  transition={{ ...springSoft, delay: i * (period === 'week' ? 0.03 : 0.008) }}
                >
                  {segs.map((s) => (
                    <div key={s.id} style={{ flexGrow: b.bySubject[s.id], flexBasis: 0, background: s.color, minHeight: 2 }} />
                  ))}
                </motion.div>
                {(period === 'week' || i % 5 === 4 || isToday) && (
                  <span className={`absolute -bottom-[20px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold ${isToday ? 'text-white' : 'text-white/55'}`}>
                    {period === 'week' ? weekdayJa(b.date) : b.date.getDate()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {hb && hb.total > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
          {subjects.filter((s) => hb.bySubject[s.id]).map((s) => (
            <span key={s.id} className="flex items-center gap-1.5 text-white/70">
              <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
              {s.name} <span className="tabular text-white/45">{fmtDuration(hb.bySubject[s.id])}</span>
            </span>
          ))}
        </div>
      )}
      {!hb && used.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-white/60">
          {used.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ───────────── 科目別ドーナツ ─────────────

function DonutCard({ dist, subjects }: { dist: Record<string, number>; subjects: Subject[] }) {
  const [active, setActive] = useState<string | null>(null);
  const rows = subjects.filter((s) => dist[s.id]).map((s) => ({ s, m: dist[s.id] }));
  const total = rows.reduce((a, r) => a + r.m, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  const GAP = rows.length > 1 ? 3 : 0;
  let acc = 0;
  const activeRow = rows.find((r) => r.s.id === active);

  return (
    <GlassCard className="mt-3 p-5" delay={0.08}>
      <CardTitle title="科目別の配分" sub="どの山にどれだけ登ったか" />
      {total === 0 ? (
        <p className="py-6 text-center text-[13px] text-white/45">この期間の記録はまだありません</p>
      ) : (
        <div className="flex flex-col items-center gap-5 min-[440px]:flex-row">
          <div className="relative h-[150px] w-[150px] shrink-0">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
              <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="16" />
              {rows.map(({ s, m }) => {
                const len = (m / total) * C;
                const dash = Math.max(0.5, len - GAP);
                const el = (
                  <motion.circle
                    key={s.id}
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={active === s.id ? 20 : 16}
                    strokeDasharray={`${dash} ${C - dash}`}
                    initial={{ strokeDashoffset: C, opacity: 0 }}
                    animate={{ strokeDashoffset: -acc, opacity: active && active !== s.id ? 0.35 : 1 }}
                    transition={springSoft}
                    onMouseEnter={() => setActive(s.id)}
                    onMouseLeave={() => setActive(null)}
                    onClick={() => setActive(active === s.id ? null : s.id)}
                    style={{ cursor: 'pointer' }}
                  />
                );
                acc += len;
                return el;
              })}
            </svg>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-[11px] font-semibold text-white/45">{activeRow ? activeRow.s.name : '合計'}</p>
                <p className="tabular text-[18px] font-bold">{fmtDuration(activeRow ? activeRow.m : total, true)}</p>
                {activeRow && <p className="tabular text-[11px] text-white/50">{Math.round((activeRow.m / total) * 100)}%</p>}
              </div>
            </div>
          </div>
          <ul className="w-full min-w-0 flex-1 space-y-2">
            {rows
              .slice()
              .sort((a, b) => b.m - a.m)
              .map(({ s, m }) => (
                <li
                  key={s.id}
                  onMouseEnter={() => setActive(s.id)}
                  onMouseLeave={() => setActive(null)}
                  onClick={() => setActive(active === s.id ? null : s.id)}
                  className={`flex cursor-pointer items-center gap-2 text-[13px] transition-opacity ${active && active !== s.id ? 'opacity-40' : ''}`}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-white" style={{ background: s.color }}>
                    <SubjectIcon subject={s} size={13} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                  <span className="tabular text-white/50">{Math.round((m / total) * 100)}%</span>
                  <span className="tabular w-14 text-right font-semibold">{fmtDuration(m, true)}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </GlassCard>
  );
}

// ───────────── 時間帯ヒートマップ ─────────────

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5);
const WEEK = ['月', '火', '水', '木', '金', '土', '日'];

function HeatmapCard({ grid }: { grid: number[][] }) {
  const [cell, setCell] = useState<[number, number] | null>(null);
  const max = Math.max(1, ...grid.flatMap((r) => HOURS.map((h) => r[h])));
  const peak = useMemo(() => {
    const byHour = HOURS.map((h) => ({ h, v: grid.reduce((a, r) => a + r[h], 0) }));
    return byHour.sort((a, b) => b.v - a.v)[0];
  }, [grid]);

  return (
    <GlassCard className="mt-3 p-5" delay={0.1}>
      <div className="flex items-start justify-between">
        <CardTitle title="集中しやすい時間帯" sub={peak.v > 0 ? `直近 4 週間 · いちばん登れているのは ${peak.h}時台` : '直近 4 週間'} />
        {cell && (
          <div className="rounded-xl bg-black/40 px-3 py-2 text-right text-[12px]">
            <p className="font-semibold text-white/60">{WEEK[cell[0]]}曜 {cell[1]}時台</p>
            <p className="tabular text-[15px] font-bold">{fmtDuration(grid[cell[0]][cell[1]] / 4)}<span className="text-[11px] font-medium text-white/50"> /週</span></p>
          </div>
        )}
      </div>
      <div className="flex gap-2" onMouseLeave={() => setCell(null)}>
        <div className="grid grid-rows-7 gap-[3px] pt-px">
          {WEEK.map((w) => (
            <span key={w} className="flex h-full items-center text-[11px] font-semibold text-white/55">{w}</span>
          ))}
        </div>
        <div className="flex-1">
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` }}>
            {grid.map((row, d) =>
              HOURS.map((h) => {
                const v = row[h];
                const a = v > 0 ? 0.18 + 0.82 * Math.pow(v / max, 0.75) : 0;
                const on = cell && cell[0] === d && cell[1] === h;
                return (
                  <button
                    key={`${d}-${h}`}
                    aria-label={`${WEEK[d]}曜 ${h}時台 ${Math.round(v)}分`}
                    onMouseEnter={() => setCell([d, h])}
                    onClick={() => setCell(on ? null : [d, h])}
                    className="aspect-square rounded-[4px] transition-transform hover:scale-110"
                    style={{ background: v > 0 ? `rgba(57,135,229,${a})` : 'rgba(255,255,255,0.05)', boxShadow: on ? '0 0 0 1.5px #fff' : 'none' }}
                  />
                );
              }),
            )}
          </div>
          {/* 時刻ラベルは各列の中央に置く */}
          <div className="relative mt-1.5 h-3.5 text-[11px] text-white/50">
            {[6, 9, 12, 15, 18, 21].map((h) => (
              <span key={h} className="tabular absolute -translate-x-1/2" style={{ left: `${((HOURS.indexOf(h) + 0.5) / HOURS.length) * 100}%` }}>
                {h}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-white/50">
        少 {[0.18, 0.4, 0.6, 0.8, 1].map((a) => <span key={a} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: `rgba(57,135,229,${a})` }} />)} 多
      </div>
    </GlassCard>
  );
}

// ───────────── 獲得標高 ─────────────

function AltitudeCard({ total }: { total: number }) {
  const meters = total * METERS_PER_MINUTE;
  const fuji = meters / 3776;
  const everest = meters / 8848;
  const next = LANDMARKS.find((l) => l.meters > meters);
  const prev = [...LANDMARKS].reverse().find((l) => l.meters <= meters);
  const target = next ?? { name: `エベレスト ${Math.floor(everest) + 1}座目`, meters: (Math.floor(everest) + 1) * 8848 };
  const base = next ? prev?.meters ?? 0 : Math.floor(everest) * 8848;
  const p = Math.min(1, (meters - base) / (target.meters - base));

  return (
    <GlassCard className="relative mt-3 overflow-hidden p-5" delay={0.12}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-40" style={{ background: 'linear-gradient(180deg, transparent, rgba(255,210,122,0.12))' }} />
      <div className="relative">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-white/55"><Mountain size={15} className="text-sun" /> これまでの獲得標高</p>
        <p className="tabular mt-1 text-[40px] font-bold leading-none tracking-tight text-sun">{fmtMeters(meters)}</p>
        <p className="mt-2 text-[13px] text-white/60">
          富士山 <span className="tabular font-bold text-white">{fuji.toFixed(1)}</span> 座分 · エベレスト <span className="tabular font-bold text-white">{everest.toFixed(2)}</span> 座分
        </p>
        <div className="mt-4">
          <div className="flex justify-between text-[12px]">
            <span className="text-white/50">次の目標</span>
            <span className="font-semibold">{target.name} <span className="tabular text-white/45">{fmtMeters(target.meters)}</span></span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-sun/60 to-sun" initial={{ width: 0 }} animate={{ width: `${p * 100}%` }} transition={springSoft} />
          </div>
          <p className="tabular mt-1 text-right text-[11px] text-white/40">あと {fmtMeters(target.meters - meters)}（{fmtDuration((target.meters - meters) / METERS_PER_MINUTE)}）</p>
        </div>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {LANDMARKS.map((l) => {
            const done = meters >= l.meters;
            return (
              <span key={l.name} className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${done ? 'bg-sun/15 text-sun' : 'bg-white/[0.05] text-white/40'}`}>
                {done && <Check size={11} strokeWidth={3} />}
                {l.name}
                <span className="tabular font-normal opacity-70">{l.meters.toLocaleString()}</span>
              </span>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}
