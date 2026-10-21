import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock3, Timer, X } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { useHoldScene } from '@/lib/sceneHold';
import { usePresentDepth } from '@/lib/depth';
import { easeIOS, springSheet } from '@/lib/motion';
import { taskOptions } from '@/lib/tasks';
import { SUBJECT_ICONS } from '@/lib/subjects';
import { METERS_PER_MINUTE } from '@/lib/altitude';
import { playSfx } from '@/audio/sfx';
import { ambient } from '@/audio/ambient';
import { useRulerDial } from '@/components/booking/useRulerDial';
import { SEASONS, SEASON_ORDER } from '../scene/palette';
import type { DesignBookingProps } from '../../types';
import type { Season, SkyOverride, SubjectIconKey, TimeStep } from '@/types';

/** 登る山（獲得標高の目安。集中 1 分 = 10 m） */
const PEAKS: { name: string; kana: string; m: number }[] = [
  { name: '高尾山', kana: 'たかおさん', m: 599 },
  { name: '筑波山', kana: 'つくばさん', m: 877 },
  { name: '大山', kana: 'おおやま', m: 1252 },
  { name: '上高地', kana: 'かみこうち', m: 1500 },
  { name: '谷川岳', kana: 'たにがわだけ', m: 1977 },
  { name: '立山', kana: 'たてやま', m: 3015 },
  { name: '槍ヶ岳', kana: 'やりがたけ', m: 3180 },
  { name: '富士山', kana: 'ふじさん', m: 3776 },
];

const DIAL = {
  pomodoro: { min: 25, max: 400, step: 25 },
  free: { min: 5, max: 400, step: 5 },
} as const;
const snapTo = (m: number, step: TimeStep) => {
  const d = DIAL[step];
  return Math.min(d.max, Math.max(d.min, Math.round(m / d.step) * d.step));
};
/** 獲得標高にいちばん近い山 */
const peakFor = (gain: number) => PEAKS.reduce((best, p) => (Math.abs(p.m - gain) < Math.abs(best.m - gain) ? p : best), PEAKS[0]);
const jhm = (m: number) => (Math.floor(m / 60) ? `${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ''}` : `${m}分`);

const SKIES: { value: SkyOverride; label: string }[] = [
  { value: 'auto', label: '旅の時間' },
  { value: 'clock', label: '今の時刻' },
  { value: 'dawn', label: '朝' },
  { value: 'day', label: '昼' },
  { value: 'sunset', label: '夕' },
  { value: 'night', label: '夜' },
];

/**
 * 登山の予約＝「登山届（山岳ルート計画）」。生成りの水彩紙に、登る山の標高図・横目盛りダイヤル（目標時間 → 獲得標高 → 山）、
 * 集中すること（科目）・季節・空の時間をアースカラーの札で選ぶ。「入山する」で旅が始まる（深呼吸は HomeScreen が挟む）。
 */
