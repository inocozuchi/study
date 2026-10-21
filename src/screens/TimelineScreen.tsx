import { useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { AnimatePresence, Reorder, motion, useDragControls } from 'framer-motion';
import { ArrowUpDown, CalendarDays, Check, GripVertical, ChevronLeft, ChevronRight, ExternalLink, MapPin, Moon, Pencil, Play, Plus, RefreshCw, Sunrise, NotebookPen, CalendarPlus } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { useTimer } from '@/store/TimerStore';
import { useNow } from '@/hooks/useNow';
import { buildTimeline, type TimelineItem } from '@/components/timeline/buildTimeline';
import { EntrySheet, draftFromNow, type EntryDraft } from '@/components/timeline/EntrySheet';
import { DayHoursSheet } from '@/components/timeline/DayHoursSheet';
import type { PlanBlock, Subject } from '@/types';
import { Sheet } from '@/components/ui/Sheet';
import { Pressable } from '@/components/ui/Pressable';
import { SubjectIcon } from '@/components/ui/SubjectBadge';
import { GlassCard } from '@/components/ui/GlassCard';
import { Segmented } from '@/components/ui/Segmented';
import { MonthCalendar, monthGridRange, type DayMarks } from '@/components/timeline/MonthCalendar';
import { resolveClientId, startConnect, useCalendarRange, type CalendarEvent } from '@/lib/googleCalendar';
import { addDays, dateKey, fmtClock, fmtDateJa, fmtDuration, fmtTime, minutesOfDay, parseDateKey, startOfDay, startOfMonth, startOfWeek, weekdayJa } from '@/lib/time';
import { alpha } from '@/lib/subjects';
import { spring, springSoft } from '@/lib/motion';

/** いまの線は操作の青（ほかの色を増やさない） */
const NOW_COLOR = '#0A6CE0';
/** Google カレンダーの予定はグレーで描く（色は科目のためにとっておく） */
const EVENT_COLOR = '#8E94A3';

type View = 'week' | 'month';
const VIEW_KEY = 'focus-trail:timeline-view';

export function TimelineScreen({ onStartFocus }: { onStartFocus: () => void }) {
  const { plans, sessions, subjectById, settings, savePlan } = useApp();
  const DAY_START = settings.wakeMin;
  const DAY_END = Math.max(settings.sleepMin, DAY_START + 60);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [reorder, setReorder] = useState(false);
  const { startPlanned, timer } = useTimer();
  const now = useNow(30_000);
  const [selected, setSelected] = useState(() => dateKey(now));
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [planItem, setPlanItem] = useState<TimelineItem | null>(null);
  const lastPlan = useRef<TimelineItem | null>(null);
  if (planItem) lastPlan.current = planItem;
  const pi = lastPlan.current;
  const [addMenu, setAddMenu] = useState(false);
  const [eventItem, setEventItem] = useState<CalendarEvent | null>(null);
  const lastEvent = useRef<CalendarEvent | null>(null);
  if (eventItem) lastEvent.current = eventItem;
  const ev = lastEvent.current;
  const [view, setViewState] = useState<View>(() => {
    try {
      return (localStorage.getItem(VIEW_KEY) as View) || 'week';
    } catch {
      return 'week';
    }
  });
  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* 次に開いたとき週に戻るだけ */
    }
  };

  const selDate = parseDateKey(selected);
  const isToday = selected === dateKey(now);
  const weekStart = startOfWeek(selDate);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const [month, setMonth] = useState(() => startOfMonth(selDate));
  // 選んだ日が表示中の月の外になったら（週で動いたときなど）月も合わせる
  const selMonth = startOfMonth(selDate);
  if (view === 'week' && selMonth !== month) setMonth(selMonth);

  // Google カレンダー：表示中の月（6 週分）と今の週をまとめて読む
  const grid = monthGridRange(month);
  const range = { from: Math.min(grid.from, weekStart), to: Math.max(grid.to, addDays(weekStart, 7).getTime()) };
  const google = useCalendarRange(range.from, range.to, settings.googleHiddenCalendars);
  const day0 = startOfDay(selDate);
  const dayEvents = google.events.filter((e) => e.end > day0 && e.start < day0 + 86_400_000);
  const allDay = dayEvents.filter((e) => e.allDay);

  const minutesByDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of sessions) {
      const k = dateKey(s.start);
      m[k] = (m[k] ?? 0) + s.minutes;
    }
    return m;
  }, [sessions]);

  const items = useMemo(
    () => buildTimeline(selected, selDate.getTime(), plans, sessions, (id) => subjectById(id), dayEvents),
    [selected, plans, sessions, subjectById, google.events], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // 月のカレンダーの点：その日の科目の色と、Google の予定の有無
  const marks = useMemo(() => {
    const m: Record<string, DayMarks> = {};
    const add = (k: string, color?: string) => {
      const d = (m[k] ??= { colors: [], events: false });
      if (color && !d.colors.includes(color)) d.colors.push(color);
    };
    for (const s of sessions) add(dateKey(s.start), subjectById(s.subjectId)?.color);
    for (const p of plans) add(p.date, subjectById(p.subjectId)?.color);
    for (const e of google.events) {
      for (let t = startOfDay(e.start); t < e.end; t = addDays(t, 1).getTime()) {
        (m[dateKey(t)] ??= { colors: [], events: false }).events = true;
        if (e.end - e.start < 86_400_000 && !e.allDay) break;
      }
    }
    return m;
  }, [sessions, plans, google.events, subjectById]);

  const dayPlans = useMemo(() => plans.filter((p) => p.date === selected).sort((a, b) => a.startMin - b.startMin), [plans, selected]);
  const nowMin = isToday ? minutesOfDay(now) : null;
  const focusMin = items.filter((i) => i.done && i.kind !== 'event').reduce((a, i) => a + (i.actual?.minutes ?? i.session?.minutes ?? 0), 0);
  const planCount = items.filter((i) => i.kind === 'plan').length;
  const planDone = items.filter((i) => i.kind === 'plan' && i.done).length;
  const next = nowMin != null ? items.find((i) => i.kind === 'plan' && !i.done && i.startMin > nowMin) : undefined;
  const current = nowMin != null ? items.find((i) => i.startMin <= nowMin && i.endMin > nowMin) : undefined;

  const shiftWeek = (d: number) => setSelected(dateKey(addDays(selDate, d * 7)));

  return (
    <div className="mx-auto max-w-xl px-5 pb-nav pt-safe">
      {/* ヘッダー */}
      <header className="flex items-end justify-between pt-3">
        <div>
          <p className="section-label">{isToday ? '今日' : fmtDateJa(selDate, false)}</p>
          <h1 className="page-title mt-0.5">タイムライン</h1>
        </div>
        <Pressable onClick={() => setAddMenu(true)} aria-label="追加" className="grid h-11 w-11 place-items-center rounded-full bg-accent text-white shadow-raised">
          <Plus size={22} strokeWidth={2.6} />
        </Pressable>
      </header>

      <Segmented<View>
        value={view}
        onChange={setView}
        className="mt-4"
        options={[
          { value: 'week', label: '週' },
          { value: 'month', label: '月' },
        ]}
      />

      {view === 'month' ? (
        <div className="mt-3">
          <MonthCalendar
            month={month}
            selected={selected}
            today={dateKey(now)}
            marks={marks}
            onSelect={setSelected}
            onMonth={(d) => {
              const m = new Date(month);
              setMonth(new Date(m.getFullYear(), m.getMonth() + d, 1).getTime());
            }}
          />
        </div>
      ) : (
        /* 週ストリップ */
        <div className="card mt-3 flex items-center gap-1 px-1.5 py-2">
          <button aria-label="前の週" onClick={() => shiftWeek(-1)} className="hit grid h-8 w-6 place-items-center text-accent-ink">
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
          <div className="relative grid flex-1 grid-cols-7">
            {/* 選択ピル（layoutId を使わず位置を直接動かす） */}
            <motion.span
              className="absolute inset-y-0 left-0 w-[calc(100%/7)] rounded-card bg-accent-soft"
              initial={false}
              animate={{ x: `${Math.max(0, week.findIndex((d) => dateKey(d) === selected)) * 100}%`, opacity: week.some((d) => dateKey(d) === selected) ? 1 : 0 }}
              transition={spring}
            />
            {week.map((d) => {
              const k = dateKey(d);
              const active = k === selected;
              const today = k === dateKey(now);
              const mins = minutesByDay[k] ?? 0;
              const ring = Math.min(1, mins / 180);
              return (
                <motion.button key={k} onClick={() => setSelected(k)} className="relative flex flex-col items-center gap-1 rounded-card py-1.5">
                  <span className={`relative text-[11px] font-bold ${active || today ? 'text-accent-ink' : 'text-fg-2'}`}>{weekdayJa(d)}</span>
                  <span className="relative grid h-8 w-8 place-items-center">
                    {/* その日に集中した時間（3 時間で一周） */}
                    <svg viewBox="0 0 32 32" className="absolute inset-0 -rotate-90">
                      <circle cx="16" cy="16" r="14" fill="none" stroke="rgb(var(--c-line))" strokeWidth="2.5" />
                      {ring > 0 && <circle cx="16" cy="16" r="14" fill="none" stroke="rgb(var(--c-accent))" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={88} strokeDashoffset={88 * (1 - ring)} />}
                    </svg>
                    <span className={`tabular relative text-[13px] font-extrabold ${active ? 'text-accent-ink' : today ? 'text-fg' : 'text-fg-2'}`}>{d.getDate()}</span>
                  </span>
                  {marks[k]?.events && <span className="absolute bottom-0 h-[4px] w-[4px] rounded-full bg-fg-3" />}
                </motion.button>
              );
            })}
          </div>
          <button aria-label="次の週" onClick={() => shiftWeek(1)} className="hit grid h-8 w-6 place-items-center text-accent-ink">
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </div>
      )}

      {/* Google カレンダー：接続が切れた・読めないとき */}
      {(google.status === 'needs-auth' || google.status === 'error') && (
        <div className="card mt-3 flex items-center gap-3 px-4 py-3">
          <CalendarDays size={20} className="shrink-0 text-accent" />
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-fg-2">
            {google.status === 'needs-auth' ? 'Google カレンダーの接続が切れました（1 時間ごとに切れます）。表示しているのは前に読んだ予定です。' : google.message}
          </p>
          {google.status === 'needs-auth' && resolveClientId(settings.googleClientId) && (
            <button onClick={() => startConnect(resolveClientId(settings.googleClientId))} className="flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-3 py-1.5 text-[12.5px] font-bold text-accent-ink">
              <RefreshCw size={13} strokeWidth={2.6} /> 再接続
            </button>
          )}
        </div>
      )}

      {/* サマリー */}
      <GlassCard className="mt-3 grid grid-cols-3 divide-x divide-line py-3.5">
        <Stat label="集中" value={fmtDuration(focusMin, true)} />
        <Stat label="予定の達成" value={planCount ? `${planDone}/${planCount}` : '—'} />
        <Stat
          label={next ? '次の予定まで' : isToday ? '残りの予定' : '標高'}
          value={next && nowMin != null ? fmtDuration(next.startMin - nowMin, true) : isToday ? 'なし' : `+${(focusMin * 10).toLocaleString()}m`}
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
            className="card mt-3 flex w-full items-center gap-3 p-3 text-left active:bg-accent-soft"
          >
            <span className="grid h-10 w-10 place-items-center rounded-chip" style={{ background: alpha(next.subject?.color ?? '#8E94A3', 0.16), color: next.subject?.color }}>
              {next.subject && <SubjectIcon subject={next.subject} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-bold text-fg-2">次の予定 · {fmtClock(next.startMin)} から</span>
              <span className="block truncate text-[14px] font-bold">{next.title}</span>
            </span>
            <span className="tabular rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-bold text-accent-ink">あと{fmtDuration(next.startMin - (nowMin ?? 0), true)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* タイムライン本体 */}
      <motion.div key={selected} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={springSoft} className="mt-5">
        {/* Google カレンダーの終日の予定 */}
        {allDay.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5 pl-[60px]">
            {allDay.map((e) => (
              <button key={e.id} onClick={() => setEventItem(e)} className="flex max-w-full items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[12px] font-bold shadow-card">
                <CalendarDays size={13} className="shrink-0 text-fg-2" />
                <span className="text-fg-2">終日</span>
                <span className="truncate">{e.title}</span>
              </button>
            ))}
          </div>
        )}
        {/* 予定が 2 つ以上ある日は並べ替えられる */}
        {dayPlans.length >= 2 && (
          <div className="mb-3 flex justify-end">
            {!reorder && (
              <button onClick={() => setReorder(true)} className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[12px] font-bold text-accent-ink shadow-card">
                <ArrowUpDown size={14} strokeWidth={2.4} /> 予定を並べ替え
              </button>
            )}
          </div>
        )}
        {reorder ? (
          <ReorderPlans key={selected}
            plans={dayPlans}
            subjectById={subjectById}
            onCancel={() => setReorder(false)}
            onSave={(next) => {
              for (const p of next) savePlan(p);
              setReorder(false);
            }}
          />
        ) : (
        <>
        <Anchor icon={<Sunrise size={16} />} time={fmtClock(DAY_START)} label="起床 · おはよう、旅のはじまり" onClick={() => setHoursOpen(true)} />
        {items.length === 0 && (
          <>
            <Gap minutes={0} height={28} fromColor={EVENT_COLOR} toColor={EVENT_COLOR} />
            <div className="ml-[60px] rounded-card border border-dashed border-line-strong p-4 text-[12.5px] leading-relaxed text-fg-2">
              この日の予定や記録はまだありません。<br />右上の ＋ から予定を立てたり、あとから記録を追加できます。
            </div>
          </>
        )}
        {(() => {
          let prevEnd = DAY_START;
          let prevColor = EVENT_COLOR;
          let nowPlaced = nowMin == null || nowMin < DAY_START;
          const out: ReactElement[] = [];
          items.forEach((it, idx) => {
            const color = it.kind === 'event' ? EVENT_COLOR : it.subject?.color ?? EVENT_COLOR;
            const gapStart = Math.max(prevEnd, DAY_START);
            const gap = it.startMin - gapStart;
            // 現在時刻インジケータ（アイテムの間）
            if (!nowPlaced && nowMin != null && nowMin < it.startMin && nowMin >= prevEnd - 0.01) {
              out.push(<Gap key={`g1-${it.key}`} minutes={nowMin - gapStart} fromColor={prevColor} toColor={NOW_COLOR} />);
              out.push(<NowLine key="now" nowMin={nowMin} nextIn={it.startMin - nowMin} />);
              out.push(<Gap key={`g2-${it.key}`} minutes={it.startMin - nowMin} fromColor={NOW_COLOR} toColor={color} label />);
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
                  it.kind === 'event'
                    ? setEventItem(it.event!)
                    : it.kind === 'plan'
                      ? setPlanItem(it)
                      : it.session && setDraft({ kind: 'record', date: selected, startMin: it.startMin, endMin: it.endMin, session: it.session })
                }
              />,
            );
            prevEnd = Math.max(prevEnd, it.endMin);
            prevColor = color;
          });
          if (!nowPlaced && nowMin != null) {
            out.push(<Gap key="g-now" minutes={nowMin - Math.max(prevEnd, DAY_START)} fromColor={prevColor} toColor={NOW_COLOR} label />);
            out.push(<NowLine key="now" nowMin={nowMin} />);
            prevColor = NOW_COLOR;
            prevEnd = nowMin;
          }
          if (items.length) out.push(<Gap key="g-end" minutes={DAY_END - Math.max(prevEnd, DAY_START)} fromColor={prevColor} toColor={EVENT_COLOR} label />);
          return out;
        })()}
        <Anchor icon={<Moon size={16} />} time={fmtClock(DAY_END)} label="就寝 · おやすみ、焚き火を消して" onClick={() => setHoursOpen(true)} />
        </>
        )}
      </motion.div>

      <DayHoursSheet open={hoursOpen} onClose={() => setHoursOpen(false)} />

      {/* 追加メニュー */}
      <Sheet open={addMenu} onClose={() => setAddMenu(false)} title="タイムラインに追加" subtitle={fmtDateJa(selDate)}>
        <div className="grid gap-2 pb-4">
          <AddOption
            icon={<NotebookPen size={20} />}
            title="あとから記録"
            desc="電車内や紙での勉強時間を、開始・終了時刻で記録"
            onClick={() => {
              setAddMenu(false);
              setDraft(draftFromNow('record', selected));
            }}
          />
          <AddOption
            icon={<CalendarPlus size={20} />}
            title="予定を立てる"
            desc="学習ブロックを置いて、時間になったら出発"
            onClick={() => {
              setAddMenu(false);
              setDraft(draftFromNow('plan', selected, settings.wakeMin));
            }}
          />
        </div>
      </Sheet>

      <EntrySheet open={!!draft} draft={draft} onClose={() => setDraft(null)} />

      {/* 予定の詳細（閉じるアニメーションの間も中身を残す） */}
      <Sheet open={!!planItem} onClose={() => setPlanItem(null)} title={pi?.title} subtitle={pi && `${fmtClock(pi.startMin)} – ${fmtClock(pi.endMin)} · ${fmtDuration(pi.endMin - pi.startMin)}`}>
        {pi && (
          <div className="space-y-3 pb-4">
            <div className="group-box flex items-center gap-3 p-3">
              <span className="grid h-10 w-10 place-items-center rounded-chip" style={{ background: alpha(pi.subject?.color ?? '#8E94A3', 0.16), color: pi.subject?.color }}>
                {pi.subject && <SubjectIcon subject={pi.subject} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold">{pi.subject?.name}</p>
                <p className="text-[12px] text-fg-2">{pi.subject?.mountainName}</p>
              </div>
              {pi.done && <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[12px] font-bold text-accent-ink"><Check size={13} strokeWidth={3} /> 達成</span>}
            </div>
            {pi.actual && (
              <p className="px-1 text-[12.5px] text-fg-2">
                実績 {fmtClock(pi.actual.startMin)} – {fmtClock(pi.actual.endMin)}（{fmtDuration(pi.actual.minutes)}）{pi.note ? ` · ${pi.note}` : ''}
              </p>
            )}
            {!pi.done && isToday && timer.phase !== 'focus' && pi.subject && (
              <motion.button
                onClick={() => {
                  if (startPlanned(pi.subject!.id, pi.endMin - pi.startMin)) {
                    setPlanItem(null);
                    onStartFocus();
                  }
                }}
                className="btn-primary w-full"
              >
                <Play size={16} fill="currentColor" /> この予定で出発する（{fmtDuration(Math.min(180, pi.endMin - pi.startMin))}）
              </motion.button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const p = pi;
                  setPlanItem(null);
                  setDraft({ kind: 'plan', date: p.plan!.date, startMin: p.startMin, endMin: p.endMin, plan: p.plan });
                }}
                className="btn-secondary text-[13px]"
              >
                <Pencil size={15} /> 予定を編集
              </button>
              <button
                onClick={() => {
                  const p = pi;
                  setPlanItem(null);
                  if (p.session) setDraft({ kind: 'record', date: selected, startMin: p.actual!.startMin, endMin: p.actual!.endMin, session: p.session });
                  else {
                    // 今日のまだ終わっていない予定は「今」までにする。まだ始まっていなければ予定の長さぶん遡る
                    const end = Math.min(p.endMin, isToday ? Math.floor(minutesOfDay(Date.now())) : p.endMin);
                    const start = end - p.startMin >= 5 ? p.startMin : Math.max(0, end - (p.endMin - p.startMin));
                    setDraft({ kind: 'record', date: selected, startMin: start, endMin: end, plan: undefined });
                  }
                }}
                className="btn-secondary text-[13px]"
              >
                <NotebookPen size={15} /> {pi.session ? '実績を編集' : '実績を記録'}
              </button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Google カレンダーの予定（見るだけ。この時間で学習の予定を立てられる） */}
      <Sheet
        open={!!eventItem}
        onClose={() => setEventItem(null)}
        title={ev?.title}
        subtitle={ev && (ev.allDay ? `終日 · ${ev.calendarName}` : `${fmtTime(ev.start)} – ${fmtTime(ev.end)} · ${ev.calendarName}`)}
      >
        {ev && (
          <div className="space-y-3 pb-4">
            <div className="group-box space-y-2 p-3.5 text-[12.5px] text-fg-2">
              <p className="flex items-center gap-2"><CalendarDays size={15} className="shrink-0" /> Google カレンダー「{ev.calendarName}」の予定</p>
              {ev.location && <p className="flex items-center gap-2"><MapPin size={15} className="shrink-0" /> <span className="truncate">{ev.location}</span></p>}
            </div>
            {!ev.allDay && (
              <button
                onClick={() => {
                  const e = ev;
                  setEventItem(null);
                  const sm = e.start <= day0 ? 0 : minutesOfDay(e.start);
                  const em = e.end >= day0 + 86_400_000 ? 24 * 60 - 1 : minutesOfDay(e.end);
                  setDraft({ kind: 'plan', date: selected, startMin: sm, endMin: Math.max(sm + 5, em) });
                }}
                className="btn-primary w-full"
              >
                <CalendarPlus size={17} /> この時間で学習の予定を立てる
              </button>
            )}
            {ev.url && (
              <a href={ev.url} target="_blank" rel="noreferrer" className="btn-secondary w-full text-[13px]">
                <ExternalLink size={15} /> Google カレンダーで開く
              </a>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}

// ───────────────────────── 部品 ─────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 text-center">
      <p className="text-[12px] font-bold text-fg-2">{label}</p>
      <p className="tabular mt-0.5 text-[18px] font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

/** 起床・就寝の印。押すと時刻を変えられる */
function Anchor({ icon, time, label, onClick }: { icon: ReactNode; time: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-card text-left active:bg-accent-soft" aria-label={`${label} ${time}（時刻を変更）`}>
      <span className="ml-1.5 grid h-11 w-[44px] shrink-0 place-items-center rounded-full bg-surface text-accent shadow-card">
        {icon}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="tabular block text-[14px] font-extrabold">{time}</span>
        <span className="block text-[12px] font-medium text-fg-2">{label}</span>
      </span>
      <span className="mr-1 flex items-center gap-1 rounded-full bg-fill px-2.5 py-1 text-[11.5px] font-bold text-fg-2">
        <Pencil size={12} /> 変更
      </span>
    </button>
  );
}

/**
 * 予定の並べ替え：つまみをドラッグして順番を入れ替える。
 * 時刻は「最初の予定の開始」から、元の並びの空き時間を保ったまま詰め直す（長さは各予定のまま）。
 */
function ReorderPlans({ plans, subjectById, onCancel, onSave }: { plans: PlanBlock[]; subjectById: (id: string | null | undefined) => Subject | undefined; onCancel: () => void; onSave: (p: PlanBlock[]) => void }) {
  const [order, setOrder] = useState(() => plans.map((p) => p.id));
  const byId = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);
  const laid = useMemo(() => {
    const orig = [...plans].sort((a, b) => a.startMin - b.startMin);
    const gaps = orig.slice(0, -1).map((p, i) => Math.max(0, orig[i + 1].startMin - p.endMin));
    let t = orig[0]?.startMin ?? 0;
    return order.map((id, i) => {
      const p = byId.get(id)!;
      const len = p.endMin - p.startMin;
      const start = i === 0 ? t : t + (gaps[i - 1] ?? 0);
      t = Math.min(24 * 60, start + len);
      return { ...p, startMin: start, endMin: t };
    });
  }, [order, plans, byId]);

  return (
    <div>
      <p className="mb-2 px-1 text-[12px] text-fg-2">右のつまみをドラッグして順番を入れ替えます。時刻は自動で詰め直します。</p>
      <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-2">
        {laid.map((p) => (
          <ReorderRow key={p.id} plan={p} subject={subjectById(p.subjectId)} />
        ))}
      </Reorder.Group>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="btn-secondary">やめる</button>
        <button onClick={() => onSave(laid)} className="btn-primary">
          <Check size={16} strokeWidth={3} /> 完了
        </button>
      </div>
    </div>
  );
}

function ReorderRow({ plan, subject }: { plan: PlanBlock; subject?: Subject }) {
  const controls = useDragControls();
  const color = subject?.color ?? EVENT_COLOR;
  return (
    <Reorder.Item
      value={plan.id}
      dragListener={false}
      dragControls={controls}
      className="card flex items-center gap-3 px-3 py-3"
      whileDrag={{ scale: 1.03, boxShadow: '0 18px 36px -12px rgba(0,0,0,0.35)', zIndex: 10 }}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-chip" style={{ background: alpha(color, 0.16), color }}>
        {subject && <SubjectIcon subject={subject} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="tabular block text-[12px] font-bold text-fg-2">
          {fmtClock(plan.startMin)} – {fmtClock(plan.endMin)} · {fmtDuration(plan.endMin - plan.startMin)}
        </span>
        <span className="block truncate text-[14px] font-bold">{plan.title || subject?.name || '予定'}</span>
      </span>
      <span
        onPointerDown={(e) => controls.start(e)}
        className="grid h-11 w-9 shrink-0 cursor-grab touch-none place-items-center rounded-chip text-fg-3 active:bg-fill"
        aria-label="ドラッグして並べ替え"
        role="button"
      >
        <GripVertical size={20} />
      </span>
    </Reorder.Item>
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
      {showLabel && <span className="tabular ml-[60px] text-[12px] text-fg-3">空き時間 {fmtDuration(m)}</span>}
    </div>
  );
}

function NowLine({ nowMin, nextIn }: { nowMin: number; nextIn?: number }) {
  return (
    <div className="relative flex items-center" style={{ height: 30 }}>
      <motion.span
        className="absolute left-[24px] h-3 w-3 rounded-full bg-accent"
        animate={{ boxShadow: ['0 0 0 0 rgb(var(--c-accent) / 0.5)', '0 0 0 8px rgb(var(--c-accent) / 0)'] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <span className="absolute left-[44px] right-0 h-px bg-gradient-to-r from-accent/70 via-accent/25 to-transparent" />
      <span className="tabular relative ml-[60px] rounded-full bg-accent px-2.5 py-0.5 text-[12px] font-bold text-white">
        いま {fmtClock(nowMin)}
      </span>
      {nextIn != null && <span className="tabular relative ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent-ink">次まで {fmtDuration(nextIn, true)}</span>}
    </div>
  );
}

function Row({ item, live, past, nowMin, onClick }: { item: TimelineItem; live: boolean; past: boolean; nowMin: number | null; onClick: () => void }) {
  const isEvent = item.kind === 'event';
  const color = isEvent ? EVENT_COLOR : item.subject?.color ?? EVENT_COLOR;
  const dur = item.endMin - item.startMin;
  const h = Math.max(52, Math.min(150, dur * 1.05));
  const filled = item.done;
  const missed = item.kind === 'plan' && !item.done && past;
  const liveProg = live && nowMin != null ? (nowMin - item.startMin) / dur : 0;

  return (
    <motion.button
      layout
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
          color: filled ? '#fff' : color,
          borderStyle: 'dashed',
        }}
      >
        {live && !filled && <span className="absolute inset-x-0 top-0" style={{ height: `${liveProg * 100}%`, background: alpha(color, 0.45) }} />}
        <span className="relative">{isEvent ? <CalendarDays size={17} /> : item.subject && <SubjectIcon subject={item.subject} size={18} />}</span>
      </span>
      {/* 内容 */}
      <span className="flex min-w-0 flex-1 items-start justify-between gap-2 py-1">
        <span className="min-w-0">
          <span className="tabular block text-[12px] font-medium text-fg-2">
            {fmtClock(item.startMin)} – {fmtClock(item.endMin)} · {fmtDuration(dur)}
            {item.kind === 'session' && item.session?.source === 'manual' && <span className="ml-1.5 rounded bg-fill px-1 py-px text-[11px]">手動</span>}
          </span>
          <span className={`mt-0.5 block truncate text-[15px] font-bold ${missed ? 'text-fg-2 line-through decoration-fg-3' : ''}`}>{item.title}</span>
          <span className="mt-0.5 block truncate text-[12px] text-fg-2">
            {isEvent ? `Google · ${item.event?.calendarName}` : item.subject?.name}
            {item.kind === 'plan' && item.actual ? ` · 実績 ${fmtDuration(item.actual.minutes)}` : ''}
            {item.kind === 'session' && item.note && item.title !== item.note ? ` · ${item.note}` : ''}
            {live && <span className="ml-1 font-bold text-accent-ink">· 進行中</span>}
          </span>
        </span>
        {!isEvent && (
          <span
            className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors"
            style={{ background: filled ? color : 'transparent', boxShadow: filled ? 'none' : `inset 0 0 0 1.5px ${alpha(color, 0.5)}`, color: '#fff' }}
          >
            {filled && <Check size={14} strokeWidth={3.2} />}
          </span>
        )}
      </span>
    </motion.button>
  );
}

function AddOption({ icon, title, desc, onClick }: { icon: ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} className="group-box flex items-center gap-3.5 p-4 text-left active:bg-accent-soft">
      <span className="grid h-11 w-11 place-items-center rounded-chip bg-accent-soft text-accent-ink">{icon}</span>
      <span>
        <span className="block text-[14px] font-bold">{title}</span>
        <span className="mt-0.5 block text-[12px] text-fg-2">{desc}</span>
      </span>
    </motion.button>
  );
}

