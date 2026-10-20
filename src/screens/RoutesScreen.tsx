import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, Mountain, Pencil, Plus } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { useTimer } from '@/store/TimerStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Pressable } from '@/components/ui/Pressable';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { SubjectBadge } from '@/components/ui/SubjectBadge';
import { MountainArt } from '@/components/routes/MountainArt';
import { SummitStamp } from '@/components/routes/SummitStamp';
import { SubjectEditorSheet } from '@/components/routes/SubjectEditorSheet';
import { METERS_PER_MINUTE, STAGES, fmtMeters, routeProgress, stageFor } from '@/lib/altitude';
import { fmtDateJa, fmtDuration, fmtTime } from '@/lib/time';
import { alpha } from '@/lib/subjects';
import { springSoft } from '@/lib/motion';
import type { Subject } from '@/types';

type View = 'routes' | 'journal';

export function RoutesScreen() {
  const { activeSubjects, minutesBySubject } = useApp();
  const [view, setView] = useState<View>('routes');
  const [editing, setEditing] = useState<Subject | null | undefined>(undefined);
  const [detail, setDetail] = useState<Subject | null>(null);

  const ongoing = activeSubjects.filter((s) => !s.summitedAt);
  const summited = activeSubjects.filter((s) => s.summitedAt).sort((a, b) => (b.summitedAt ?? 0) - (a.summitedAt ?? 0));

  return (
    <div className="mx-auto max-w-xl px-5 pb-40 pt-safe">
      <header className="flex items-end justify-between pt-2">
        <div>
          <p className="text-[13px] font-semibold text-fg-2">{activeSubjects.length} ルート · 登頂 {summited.length}</p>
          <h1 className="text-[32px] font-bold leading-tight tracking-tight">山岳ルート</h1>
        </div>
        <Pressable onClick={() => setEditing(null)} aria-label="ルートを追加" className="grid h-11 w-11 place-items-center rounded-full bg-accent text-white shadow-raised">
          <Plus size={22} strokeWidth={2.6} />
        </Pressable>
      </header>

      <Segmented<View>
        value={view}
        onChange={setView}
        className="mt-4"
        options={[
          { value: 'routes', label: '登山中のルート' },
          { value: 'journal', label: '旅の記録帳' },
        ]}
      />

      {view === 'routes' ? (
        <div className="mt-4 space-y-3">
          {ongoing.map((s, i) => (
            <RouteCard key={s.id} subject={s} minutes={minutesBySubject[s.id] ?? 0} delay={i * 0.05} onClick={() => setDetail(s)} />
          ))}
          {summited.map((s, i) => (
            <RouteCard key={s.id} subject={s} minutes={minutesBySubject[s.id] ?? 0} delay={(ongoing.length + i) * 0.05} onClick={() => setDetail(s)} />
          ))}
          {activeSubjects.length === 0 && (
            <GlassCard className="p-6 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent-ink"><Mountain size={28} strokeWidth={1.9} /></span>
              <p className="mt-2 text-[15px] font-semibold">まだルートがありません</p>
              <p className="mt-1 text-[13px] text-fg-2">勉強したい科目ごとに、登る山を決めましょう</p>
              <button onClick={() => setEditing(null)} className="mt-4 rounded-full bg-accent px-5 py-2.5 text-[14px] font-bold text-white">最初のルートをひらく</button>
            </GlassCard>
          )}
        </div>
      ) : (
        <Journal summited={summited} />
      )}

      <RouteDetailSheet subject={detail} onClose={() => setDetail(null)} onEdit={(s) => { setDetail(null); setEditing(s); }} />
      <SubjectEditorSheet open={editing !== undefined} subject={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}

function RouteCard({ subject, minutes, delay, onClick }: { subject: Subject; minutes: number; delay: number; onClick: () => void }) {
  const prog = routeProgress(subject, minutes);
  const stage = subject.summitedAt ? STAGES[4] : stageFor(prog);
  const remain = Math.max(0, subject.targetMinutes - minutes);
  return (
    <GlassCard delay={delay} className="overflow-hidden" whileTap={{ scale: 0.985 }} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}>
      <div className="relative h-36">
        <MountainArt stage={stage.index} color={subject.color} progress={prog} summited={!!subject.summitedAt} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-night-950/80 via-night-950/10 to-transparent" />
        {/* 絵の上の文字は外観に関係なく白 */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-bold text-white">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: stage.tint }} />
          {subject.summitedAt ? '登頂済み' : `${stage.index + 1}. ${stage.name}`}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-2.5">
            <SubjectBadge subject={subject} size={38} />
            <div className="leading-tight">
              <p className="text-[17px] font-bold">{subject.name}</p>
              <p className="text-[12px] text-white/75">{subject.mountainName}</p>
            </div>
          </div>
          <p className="tabular text-[22px] font-bold tracking-tight">{Math.floor(prog * 100)}<span className="text-[13px] text-white/75">%</span></p>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-fill">
          <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${alpha(subject.color, 0.6)}, ${subject.color})` }} initial={{ width: 0 }} animate={{ width: `${prog * 100}%` }} transition={{ ...springSoft, delay: delay + 0.15 }} />
        </div>
        <div className="tabular mt-2 flex justify-between text-[12px] text-fg-2">
          <span>標高 {fmtMeters(minutes * METERS_PER_MINUTE)} / {fmtMeters(subject.targetMinutes * METERS_PER_MINUTE)}</span>
          <span>{subject.summitedAt ? `${fmtDateJa(subject.summitedAt, false)} 登頂` : `登頂まであと ${fmtDuration(remain)}`}</span>
        </div>
      </div>
    </GlassCard>
  );
}

function RouteDetailSheet({ subject, onClose, onEdit }: { subject: Subject | null; onClose: () => void; onEdit: (s: Subject) => void }) {
  const { minutesBySubject, sessions, subjectById } = useApp();
  const { setSubject, timer } = useTimer();
  const live = subject ? subjectById(subject.id) ?? subject : null;
  const minutes = live ? minutesBySubject[live.id] ?? 0 : 0;
  const prog = live ? routeProgress(live, minutes) : 0;
  const recent = useMemo(() => (live ? sessions.filter((s) => s.subjectId === live.id).slice(-5).reverse() : []), [live, sessions]);

  return (
    <Sheet
      open={!!live}
      onClose={onClose}
      title={live?.mountainName}
      subtitle={live && `${live.name} · 累計 ${fmtDuration(minutes)}`}
      action={live && (
        <Pressable onClick={() => onEdit(live)} className="flex h-8 items-center gap-1 rounded-full bg-fill px-3 text-[13px] font-semibold">
          <Pencil size={13} /> 編集
        </Pressable>
      )}
    >
      {live && (
        <div className="pb-4">
          <div className="overflow-hidden rounded-3xl">
            <MountainArt stage={live.summitedAt ? 4 : stageFor(prog).index} color={live.color} progress={prog} summited={!!live.summitedAt} className="h-40 w-full" />
          </div>

          <p className="section-label mb-3 mt-5">ルートの道のり</p>
          <ol className="relative">
            {STAGES.map((st, i) => {
              const reached = prog >= st.from || !!live.summitedAt;
              const nextFrom = STAGES[i + 1]?.from ?? 1;
              const current = reached && (prog < nextFrom || i === 4) && !(i === 4 && !live.summitedAt && prog < 1);
              const needMin = st.from * live.targetMinutes;
              return (
                <li key={st.index} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < STAGES.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-[2px] rounded-full" style={{ background: reached ? alpha(live.color, 0.6) : 'rgba(255,255,255,0.1)' }} />}
                  <span
                    className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-bold"
                    style={{ background: reached ? live.color : 'rgba(255,255,255,0.08)', color: reached ? '#0C1224' : 'rgba(255,255,255,0.4)', boxShadow: current ? `0 0 0 4px ${alpha(live.color, 0.25)}` : 'none' }}
                  >
                    {reached && !current ? <Check size={15} strokeWidth={3} /> : i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className={`text-[15px] font-semibold ${reached ? '' : 'text-fg-2'}`}>
                      {st.name}
                      {current && <span className="ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: alpha(live.color, 0.2), color: live.color }}>現在地</span>}
                    </p>
                    <p className="mt-0.5 text-[12px] text-fg-2">{st.description}</p>
                    <p className="tabular mt-0.5 text-[11px] text-fg-3">{i === 4 ? `登頂 ${fmtDuration(live.targetMinutes)}` : `${fmtDuration(needMin)} から`} · {fmtMeters(needMin * METERS_PER_MINUTE)}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {recent.length > 0 && (
            <>
              <p className="section-label mb-2 mt-5">最近の足あと</p>
              <div className="group-box divide-y divide-line rounded-2xl">
                {recent.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                    <span className="text-fg-2">{fmtDateJa(s.start, false)} {fmtTime(s.start)}{s.note ? ` · ${s.note}` : ''}</span>
                    <span className="tabular font-semibold">{fmtDuration(s.minutes)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {timer.phase !== 'focus' && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSubject(live.id);
                onClose();
              }}
              className="btn-primary mt-5 w-full"
            >
              このルートを次の登山に選ぶ
            </motion.button>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Journal({ summited }: { summited: Subject[] }) {
  const { activeSubjects, minutesBySubject } = useApp();
  const maxStage = useMemo(() => {
    let m = -1;
    for (const s of activeSubjects) {
      const idx = s.summitedAt ? 4 : stageFor(routeProgress(s, minutesBySubject[s.id] ?? 0)).index;
      m = Math.max(m, idx);
    }
    return m;
  }, [activeSubjects, minutesBySubject]);

  return (
    <div className="mt-4 space-y-6">
      <section>
        <SectionTitle>登頂スタンプ</SectionTitle>
        {summited.length ? (
          <div className="grid grid-cols-2 gap-3">
            {summited.map((s, i) => (
              <GlassCard key={s.id} delay={i * 0.05} className="flex flex-col items-center p-4 text-center">
                <motion.div initial={{ rotate: -20, scale: 0.7 }} animate={{ rotate: -6, scale: 1 }} transition={{ ...springSoft, delay: 0.1 + i * 0.05 }}>
                  <SummitStamp subject={s} size={112} date={s.summitedAt} />
                </motion.div>
                <p className="mt-2 text-[15px] font-bold">{s.mountainName}</p>
                <p className="text-[12px] text-fg-2">{s.name}</p>
                <p className="tabular mt-1.5 text-[11px] text-fg-2">{fmtDateJa(s.summitedAt!, false)} · {fmtDuration(minutesBySubject[s.id] ?? 0, true)}</p>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="p-5 text-center text-[13px] text-fg-2">最初の登頂で、ここに記念スタンプが押されます</GlassCard>
        )}
      </section>

      <section>
        <SectionTitle>風景図鑑 <span className="ml-1 text-fg-3">{maxStage + 1}/5</span></SectionTitle>
        <div className="space-y-3">
          {STAGES.map((st, i) => {
            const unlocked = i <= maxStage;
            return (
              <GlassCard key={st.index} delay={i * 0.04} className="relative overflow-hidden">
                <div className={`relative h-28 ${unlocked ? '' : 'blur-[6px] grayscale'}`}>
                  <MountainArt stage={i} color="#FFFFFF" showTrail={false} className="h-full w-full" />
                </div>
                {!unlocked && (
                  <div className="absolute inset-0 grid place-items-center bg-night-950/40">
                    <span className="flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-[12px] font-bold text-white"><Lock size={13} /> 未踏の風景</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[11px] font-semibold text-fg-2">No.{i + 1}</p>
                    <p className="text-[15px] font-semibold">{unlocked ? st.name : '？？？'}</p>
                    <p className="mt-0.5 text-[12px] text-fg-2">{unlocked ? st.description : `いずれかのルートで ${Math.round(st.from * 100)}% まで登ると解放`}</p>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-[17px] font-bold tracking-tight">{children}</h2>;
}