export function MountainBooking({ open, onClose, onStart }: DesignBookingProps) {
  const { settings, activeSubjects } = useApp();
  useHoldScene(open);
  usePresentDepth(open);
  const options = useMemo(() => taskOptions(activeSubjects), [activeSubjects]);
  const fresh = () => {
    const step = settings.bookingStep ?? 'pomodoro';
    const subject = activeSubjects.find((s) => s.id === settings.selectedSubjectId);
    return {
      step,
      minutes: snapTo(settings.bookingMinutes || 50, step),
      task: subject?.name ?? options[0]?.name ?? 'フォーカス',
      icon: (subject?.icon ?? options[0]?.icon ?? 'target') as SubjectIconKey,
      season: settings.season,
      sky: settings.sky,
    };
  };
  const [draft, setDraft] = useState(fresh);
  useEffect(() => {
    if (open) setDraft(fresh());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const patch = (p: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...p }));

  const gain = draft.minutes * METERS_PER_MINUTE;
  const peak = peakFor(gain);

  const start = () => {
    onStart({
      task: draft.task,
      icon: draft.icon,
      step: draft.step,
      minutes: draft.minutes,
      booking: { mode: 'mountain', from: '登山口', fromName: '登山口', to: peak.name, toName: peak.name, minutes: draft.minutes, km: Math.round(gain) / 1000, seat: '', task: draft.task, step: draft.step },
      settings: { season: draft.season as Season, sky: draft.sky },
    });
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="mountain-booking"
          className="mt-plan fixed inset-x-0 top-0 z-[70] flex h-app flex-col overflow-hidden font-maru text-[#2C4A3E]"
          initial={{ opacity: 0, scale: 0.92, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { ...springSheet, opacity: { duration: 0.3, ease: easeIOS } } }}
          exit={{ opacity: 0, y: 30, transition: { duration: 0.35, ease: easeIOS } }}
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="screen-header">
            <button onClick={onClose} aria-label="閉じる" className="btn-icon mt-chip">
              <X />
            </button>
            <div>
              <p className="text-[17px] font-bold tracking-[0.14em]">登山届</p>
              <p className="text-[10px] font-bold tracking-[0.3em] opacity-60">山岳ルート計画</p>
            </div>
            <span />
          </div>

          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
            {/* 標高図（水彩の山並み）。選んだ山はテラコッタ、登る道のりは山吹の線 */}
            <ElevationChart peak={peak} gain={gain} onPick={(p) => patch({ minutes: snapTo(Math.ceil(p.m / METERS_PER_MINUTE), draft.step) })} />

            {/* 目標 */}
            <div className="mt-3 flex items-end justify-between px-1">
              <div>
                <p className="text-[11px] font-bold tracking-[0.2em] opacity-60">めざす山</p>
                <motion.p key={peak.name} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-[26px] font-bold leading-tight">
                  {peak.name}
                  <span className="ml-1.5 text-[13px] font-bold opacity-60">{peak.m.toLocaleString()} m</span>
                </motion.p>
              </div>
              <div className="text-right">
                <p className="tabular text-[22px] font-bold leading-tight">{jhm(draft.minutes)}</p>
                <p className="tabular text-[12px] font-bold text-[#B5603F]">獲得標高 {gain.toLocaleString()} m</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {(
                [
                  { value: 'pomodoro', label: 'ポモドーロ', note: '25分刻み', Icon: Timer },
                  { value: 'free', label: 'フリー', note: '5分刻み', Icon: Clock3 },
                ] as const
              ).map(({ value, label, note, Icon }) => (
                <button key={value} onClick={() => patch({ step: value, minutes: snapTo(draft.minutes, value) })} aria-pressed={draft.step === value} className={`btn-pill w-full ${draft.step === value ? 'mt-moss' : 'mt-chip'}`}>
                  <Icon size={15} />
                  {label}
                  <span className="text-[11px] opacity-60">{note}</span>
                </button>
              ))}
            </div>
            <Ruler step={draft.step} value={draft.minutes} onChange={(v) => patch({ minutes: v })} />

            <Section title="集中すること">
              {options.map((o) => {
                const Icon = SUBJECT_ICONS[o.icon]?.icon ?? SUBJECT_ICONS.book.icon;
                const on = draft.task === o.name;
                return (
                  <button key={o.name} onClick={() => patch({ task: o.name, icon: o.icon })} aria-pressed={on} className={`btn-pill ${on ? 'mt-moss' : 'mt-chip'}`}>
                    <Icon size={14} strokeWidth={2.4} />
                    {o.name}
                  </button>
                );
              })}
            </Section>

            <Section title="季節">
              {SEASON_ORDER.map((s) => (
                <button key={s} onClick={() => patch({ season: s })} aria-pressed={draft.season === s} className={`btn-pill ${draft.season === s ? 'mt-terracotta' : 'mt-chip'}`}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEASONS[s].meadow.base }} />
                  {SEASONS[s].label}
                </button>
              ))}
            </Section>

            <Section title="空の時間">
              {SKIES.map((s) => (
                <button key={s.value} onClick={() => patch({ sky: s.value })} aria-pressed={draft.sky === s.value} className={`btn-pill ${draft.sky === s.value ? 'mt-yamabuki' : 'mt-chip'}`}>
                  {s.label}
                </button>
              ))}
            </Section>
          </div>

          <div className="cta-dock pt-2">
            <button onClick={start} className="btn-cta mt-forest">
              入山する
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <p className="mb-2 px-1 text-[12px] font-bold tracking-[0.2em] opacity-60">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

