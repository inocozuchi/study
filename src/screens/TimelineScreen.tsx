import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Moon, Pencil, Play, Plus, Sunrise, NotebookPen, CalendarPlus } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { useTimer } from '@/store/TimerStore';
import { useNow } from '@/hooks/useNow';
import { buildTimeline, type TimelineItem } from '@/components/timeline/buildTimeline';
import { EntrySheet, draftFromNow, type EntryDraft } from '@/components/timeline/EntrySheet';
import { Sheet } from '@/components/ui/Sheet';
import { Pressable } from '@/components/ui/Pressable';
import { SubjectIcon } from '@/components/ui/SubjectBadge';
import { GlassCard } from '@/components/ui/GlassCard';
import { addDays, dateKey, fmtClock, fmtDateJa, fmtDuration, minutesOfDay, parseDateKey, startOfWeek, weekdayJa } from '@/lib/time';
import { alpha } from '@/lib/subjects';
import { spring, springSoft } from '@/lib/motion';

const DAY_START = 6 * 60;
const DAY_END = 24 * 60;

export function TimelineScreen({ onStartFocus }: { onStartFocus: () => void }) {
  const { plans, sessions, subjectById } = useApp();
  const { startPlanned, timer } = useTimer();
  const now = useNow(30_000);
  const [selected, setSelected] = useState(() => dateKey(now));
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [planItem, setPlanItem] = useState<TimelineItem | null>(null);
  const [addMenu, setAddMenu] = useState(false);

  const selDate = parseDateKey(selected);
  const isToday = selected === dateKey(now);
  const weekStart = startOfWeek(selDate);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const minutesByDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of sessions) {
      const k = dateKey(s.start);
      m[k] = (m[k] ?? 0) + s.minutes;
    }
    return m;
  }, [sessions]);

  const items = useMemo(
    () => buildTimeline(selected, selDate.getTime(), plans, sessions, (id) => subjectById(id)),
    [selected, plans, sessions, subjectById], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const nowMin = isToday ? minutesOfDay(now) : null;
  const focusMin = items.filter((i) => i.done).reduce((a, i) => a + (i.actual?.minutes ?? i.session?.minutes ?? 0), 0);
  const planCount = items.filter((i) => i.kind === 'plan').length;
  const planDone = items.filter((i) => i.kind === 'plan' && i.done).length;
  const next = nowMin != null ? items.find((i) => i.kind === 'plan' && !i.done && i.startMin > nowMin) : undefined;
  const current = nowMin != null ? items.find((i) => i.startMin <= nowMin && i.endMin > nowMin) : undefined;

  const shiftWeek = (d: number) => setSelected(dateKey(addDays(selDate, d * 7)));

  return (
    <div className="mx-auto max-w-xl px-5 pb-40 pt-safe">
      {/* ヘッダー */}
      <header className="flex items-end justify-between pt-2">
        <div>
          <p className="text-[13px] font-semibold text-white/50">{isToday ? '今日' : fmtDateJa(selDate, false)}</p>
          <h1 className="text-[32px] font-bold leading-tight tracking-tight">タイムライン</h1>
        </div>
        <Pressable onClick={() => setAddMenu(true)} aria-label="追加" className="grid h-11 w-11 place-items-center rounded-full bg-white text-night-950 shadow-glass">
          <Plus size={22} strokeWidth={2.6} />
        </Pressable>
      </header>

      {/* 週ストリップ */}
      <div className="mt-4 flex items-center gap-1">
        <button aria-label="前の週" onClick={() => shiftWeek(-1)} className="grid h-8 w-6 place-items-center text-white/40">
          <ChevronLeft size={18} />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {week.map((d) => {
            const k = dateKey(d);
            const active = k === selected;
            const today = k === dateKey(now);
            const mins = minutesByDay[k] ?? 0;
            const ring = Math.min(1, mins / 180);
            return (
              <motion.button key={k} whileTap={{ scale: 0.9 }} onClick={() => setSelected(k)} className="relative flex flex-col items-center gap-1 rounded-2xl py-2">
                {active && <motion.span layoutId="day-pill" transition={spring} className="absolute inset-0 rounded-2xl bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" />}
                <span className={`relative text-[11px] font-semibold ${today ? 'text-ember' : 'text-white/45'}`}>{weekdayJa(d)}</span>
                <span className="relative grid h-8 w-8 place-items-center">
                  <svg viewBox="0 0 32 32" className="absolute inset-0 -rotate-90">
                    <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                    {ring > 0 && <circle cx="16" cy="16" r="14" fill="none" stroke="#7FD1A8" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={88} strokeDashoffset={88 * (1 - ring)} />}
                  </svg>
                  <span className={`relative text-[14px] font-bold ${active ? 'text-white' : 'text-white/75'}`}>{d.getDate()}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
        <button aria-label="次の週" onClick={() => shiftWeek(1)} className="grid h-8 w-6 place-items-center text-white/40">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* サマリー */}
      <GlassCard className="mt-4 grid grid-cols-3 divide-x divide-white/[0.08] py-3.5">
        <Stat label="集中" value={fmtDuration(focusMin, true)} color="#7FD1A8" />
        <Stat label="予定の達成" value={planCount ? `${planDone}/${planCount}` : '—'} color="#8EC5FF" />
        <Stat
          label={next ? '次の予定まで' : isToday ? '残りの予定' : '標高'}
          value={next && nowMin != null ? fmtDuration(next.startMin - nowMin, true) : isToday ? 'なし' : `+${(focusMin * 10).toLocaleString()}m`}
          color="#FFD27A"
        />
      </GlassCard>

      {/* 次の予定 */}
      <AnimatePresence>
        {isToday && next && !current && timer.phase !== 'focus' && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={springSoft}
            onClick={() => setPlanItem(next)}
            className="mt-3 flex w-full items-center gap-3 rounded-2xl p-3 text-left"
            style={{ background: `linear-gradient(100deg, ${alpha(next.subject?.color ?? '#fff', 0.2)}, rgba(255,255,255,0.04))`, boxShadow: `inset 0 0 0 1px ${alpha(next.subject?.color ?? '#fff', 0.25)}` }}
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: alpha(next.subject?.color ?? '#fff', 0.25), color: next.subject?.color }}>
              {next.subject && <SubjectIcon subject={next.subject} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-white/55">NEXT · {fmtClock(next.startMin)} から</span>
              <span className="block truncate text-[15px] font-semibold">{next.title}</span>
            </span>
            <span className="tabular rounded-full bg-black/25 px-2.5 py-1 text-[12px] font-semibold">あと{fmtDuration(next.startMin - (nowMin ?? 0), true)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* タイムライン本体 */}
      <motion.div key={selected} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft} className="mt-5">
        <Anchor icon={<Sunrise size={16} />} time="6:00" label="おはよう、旅のはじまり" color="#FFD27A" />
        {items.length === 0 && (
          <>
            <Gap minutes={0} height={28} fromColor="#FFD27A" toColor="#C3A6FF" />
            <div className="ml-[60px] rounded-2xl border border-dashed border-white/12 p-4 text-[13px] leading-relaxed text-white/50">
              この日の予定や記録はまだありません。<br />右上の ＋ から予定を立てたり、あとから記録を追加できます。
            </div>
          </>
        )}
        {(() => {
          let prevEnd = DAY_START;
          let prevColor = '#FFD27A';
          let nowPlaced = nowMin == null || nowMin < DAY_START;
          const out: ReactElement[] = [];
          items.forEach((it, idx) => {
            const color = it.subject?.color ?? '#ffffff';
            const gapStart = Math.max(prevEnd, DAY_START);
            const gap = it.startMin - gapStart;
            // 現在時刻インジケータ（アイテムの間）
            if (!nowPlaced && nowMin != null && nowMin < it.startMin && nowMin >= prevEnd - 0.01) {
              out.push(<Gap key={`g1-${it.key}`} minutes={nowMin - gapStart} fromColor={prevColor} toColor="#FF8A4C" />);
              out.push(<NowLine key="now" nowMin={nowMin} nextIn={it.startMin - nowMin} />);
              out.push(<Gap key={`g2-${it.key}`} minutes={it.startMin - nowMin} fromColor="#FF8A4C" toColor={color} label />);
              nowPlaced = true;
            } else {
              out.push(<Gap key={`g-${it.key}`} minutes={gap} fromColor={prevColor} toColor={color} label={idx > 0 || gap >= 30} />);
            }
            const live = nowMin != null && it.startMin <= nowMin && it.endMin > nowMin;
            if (live) nowPlaced = true;
            out.push(
              <Row
                key={it.key}
                item={it}
                live={live}
                nowMin={nowMin}
                past={nowMin != null ? it.endMin <= nowMin : selected < dateKey(now)}
                onClick={() =>
                  it.kind === 'plan'
                    ? setPlanItem(it)
                    : it.session && setDraft({ kind: 'record', date: selected, startMin: it.startMin, endMin: it.endMin, session: it.session })
                }
              />,
            );
            prevEnd = Math.max(prevEnd, it.endMin);
            prevColor = color;
          });
          if (!nowPlaced && nowMin != null) {
            out.push(<Gap key="g-now" minutes={nowMin - Math.max(prevEnd, DAY_START)} fromColor={prevColor} toColor="#FF8A4C" label />);
            out.push(<NowLine key="now" nowMin={nowMin} />);
            prevColor = '#FF8A4C';
            prevEnd = nowMin;
          }
          if (items.length) out.push(<Gap key="g-end" minutes={DAY_END - Math.max(prevEnd, DAY_START)} fromColor={prevColor} toColor="#C3A6FF" label />);
          return out;
        })()}
        <Anchor icon={<Moon size={16} />} time="24:00" label="おやすみ、焚き火を消して" color="#C3A6FF" />
      </motion.div>

      {/* 追加メニュー */}
      <Sheet open={addMenu} onClose={() => setAddMenu(false)} title="タイムラインに追加" subtitle={fmtDateJa(selDate)}>
        <div className="grid gap-2 pb-4">
          <AddOption
            icon={<NotebookPen size={20} />}
            color="#7FD1A8"
            title="あとから記録"
            desc="電車内や紙での勉強時間を、開始・終了時刻で記録"
            onClick={() => {
              setAddMenu(false);
              setDraft(draftFromNow('record', selected));
            }}
          />
          <AddOption
            icon={<CalendarPlus size={20} />}
            color="#8EC5FF"
            title="予定を立てる"
            desc="学習ブロックを置いて、時間になったら出発"
            onClick={() => {
              setAddMenu(false);
              setDraft(draftFromNow('plan', selected));
            }}
          />
        </div>
      </Sheet>

      <EntrySheet open={!!draft} draft={draft} onClose={() => setDraft(null)} />

      {/* 予定の詳細 */}
      <Sheet open={!!planItem} onClose={() => setPlanItem(null)} title={planItem?.title} subtitle={planItem && `${fmtClock(planItem.startMin)} – ${fmtClock(planItem.endMin)} · ${fmtDuration(planItem.endMin - planItem.startMin)}`}>
        {planItem && (
          <div className="space-y-3 pb-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: alpha(planItem.subject?.color ?? '#fff', 0.2), color: planItem.subject?.color }}>
                {planItem.subject && <SubjectIcon subject={planItem.subject} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{planItem.subject?.name}</p>
                <p className="text-[12px] text-white/50">{planItem.subject?.mountainName}</p>
              </div>
              {planItem.done && <span className="flex items-center gap-1 rounded-full bg-moss/15 px-2.5 py-1 text-[12px] font-semibold text-moss"><Check size={13} /> 達成</span>}
            </div>
            {planItem.actual && (
              <p className="px-1 text-[13px] text-white/60">
                実績 {fmtClock(planItem.actual.startMin)} – {fmtClock(planItem.actual.endMin)}（{fmtDuration(planItem.actual.minutes)}）{planItem.note ? ` · ${planItem.note}` : ''}
              </p>
            )}
            {!planItem.done && isToday && timer.phase !== 'focus' && planItem.subject && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (startPlanned(planItem.subject!.id, planItem.endMin - planItem.startMin)) {
                    setPlanItem(null);
                    onStartFocus();
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[15px] font-bold text-night-950"
              >
                <Play size={16} fill="currentColor" /> この予定で出発する（{fmtDuration(Math.min(180, planItem.endMin - planItem.startMin))}）
              </motion.button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const p = planItem;
                  setPlanItem(null);
                  setDraft({ kind: 'plan', date: p.plan!.date, startMin: p.startMin, endMin: p.endMin, plan: p.plan });
                }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.08] py-3 text-[14px] font-semibold"
              >
                <Pencil size={15} /> 予定を編集
              </button>
              <button
                onClick={() => {
                  const p = planItem;
                  setPlanItem(null);
                  if (p.session) setDraft({ kind: 'record', date: selected, startMin: p.actual!.startMin, endMin: p.actual!.endMin, session: p.session });
                  else setDraft({ kind: 'record', date: selected, startMin: p.startMin, endMin: Math.min(p.endMin, isToday ? Math.floor(minutesOfDay(Date.now())) : p.endMin), plan: undefined });
                }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white/[0.08] py-3 text-[14px] font-semibold"
              >
                <NotebookPen size={15} /> {planItem.session ? '実績を編集' : '実績を記録'}
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

// ───────────────────────── 部品 ─────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-3 text-center">
      <p className="text-[11px] font-semibold text-white/45">{label}</p>
      <p className="tabular mt-0.5 text-[18px] font-bold tracking-tight" style={{ color }}>{value}</p>
    </div>
  );
}

function Anchor({ icon, time, label, color }: { icon: ReactNode; time: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-[44px] shrink-0 place-items-center rounded-full ml-1.5" style={{ background: alpha(color, 0.16), color, boxShadow: `inset 0 0 0 1px ${alpha(color, 0.3)}` }}>
        {icon}
      </span>
      <div className="leading-tight">
        <p className="tabular text-[12px] font-semibold text-white/45">{time}</p>
        <p className="text-[14px] font-medium text-white/75">{label}</p>
      </div>
    </div>
  );
}

/** アイテム間のつなぎ線。空き時間に応じて高さが伸びる */
function Gap({ minutes, fromColor, toColor, label = false, height }: { minutes: number; fromColor: string; toColor: string; label?: boolean; height?: number }) {
  const m = Math.max(0, minutes);
  const h = height ?? Math.max(14, Math.min(96, m * 0.45));
  const showLabel = label && m >= 20;
  return (
    <div className="relative flex items-center" style={{ height: showLabel ? Math.max(h, 40) : h }}>
      <span
        className="absolute left-[29px] top-0 h-full w-[2px] rounded-full"
        style={{ background: `repeating-linear-gradient(180deg, ${alpha(fromColor, 0.55)} 0 4px, transparent 4px 8px)`, maskImage: `linear-gradient(180deg, #000, #000)` }}
      />
      <span className="absolute left-[29px] top-0 h-full w-[2px] opacity-60" style={{ background: `linear-gradient(180deg, ${alpha(fromColor, 0.35)}, ${alpha(toColor, 0.35)})` }} />
      {showLabel && <span className="tabular ml-[60px] text-[12px] text-white/35">空き時間 {fmtDuration(m)}</span>}
    </div>
  );
}

function NowLine({ nowMin, nextIn }: { nowMin: number; nextIn?: number }) {
  return (
    <div className="relative flex items-center" style={{ height: 30 }}>
      <motion.span
        className="absolute left-[24px] h-3 w-3 rounded-full bg-ember"
        animate={{ boxShadow: ['0 0 0 0 rgba(255,138,76,0.6)', '0 0 0 8px rgba(255,138,76,0)'] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <span className="absolute left-[44px] right-0 h-px bg-gradient-to-r from-ember/80 via-ember/30 to-transparent" />
      <span className="tabular relative ml-[60px] rounded-full bg-ember px-2.5 py-0.5 text-[12px] font-bold text-night-950">
        いま {fmtClock(nowMin)}
      </span>
      {nextIn != null && <span className="tabular relative ml-2 rounded-full bg-night-950/60 px-2 py-0.5 text-[11px] font-semibold text-ember">次まで {fmtDuration(nextIn, true)}</span>}
    </div>
  );
}

function Row({ item, live, past, nowMin, onClick }: { item: TimelineItem; live: boolean; past: boolean; nowMin: number | null; onClick: () => void }) {
  const color = item.subject?.color ?? '#ffffff';
  const dur = item.endMin - item.startMin;
  const h = Math.max(52, Math.min(150, dur * 1.05));
  const filled = item.done;
  const missed = item.kind === 'plan' && !item.done && past;
  const liveProg = live && nowMin != null ? (nowMin - item.startMin) / dur : 0;

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.98 }}
      transition={spring}
      onClick={onClick}
      className="group flex w-full items-stretch gap-3 text-left"
    >
      {/* カプセル */}
      <span
        className="relative ml-1.5 flex w-[44px] shrink-0 justify-center overflow-hidden rounded-full pt-3"
        style={{
          height: h,
          background: filled ? `linear-gradient(180deg, ${color}, ${alpha(color, 0.75)})` : alpha(color, missed ? 0.06 : 0.12),
          boxShadow: filled ? `0 8px 24px -10px ${alpha(color, 0.9)}, inset 0 1px 0 rgba(255,255,255,0.35)` : `inset 0 0 0 1.5px ${alpha(color, missed ? 0.25 : 0.55)}`,
          color: filled ? '#0C1224' : color,
          borderStyle: 'dashed',
        }}
      >
        {live && !filled && <span className="absolute inset-x-0 top-0" style={{ height: `${liveProg * 100}%`, background: alpha(color, 0.45) }} />}
        <span className="relative">{item.subject && <SubjectIcon subject={item.subject} size={18} />}</span>
      </span>
      {/* 内容 */}
      <span className="flex min-w-0 flex-1 items-start justify-between gap-2 py-1">
        <span className="min-w-0">
          <span className="tabular block text-[12px] font-medium text-white/45">
            {fmtClock(item.startMin)} – {fmtClock(item.endMin)} · {fmtDuration(dur)}
            {item.kind === 'session' && item.session?.source === 'manual' && <span className="ml-1.5 rounded bg-white/10 px-1 py-px text-[10px]">手動</span>}
          </span>
          <span className={`mt-0.5 block truncate text-[16px] font-semibold ${missed ? 'text-white/40 line-through decoration-white/20' : ''}`}>{item.title}</span>
          <span className="mt-0.5 block truncate text-[12px] text-white/45">
            {item.subject?.name}
            {item.kind === 'plan' && item.actual ? ` · 実績 ${fmtDuration(item.actual.minutes)}` : ''}
            {item.kind === 'session' && item.note && item.title !== item.note ? ` · ${item.note}` : ''}
            {live && <span className="ml-1 font-semibold text-ember">· 進行中</span>}
          </span>
        </span>
        <span
          className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors"
          style={{ background: filled ? color : 'transparent', boxShadow: filled ? 'none' : `inset 0 0 0 1.5px ${alpha(color, 0.5)}`, color: '#0C1224' }}
        >
          {filled && <Check size={14} strokeWidth={3.2} />}
        </span>
      </span>
    </motion.button>
  );
}

function AddOption({ icon, color, title, desc, onClick }: { icon: ReactNode; color: string; title: string; desc: string; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick} className="flex items-center gap-3.5 rounded-2xl bg-white/[0.06] p-4 text-left">
      <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: alpha(color, 0.18), color }}>{icon}</span>
      <span>
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[12px] text-white/50">{desc}</span>
      </span>
    </motion.button>
  );
}

