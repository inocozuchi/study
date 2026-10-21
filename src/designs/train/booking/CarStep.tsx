import { useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Plus } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { SUBJECT_ICONS } from '@/lib/subjects';
import { taskOptions, type TaskOption } from '@/lib/tasks';
import { playSfx } from '@/audio/sfx';
import { jhm, Steps } from './LineStep';
import { isObservation, type Stop } from './line';
import type { TrainDraft } from './TrainBooking';
import type { SubjectIconKey, TrainClass } from '@/types';

const BOXES = 6;

function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

function Glyph({ icon, size = 16 }: { icon: SubjectIconKey; size?: number }) {
  const Icon = SUBJECT_ICONS[icon]?.icon ?? SUBJECT_ICONS.book.icon;
  return <Icon size={size} strokeWidth={2.2} />;
}

/** ② 座席：客車を選び（三等客車＝普通・快速 / 展望車＝急行・特急）、木の座席を押して「何に集中しますか？」 */
export function CarStep({ draft, stop, patch, onBack, onNext }: { draft: TrainDraft; stop: Stop; patch: (p: Partial<TrainDraft>) => void; onBack: () => void; onNext: () => void }) {
  const { activeSubjects } = useApp();
  const options = useMemo(() => taskOptions(activeSubjects), [activeSubjects]);
  const [open, setOpen] = useState<{ seat: string; top: number; x: number } | null>(null);
  const content = useRef<HTMLDivElement>(null);

  const taken = useMemo(() => {
    const seed = `${draft.origin}${stop.station.name}${draft.cls}${new Date().toDateString()}`;
    return (id: string) => id !== draft.seat && hash(seed + id) % 100 < 26;
  }, [draft.origin, stop.station.name, draft.cls, draft.seat]);

  const tap = (seat: string, el: HTMLElement) => {
    const box = content.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setOpen({ seat, top: r.bottom - box.top + 10, x: r.left + r.width / 2 - box.left });
  };
  const choose = (seat: string, t: TaskOption) => {
    patch({ seat, task: t.name, icon: t.icon });
    setOpen(null);
    playSfx('tick');
  };
  // 客車を替えると種別も替わる（三等客車は普通・快速、展望車は急行・特急。同じ側ならそのまま）
  const setCar = (obs: boolean) => {
    const cls: TrainClass = obs === isObservation(draft.cls) ? draft.cls : obs ? 'express' : 'local';
    if (cls !== draft.cls) patch({ cls, seat: null, task: null, icon: null });
    setOpen(null);
  };

  const seatProps = (id: string) => ({ id, mine: draft.seat === id, taken: taken(id), icon: draft.seat === id ? draft.icon : null, active: open?.seat === id, onTap: (el: HTMLElement) => tap(id, el) });

  return (
    <div className="tr-wood tr-mincho absolute inset-0">
      {/* 見出し：文字の後ろは塗りの面（ぼかし・暗いグラデーションを文字に重ねない）。下の縁だけ座席へ溶かす */}
      <div className="absolute inset-x-0 top-0 z-20 bg-[#2a180e] pb-3 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-5 after:bg-gradient-to-b after:from-[#2a180e] after:to-transparent after:content-['']">
        <div className="screen-header">
          <button onClick={onBack} aria-label="戻る" className="btn-icon tr-brass">
            <ChevronLeft />
          </button>
          <div>
            <p className="text-[16px] font-bold tracking-[0.2em] text-[#F4EEDD]">座席を指定</p>
            <Steps at={2} />
          </div>
          <span />
        </div>
        <p className="mt-1 px-5 text-center text-[12px] tracking-wider text-[#D9C08A]">
          {draft.origin} → {stop.station.name} · {jhm(draft.minutes)}
        </p>
        {/* 客車の札 */}
        <div className="mt-2.5 grid grid-cols-2 gap-2 px-5">
          {(
            [
              { obs: false, name: '三等客車', note: '普通・快速 · 木のボックス席' },
              { obs: true, name: '展望車', note: '急行・特急 · ソファと展望デッキ' },
            ] as const
          ).map((c) => {
            const on = isObservation(draft.cls) === c.obs;
            return (
              <button key={c.name} onClick={() => setCar(c.obs)} aria-pressed={on} className={`rounded-[8px] px-3 py-2 text-left ${on ? 'tr-enji' : 'border border-[#B8955A]/40 bg-black/25 text-[#F4EEDD]/80'}`}>
                <span className="block text-[14px] font-bold tracking-[0.15em]">{c.name}</span>
                <span className={`block text-[11px] ${on ? 'text-[#D9C08A]' : 'text-[#F4EEDD]/50'}`}>{c.note}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="no-scrollbar absolute inset-0 overflow-y-auto overscroll-contain" onClick={() => setOpen(null)}>
        <div ref={content} className="relative mx-auto w-full max-w-[393px] pb-[calc(env(safe-area-inset-bottom)+140px)] pt-[calc(var(--safe-top)+150px)]">
          <CarBody express={isObservation(draft.cls)}>
            {!isObservation(draft.cls) ? (
              Array.from({ length: BOXES }, (_, b) => (
                <div key={b} className="flex flex-col gap-[3px] py-2">
                  {[b * 2 + 1, b * 2 + 2].map((row, k) => (
                    <div key={row} className="flex items-center justify-center gap-[5px]">
                      {['A', 'B', '', 'C', 'D'].map((col) =>
                        col ? (
                          <BoxSeat key={col} back={k === 0 ? 'top' : 'bottom'} {...seatProps(`${row}番${col}席`)} label={col} />
                        ) : (
                          <span key="aisle" className="w-[44px] text-center text-[12px] font-bold text-[#F4EEDD]/55">
                            {row}
                          </span>
                        ),
                      )}
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <Observation seatProps={seatProps} />
            )}
          </CarBody>
          <AnimatePresence>{open && <TagPopover key={open.seat} seat={open.seat} top={open.top} x={open.x} options={options} current={draft.seat === open.seat ? draft.task : null} onPick={(t) => choose(open.seat, t)} />}</AnimatePresence>
        </div>
      </div>

      <div className="cta-dock absolute inset-x-0 bottom-0 z-20 bg-[#2a180e]/95 pt-2.5 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.8)]">
        <div>
          <span className="block min-w-0 px-1 pb-2 text-[#F4EEDD]">
            <span className="block text-[11px] text-[#D9C08A]">{draft.seat ? '座席と集中すること' : '空いている席を選んでください'}</span>
            <span className="flex items-center gap-1.5 truncate text-[14px] font-bold">
              {draft.seat ?? '—'}
              {draft.task && (
                <>
                  <span className="text-[#F4EEDD]/40">·</span>
                  {draft.icon && <Glyph icon={draft.icon} size={14} />}
                  <span className="truncate">{draft.task}</span>
                </>
              )}
            </span>
          </span>
          <button disabled={!draft.seat || !draft.task} onClick={onNext} className="btn-cta tr-cta tr-enji">
            切符を発券する
          </button>
        </div>
      </div>
    </div>
  );
}

/** 客車の外板（ぶどう色）と窓、木の床 */
function CarBody({ express, children }: { express: boolean; children: ReactNode }) {
  return (
    <div className="tr-carbody relative mx-auto w-[318px] rounded-[18px] p-[14px]">
      {/* 窓の列 */}
      {['left-[4px]', 'right-[4px]'].map((side) => (
        <div key={side} className={`absolute ${side} inset-y-6 flex w-[6px] flex-col justify-between`}>
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="h-[30px] rounded-[2px] bg-[#AFC8D2]/60 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.3)]" />
          ))}
        </div>
      ))}
      <div className="tr-floor relative overflow-hidden rounded-[8px] px-1 py-2">
        <p className="pb-1 text-center text-[11px] tracking-[0.5em] text-[#F4EEDD]/60">{express ? '展望車 · 一等' : '三等客車'}</p>
        {children}
      </div>
    </div>
  );
}

interface SeatProps {
  id: string;
  mine: boolean;
  taken: boolean;
  icon: SubjectIconKey | null;
  active: boolean;
  onTap: (el: HTMLElement) => void;
}

/** ボックス席の 1 席：木の背もたれと臙脂のビロード */
function BoxSeat({ id, mine, taken, icon, active, onTap, back, label }: SeatProps & { back: 'top' | 'bottom'; label: string }) {
  return (
    <motion.button
      disabled={taken}
      aria-label={`${id}${taken ? '（ふさがっています）' : mine ? '（選択中）' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onTap(e.currentTarget);
      }}
      className={`relative flex h-[44px] w-[44px] flex-col overflow-hidden rounded-[6px] ${back === 'bottom' ? 'flex-col-reverse' : ''} ${active ? 'ring-2 ring-[#D9C08A]' : ''}`}
    >
      <span className="tr-seatwood h-[9px] w-full" />
      <span className={`grid flex-1 place-items-center text-[12px] font-bold ${mine ? 'tr-velvet-gold' : taken ? 'bg-[#3B2A26] text-[#F4EEDD]/25' : 'tr-velvet text-[#F4EEDD]/80'}`}>
        {mine && icon ? <Glyph icon={icon} size={17} /> : taken ? '×' : label}
      </span>
    </motion.button>
  );
}

/** 展望車：窓ぎわのソファ（左右 7 脚ずつ）と、最後部の展望デッキ */
function Observation({ seatProps }: { seatProps: (id: string) => SeatProps }) {
  return (
    <div className="relative">
      {/* 中央の絨毯 */}
      <span className="absolute inset-y-0 left-1/2 w-[64px] -translate-x-1/2 rounded-[4px]" style={{ background: 'repeating-linear-gradient(0deg,#7A2830 0 18px,#7A2830 18px 20px), #7A2830', boxShadow: 'inset 0 0 0 2px #B8955A' }} />
      <div className="relative grid grid-cols-[1fr_64px_1fr] gap-y-3 px-2 py-2">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="contents">
            <div className="flex justify-start">
              <Armchair {...seatProps(`展望 ${i + 1}番`)} n={i + 1} />
            </div>
            <span />
            <div className="flex justify-end">
              <Armchair {...seatProps(`展望 ${i + 8}番`)} n={i + 8} />
            </div>
          </div>
        ))}
      </div>
      {/* 展望デッキ（真鍮の手すり） */}
      <div className="relative mx-1 mt-2 rounded-b-[90px] border-[3px] border-t-0 border-[#B8955A] bg-[#4A2E1C]/70 px-6 pb-7 pt-3 shadow-[inset_0_-6px_0_rgba(0,0,0,0.25)]">
        <p className="text-center text-[11px] tracking-[0.4em] text-[#D9C08A]">展望デッキ</p>
        <div className="mt-2 flex justify-center gap-6">
          <Armchair {...seatProps('展望 15番')} n={15} />
          <Armchair {...seatProps('展望 16番')} n={16} />
        </div>
      </div>
    </div>
  );
}

function Armchair({ id, mine, taken, icon, active, onTap, n }: SeatProps & { n: number }) {
  return (
    <motion.button
      disabled={taken}
      aria-label={`${id}${taken ? '（ふさがっています）' : mine ? '（選択中）' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onTap(e.currentTarget);
      }}
      className={`tr-seatwood relative grid h-[48px] w-[56px] place-items-center rounded-[16px_16px_12px_12px] p-[5px] ${active ? 'ring-2 ring-[#D9C08A]' : ''}`}
    >
      <span className={`grid h-full w-full place-items-center rounded-[11px] text-[12px] font-bold ${mine ? 'tr-velvet-gold' : taken ? 'bg-[#3B2A26] text-[#F4EEDD]/25' : 'tr-velvet text-[#F4EEDD]/85'}`}>
        {mine && icon ? <Glyph icon={icon} size={18} /> : taken ? '×' : n}
      </span>
    </motion.button>
  );
}

/** 座席の下に開く紙の札 */
function TagPopover({ seat, top, x, options, current, onPick }: { seat: string; top: number; x: number; options: TaskOption[]; current: string | null; onPick: (t: TaskOption) => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const width = 300;
  return (
    <motion.div
      className="tr-paper absolute z-30 rounded-[6px] p-4 shadow-[0_0_0_2px_#7A2830,0_0_0_4px_#F4EEDD,0_0_0_5px_#7A2830,0_20px_40px_-14px_rgba(0,0,0,0.85)]"
      style={{ top, left: `max(14px, min(calc(100% - ${width + 14}px), ${x - width / 2}px))`, width }}
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[12.5px] font-bold tracking-[0.15em] text-[#7A2830]">{seat}</p>
      <p className="mt-0.5 text-[16px] font-bold tracking-[0.1em]">何に集中しますか？</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((t) => {
          const on = current === t.name;
          return (
            <button key={t.name} onClick={() => onPick(t)} className={`btn-pill relative pl-5 pr-3 ${on ? 'bg-[#7A2830] text-[#F4EEDD]' : 'bg-[#F7EDD3] text-[#2D241C] shadow-[inset_0_0_0_1px_rgba(107,74,43,0.55)]'}`}>
              {/* 札の穴 */}
              <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#B8955A] shadow-[inset_0_1px_1px_rgba(0,0,0,0.4)]" />
              <Glyph icon={t.icon} size={14} />
              {t.name}
            </button>
          );
        })}
        {adding ? (
          <form
            className="flex w-full gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = name.trim();
              if (n) onPick({ name: n, icon: 'book' });
            }}
          >
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="例：英単語、論文、資格" className="h-9 min-w-0 flex-1 rounded-[4px] bg-white/70 px-3 font-sans text-[14px] text-[#2D241C] outline-none shadow-[inset_0_0_0_1px_rgba(107,74,43,0.5)]" />
            <button type="submit" className="btn-pill tr-enji">
              追加
            </button>
          </form>
        ) : (
          <button onClick={() => setAdding(true)} className="btn-pill border border-[#6B4A2B]/60 text-[13px] font-bold text-[#6B4A2B]">
            <Plus size={14} /> 追加
          </button>
        )}
      </div>
    </motion.div>
  );
}
