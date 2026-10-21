import { useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Plus } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { SUBJECT_ICONS } from '@/lib/subjects';
import { taskOptions, type TaskOption } from '@/lib/tasks';
import { playSfx } from '@/audio/sfx';
import { hm } from '../parts';
import { Steps } from './RouteStep';
import type { Route } from '../airports';
import type { FlightDraft } from './FlightBooking';
import type { SubjectIconKey } from '@/types';

const ROWS = 16;
const LEFT = ['A', 'C'];
const RIGHT = ['D', 'F'];
const ROW_H = 58;
/** 定番のタスクのガラスの色（iOS のシステムカラー） */
const TASK_TINT: Record<string, string> = {
  フォーカス: '#FF9F0A', 作業: '#64D2FF', 簿記: '#30D158', 読む: '#BF5AF2', プログラミング: '#0A84FF', 運動: '#FF453A', 瞑想する: '#FFD60A',
};

function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** ② 座席指定：上から見た機体の客室。席を押すと「何に集中しますか？」のガラスのカードが開く */
export function SeatStep({ draft, route, patch, onBack, onNext }: { draft: FlightDraft; route: Route; patch: (p: Partial<FlightDraft>) => void; onBack: () => void; onNext: () => void }) {
  const { activeSubjects } = useApp();
  const [open, setOpen] = useState<{ seat: string; top: number; x: number } | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const options = useMemo(() => taskOptions(activeSubjects), [activeSubjects]);

  // ほかの乗客が座っている席（便ごとに決まる）
  const taken = useMemo(() => {
    const seed = `${draft.origin}${route.airport.code}${new Date().toDateString()}`;
    const set = new Set<string>();
    for (let r = 1; r <= ROWS; r++)
      [...LEFT, ...RIGHT].forEach((c) => {
        if (hash(seed + r + c) % 100 < 28) set.add(`${pad(r)}${c}`);
      });
    if (draft.seat) set.delete(draft.seat);
    return set;
  }, [draft.origin, route.airport.code]); // eslint-disable-line react-hooks/exhaustive-deps

  const tapSeat = (seat: string, el: HTMLElement) => {
    const box = content.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setOpen({ seat, top: r.bottom - box.top + 10, x: r.left + r.width / 2 - box.left });
  };
  const choose = (seat: string, t: TaskOption) => {
    patch({ seat, task: t.name, icon: t.icon });
    setOpen(null);
    playSfx('blip');
  };

  return (
    <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,#151820,#050608_70%)]">
      {/* 見出し：文字の後ろは塗りの面（ぼかし・暗いグラデーションを文字に重ねない）。下の縁だけ座席へ溶かす */}
      <div className="absolute inset-x-0 top-0 z-20 bg-[#050608] px-4 pb-3 pt-safe after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-5 after:bg-gradient-to-b after:from-[#050608] after:to-transparent after:content-['']">
        <div className="mt-1 flex items-center justify-between">
          <button onClick={onBack} aria-label="戻る" className="fl-btn fl-glass h-11 w-11">
            <ChevronLeft size={21} />
          </button>
          <div className="text-center">
            <p className="text-[15px] font-semibold">座席を指定</p>
            <p className="fl-num text-[12px] text-white/55">
              {draft.origin} → {route.airport.code} · {hm(draft.minutes)}
            </p>
            <Steps at={2} />
          </div>
          <span className="w-11" />
        </div>
      </div>

      <div className="no-scrollbar absolute inset-0 overflow-y-auto overscroll-contain" onClick={() => setOpen(null)}>
        <div ref={content} className="relative mx-auto w-full max-w-[393px] pb-[calc(env(safe-area-inset-bottom)+120px)] pt-[calc(var(--safe-top)+64px)]">
          <Fuselage>
            {Array.from({ length: ROWS }, (_, i) => i + 1).map((row) => (
              <div key={row} className="flex items-center justify-center gap-[6px]" style={{ height: ROW_H }}>
                {[...LEFT, '', ...RIGHT].map((col) => {
                  if (!col)
                    return (
                      <span key="aisle" className="fl-num w-[34px] text-center text-[12px] font-semibold text-white/40">
                        {pad(row)}
                      </span>
                    );
                  const id = `${pad(row)}${col}`;
                  const mine = draft.seat === id;
                  return (
                    <Seat
                      key={id}
                      id={id}
                      mine={mine}
                      taken={taken.has(id)}
                      icon={mine ? draft.icon : null}
                      active={open?.seat === id}
                      onTap={(el) => tapSeat(id, el)}
                    />
                  );
                })}
              </div>
            ))}
          </Fuselage>

          <AnimatePresence>
            {open && (
              <TaskPopover key={open.seat} seat={open.seat} top={open.top} x={open.x} options={options} current={draft.seat === open.seat ? draft.task : null} onPick={(t) => choose(open.seat, t)} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 下：選んだ席と確認 */}
      <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]">
        <div className="fl-glass flex items-center gap-3 rounded-[26px] py-2 pl-4 pr-2">
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px] text-white/50">{draft.seat ? '席とタスク' : '空いている席を選んでください'}</span>
            <span className="fl-num flex items-center gap-1.5 truncate text-[16px] font-bold">
              {draft.seat ? (
                <>
                  {draft.seat}
                  <span className="text-white/40">·</span>
                  {draft.icon && <TaskGlyph icon={draft.icon} size={15} />}
                  <span className="truncate">{draft.task}</span>
                </>
              ) : (
                '—'
              )}
            </span>
          </span>
          <button disabled={!draft.seat || !draft.task} onClick={onNext} className="fl-cta h-12 w-[112px] text-[16px]">
            確認
          </button>
        </div>
      </div>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

function TaskGlyph({ icon, size = 16 }: { icon: SubjectIconKey; size?: number }) {
  const Icon = SUBJECT_ICONS[icon]?.icon ?? SUBJECT_ICONS.book.icon;
  return <Icon size={size} strokeWidth={2.2} />;
}

function Seat({ id, mine, taken, icon, active, onTap }: { id: string; mine: boolean; taken: boolean; icon: SubjectIconKey | null; active: boolean; onTap: (el: HTMLElement) => void }) {
  return (
    <motion.button
      disabled={taken}
      aria-label={`${id}${taken ? '（埋まっています）' : mine ? '（選択中）' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onTap(e.currentTarget);
      }}
      className={`relative grid h-[44px] w-[42px] place-items-center rounded-[11px] transition-colors ${
        mine
          ? 'bg-[linear-gradient(180deg,#E9D9B4,#C9B07C)] text-[#3B2F17] shadow-[0_0_0_2px_rgba(255,214,140,0.5),0_6px_16px_-6px_rgba(233,200,140,0.7)]'
          : taken
            ? 'bg-[#16181C] text-white/15'
            : `bg-[linear-gradient(180deg,#363A41,#272A30)] text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] ${active ? 'ring-2 ring-[#FF9F0A]' : ''}`
      }`}
    >
      {/* 背もたれ */}
      <span className={`absolute inset-x-[5px] top-[4px] h-[7px] rounded-[4px] ${mine ? 'bg-[#B79C66]' : taken ? 'bg-white/5' : 'bg-black/25'}`} />
      <span className="mt-2 text-[11px] font-bold">{mine && icon ? <TaskGlyph icon={icon} size={17} /> : taken ? '×' : id.slice(-1)}</span>
    </motion.button>
  );
}

/** 席のすぐ下に開くガラスのカード */
function TaskPopover({ seat, top, x, options, current, onPick }: { seat: string; top: number; x: number; options: TaskOption[]; current: string | null; onPick: (t: TaskOption) => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const width = 300;
  const left = `max(12px, min(calc(100% - ${width + 12}px), ${x - width / 2}px))`;
  return (
    <motion.div
      className="fl-glass absolute z-30 rounded-[22px] !bg-[#1C1F25]/75 p-4"
      style={{ top, left, width, transformOrigin: `${x}px -10px` }}
      initial={{ opacity: 0, scale: 0.92, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: -4 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="fl-num text-[12px] font-semibold text-[#FF9F0A]">席: {seat}</p>
      <p className="mt-0.5 text-[16px] font-bold">何に集中しますか？</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((t) => {
          const tint = t.color ?? TASK_TINT[t.name] ?? '#8E8E93';
          const on = current === t.name;
          return (
            <button
              key={t.name}
              onClick={() => onPick(t)}
              className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold transition-transform"
              style={{ background: on ? tint : `${tint}2E`, color: on ? '#0B0C0F' : '#F5F6F8', boxShadow: `inset 0 0 0 1px ${tint}66, inset 0 1px 0 rgba(255,255,255,0.18)` }}
            >
              <TaskGlyph icon={t.icon} size={15} />
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
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="例：英単語、論文、資格" className="h-9 min-w-0 flex-1 rounded-full bg-white/10 px-3 text-[15px] text-white outline-none placeholder:text-white/35" />
            <button type="submit" className="h-9 rounded-full bg-white px-3.5 text-[13.5px] font-bold text-[#050608]">
              追加
            </button>
          </form>
        ) : (
          <button onClick={() => setAdding(true)} className="flex h-9 items-center gap-1 rounded-full border border-dashed border-white/30 px-3 text-[13.5px] font-semibold text-white/75">
            <Plus size={15} /> 追加
          </button>
        )}
      </div>
    </motion.div>
  );
}

/** 上から見た機体：機首（操縦席の窓）・客室の胴体・主翼・尾翼 */
function Fuselage({ children }: { children: ReactNode }) {
  const W = 262;
  const bodyH = ROWS * ROW_H + 24;
  return (
    <div className="relative mx-auto" style={{ width: W }}>
      {/* 主翼（胴体の後ろ。画面の端まで） */}
      <svg className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ top: 230 + ROW_H * 6.4, width: 393, height: 300 }} viewBox="0 0 393 300" aria-hidden>
        <defs>
          <linearGradient id="fl-wing" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#24272D" />
            <stop offset="1" stopColor="#15171B" />
          </linearGradient>
        </defs>
        <path d="M150 20 L-40 190 L-40 232 L150 120 Z M243 20 L433 190 L433 232 L243 120 Z" fill="url(#fl-wing)" />
        <path d="M40 120 l0 34 M353 120 l0 34" stroke="#2F333A" strokeWidth="10" strokeLinecap="round" />
      </svg>
      {/* 機首 */}
      <svg width={W} height={230} viewBox={`0 0 ${W} 230`} className="relative block" aria-hidden>
        <defs>
          <linearGradient id="fl-skin" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#111317" />
            <stop offset="0.22" stopColor="#2A2D33" />
            <stop offset="0.5" stopColor="#33373E" />
            <stop offset="0.78" stopColor="#2A2D33" />
            <stop offset="1" stopColor="#111317" />
          </linearGradient>
          <linearGradient id="fl-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6E7A8C" />
            <stop offset="1" stopColor="#1B2029" />
          </linearGradient>
        </defs>
        <path d={`M0 230 L0 150 C0 70 70 2 ${W / 2} 2 C${W - 70} 2 ${W} 70 ${W} 150 L${W} 230 Z`} fill="url(#fl-skin)" />
        <path d={`M${W / 2 - 46} 70 Q${W / 2 - 40} 46 ${W / 2 - 6} 40 L${W / 2 - 6} 74 Z`} fill="url(#fl-glass)" />
        <path d={`M${W / 2 + 46} 70 Q${W / 2 + 40} 46 ${W / 2 + 6} 40 L${W / 2 + 6} 74 Z`} fill="url(#fl-glass)" />
        <path d={`M${W / 2 - 40} 54 Q${W / 2 - 30} 46 ${W / 2 - 14} 44`} stroke="rgba(255,255,255,0.35)" strokeWidth="2" fill="none" strokeLinecap="round" />
        <rect x="22" y="196" width={W - 44} height="34" rx="10" fill="#1A1C21" />
        <text x={W / 2} y="218" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.35)" letterSpacing="3">
          FORWARD
        </text>
      </svg>
      {/* 胴体と客室 */}
      <div className="relative" style={{ height: bodyH, background: 'linear-gradient(90deg,#111317,#2A2D33 22%,#33373E 50%,#2A2D33 78%,#111317)' }}>
        <div className="absolute inset-x-[16px] inset-y-0 rounded-[14px] bg-[#1A1C21] shadow-[inset_0_0_18px_rgba(0,0,0,0.6)]" />
        {/* 窓の列 */}
        {[4, W - 8].map((left) => (
          <div key={left} className="absolute top-3 flex flex-col" style={{ left, gap: ROW_H - 10 }}>
            {Array.from({ length: ROWS }, (_, i) => (
              <span key={i} className="h-[10px] w-[4px] rounded-full bg-[#5B6577]/70" />
            ))}
          </div>
        ))}
        <div className="relative pt-3">{children}</div>
      </div>
      {/* 尾翼 */}
      <svg width={W} height={170} viewBox={`0 0 ${W} 170`} className="block" aria-hidden>
        <path d={`M0 0 L${W} 0 L${W - 70} 120 L${W / 2 + 10} 168 L${W / 2 - 10} 168 L70 120 Z`} fill="url(#fl-skin)" />
        <path d={`M${W / 2 - 14} 70 L${W / 2 - 120} 130 L${W / 2 - 120} 150 L${W / 2 - 12} 120 Z M${W / 2 + 14} 70 L${W / 2 + 120} 130 L${W / 2 + 120} 150 L${W / 2 + 12} 120 Z`} fill="#1B1D22" />
      </svg>
    </div>
  );
}