/** 標高図：山を低い順に並べた水彩の山並み。いまの獲得標高の高さに山吹の線、めざす山はテラコッタ */
function ElevationChart({ peak, gain, onPick }: { peak: (typeof PEAKS)[number]; gain: number; onPick: (p: (typeof PEAKS)[number]) => void }) {
  const W = 340;
  const H = 150;
  const top = 4000;
  const y = (m: number) => H - 14 - (m / top) * (H - 30);
  const step = W / PEAKS.length;
  return (
    <div className="mt-wash-card relative mt-1 overflow-hidden rounded-[18px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden>
        <defs>
          <linearGradient id="mt-plan-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#DCE8EC" />
            <stop offset="1" stopColor="#F4EFE2" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill="url(#mt-plan-sky)" />
        {/* 遠い山並み（淡く） */}
        <path d={`M0 ${H} L0 ${H - 48} L50 ${H - 70} L95 ${H - 52} L150 ${H - 84} L205 ${H - 60} L260 ${H - 90} L300 ${H - 66} L${W} ${H - 78} L${W} ${H} Z`} fill="#B9CAD6" opacity="0.45" />
        {PEAKS.map((p, i) => {
          const cx = step * (i + 0.5);
          const py = y(p.m);
          const on = p.name === peak.name;
          const half = step * 0.62;
          return (
            <g key={p.name}>
              <path d={`M${cx - half} ${H} L${cx} ${py} L${cx + half} ${H} Z`} fill={on ? '#C9704F' : i % 2 ? '#8FAF8C' : '#7E9E8A'} opacity={on ? 0.92 : 0.55} />
              <path d={`M${cx} ${py} L${cx + half * 0.55} ${H} L${cx + half * 0.15} ${H} Z`} fill="#FFFFFF" opacity={on ? 0.18 : 0.12} />
              {p.m > 2500 && <path d={`M${cx} ${py} L${cx - 7} ${py + 10} L${cx + 7} ${py + 10} Z`} fill="#FBF8F1" opacity="0.9" />}
            </g>
          );
        })}
        {/* いまの獲得標高 */}
        <line x1="0" x2={W} y1={y(Math.min(top, gain))} y2={y(Math.min(top, gain))} stroke="#D9A23C" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
      </svg>
      {/* 山の名前（押すとその山の時間に） */}
      <div className="absolute inset-x-0 bottom-0 grid" style={{ gridTemplateColumns: `repeat(${PEAKS.length}, 1fr)` }}>
        {PEAKS.map((p) => (
          <button key={p.name} onClick={() => onPick(p)} className={`h-[42px] text-[10px] font-bold leading-tight ${p.name === peak.name ? 'text-[#FBF8F1]' : 'text-[#2C4A3E]/80'}`} aria-label={`${p.name} ${p.m} m`}>
            <span className="block">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** 横目盛りダイヤル（水彩紙にフォレストグリーンの目盛り） */
function Ruler({ step, value, onChange }: { step: TimeStep; value: number; onChange: (v: number) => void }) {
  const d = DIAL[step];
  const ppm = step === 'pomodoro' ? 4.4 : 7;
  const dial = useRulerDial({ value, min: d.min, max: d.max, step: d.step, pxPerMin: ppm, onChange, onDetent: () => playSfx('tick') });
  const ticks = useMemo(() => {
    const out: { x: number; h: number; label?: string; major: boolean }[] = [];
    for (let m = d.min; m <= d.max; m++) {
      if (step === 'pomodoro' && m % 5) continue;
      const major = step === 'pomodoro' ? m % 25 === 0 : m % 10 === 0;
      const mid = !major && m % 5 === 0;
      out.push({ x: (m - d.min) * ppm, h: major ? 20 : mid ? 13 : 7, major, label: major && (step === 'pomodoro' || m % 30 === 0) ? jhm(m) : undefined });
    }
    return out;
  }, [step, d.min, d.max, ppm]);
  const width = (d.max - d.min) * ppm;
  return (
    <div
      className="mt-chip relative mt-2 h-[64px] touch-none select-none overflow-hidden rounded-[16px]"
      {...dial.bind}
      onPointerDown={(e) => {
        ambient.unlock();
        dial.bind.onPointerDown(e);
      }}
      role="slider"
      aria-label="登る時間"
      aria-valuemin={d.min}
      aria-valuemax={d.max}
      aria-valuenow={value}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onChange(Math.min(d.max, value + d.step));
        if (e.key === 'ArrowLeft') onChange(Math.max(d.min, value - d.step));
      }}
    >
      <motion.div className="absolute left-1/2 top-0" style={{ x: dial.x, width, willChange: 'transform' }}>
        <svg width={width + 2} height={40} className="absolute left-0 top-0 overflow-visible">
          {ticks.map((t) => (
            <line key={t.x} x1={t.x + 1} x2={t.x + 1} y1={0} y2={t.h} stroke="#2C4A3E" strokeOpacity={t.major ? 0.85 : 0.4} strokeWidth={t.major ? 1.6 : 1} />
          ))}
        </svg>
        {ticks
          .filter((t) => t.label)
          .map((t) => (
            <span key={t.x} className="absolute top-[26px] -translate-x-1/2 whitespace-nowrap text-[12px] font-bold" style={{ left: t.x + 1 }}>
              {t.label}
            </span>
          ))}
      </motion.div>
      <svg className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2" width="18" height="14" viewBox="0 0 18 14" aria-hidden>
        <path d="M1 0h16L9 13z" fill="#C9704F" />
      </svg>
    </div>
  );
}
