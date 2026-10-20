import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Angry, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Droplet, Flower2, Footprints, Frown, Headphones, Laugh, ListTodo, Meh, Moon, Mountain, NotebookPen, PenLine, Plus, Salad, Smile, Sparkles, Sprout, Trash2, X, type LucideIcon } from 'lucide-react';
import { useNow } from '@/hooks/useNow';
import { useApp } from '@/store/AppStore';
import { CheckCircle } from '@/components/ui/CheckCircle';
import { addDays, dateKey, fmtDateJa, parseDateKey, startOfWeek, weekdayJa, DAY } from '@/lib/time';
import { SUBJECT_COLORS } from '@/lib/subjects';
import { spring, springBouncy, springSoft } from '@/lib/motion';

export type ToolTab = 'note' | 'todo' | 'habit';

export const TOOL_TABS: { key: ToolTab; label: string; icon: typeof NotebookPen }[] = [
  { key: 'note', label: 'ノート', icon: NotebookPen },
  { key: 'todo', label: 'ToDo', icon: ListTodo },
  { key: 'habit', label: '習慣', icon: Sprout },
];

/** 記録・ToDo・習慣のマルチツール（左に縦タブ、右に中身） */
export function ToolsPanel({ tab, onTab, onClose }: { tab: ToolTab | null; onTab: (t: ToolTab) => void; onClose: () => void }) {
  useEffect(() => {
    if (!tab) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, onClose]);
  return createPortal(
    <AnimatePresence>
      {tab && (
        <div className="fixed inset-x-0 top-0 h-app z-50 flex items-center justify-center p-3">
          <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal
            className="bg-surface shadow-raised relative flex h-[min(78vh,640px)] w-full max-w-lg overflow-hidden rounded-[1.8rem]"
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.94, x: 30 }}
            transition={springBouncy}
          >
            {/* サイドタブ */}
            <nav className="relative flex w-[74px] shrink-0 flex-col items-center gap-2 border-r border-line bg-fill py-4">
              {/* 選択ピル（layoutId は退場アニメーションを止めることがあるため、位置を直接動かす） */}
              <motion.span
                className="absolute left-[7px] top-4 h-[66px] w-[60px] rounded-card bg-surface shadow-card"
                initial={false}
                animate={{ y: TOOL_TABS.findIndex((x) => x.key === tab) * 74 }}
                transition={spring}
              />
              {TOOL_TABS.map(({ key, label, icon: Icon }) => {
                const active = key === tab;
                return (
                  <button key={key} onClick={() => onTab(key)} className="relative flex h-[66px] w-[60px] flex-col items-center justify-center gap-1 rounded-2xl" aria-current={active ? 'page' : undefined}>
                    <Icon size={22} className={`relative ${active ? 'text-accent' : 'text-fg-3'}`} strokeWidth={2.2} />
                    <span className={`relative text-[11px] font-bold ${active ? 'text-fg' : 'text-fg-2'}`}>{label}</span>
                  </button>
                );
              })}
              <div className="flex-1" />
              <button onClick={onClose} aria-label="閉じる" className="hit grid h-9 w-9 place-items-center rounded-full bg-fill text-fg-2">
                <X size={16} />
              </button>
            </nav>
            <div className="relative min-w-0 flex-1 overflow-hidden">
              {/* 入れ子の AnimatePresence(mode=wait) は親の退場を止めてしまうため、タブの中身は入場アニメーションだけ */}
              <motion.div key={tab} className="no-scrollbar absolute inset-0 overflow-y-auto p-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springSoft}>
                {tab === 'note' && <DiaryView />}
                {tab === 'todo' && <TodoView />}
                {tab === 'habit' && <HabitView />}
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ───────────── ノート ─────────────

const MOODS = [
  { v: 1, Icon: Angry, label: 'つらい' },
  { v: 2, Icon: Frown, label: 'いまいち' },
  { v: 3, Icon: Meh, label: 'ふつう' },
  { v: 4, Icon: Smile, label: 'いい' },
  { v: 5, Icon: Laugh, label: 'さいこう' },
] as const;

function DiaryView() {
  const { diary, saveDiary } = useApp();
  const [date, setDate] = useState(() => dateKey(Date.now()));
  const entry = diary.find((d) => d.date === date);
  const [text, setText] = useState(entry?.text ?? '');
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isToday = date === dateKey(Date.now());

  useEffect(() => {
    setText(diary.find((d) => d.date === date)?.text ?? '');
    setSaved(true);
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (v: string) => {
    setText(v);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveDiary(date, { text: v });
      setSaved(true);
    }, 450);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <button aria-label="前の日" onClick={() => setDate(dateKey(addDays(parseDateKey(date), -1)))} className="hit grid h-8 w-8 place-items-center rounded-full bg-fill">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-[17px] font-bold">{isToday ? '今日のノート' : 'ノート'}</p>
          <p className="text-[12px] text-fg-2">{fmtDateJa(parseDateKey(date))}</p>
        </div>
        <button aria-label="次の日" disabled={isToday} onClick={() => setDate(dateKey(addDays(parseDateKey(date), 1)))} className="hit grid h-8 w-8 place-items-center rounded-full bg-fill disabled:opacity-30">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="mt-3 flex justify-between">
        {MOODS.map((m) => {
          const active = entry?.mood === m.v;
          return (
            <motion.button key={m.v} whileTap={{ scale: 0.8 }} transition={springBouncy} onClick={() => saveDiary(date, { mood: m.v, text })} aria-label={`気分：${m.label}`} className={`relative grid h-11 w-11 place-items-center rounded-full transition ${active ? 'bg-accent text-white' : 'bg-fill text-fg-2'}`}>
              <m.Icon size={22} strokeWidth={2} />
            </motion.button>
          );
        })}
      </div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'今日はどんな一日だった？\nできたこと、気づいたこと、明日の自分へ。'}
        className="mt-3 min-h-[240px] w-full flex-1 resize-none rounded-2xl border border-line bg-fill p-4 text-[15px] leading-[32px] text-fg outline-none placeholder:text-fg-3 focus:bg-fill"
        style={{ backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 31px, rgb(var(--c-line)) 31px 32px)', backgroundAttachment: 'local', backgroundPositionY: '15px' }}
      />
      <p className="mt-2 text-right text-[11px] text-fg-3">{saved ? (text ? '保存しました' : '') : '保存中…'} {text.length > 0 && `· ${text.length}文字`}</p>
    </div>
  );
}

// ───────────── ToDo ─────────────

function TodoView() {
  const { todos, addTodo, toggleTodo, deleteTodo } = useApp();
  const [text, setText] = useState('');
  const [showDone, setShowDone] = useState(false);
  const open = todos.filter((t) => !t.done).sort((a, b) => a.createdAt - b.createdAt);
  const done = todos.filter((t) => t.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  const submit = () => {
    if (!text.trim()) return;
    addTodo(text);
    setText('');
  };
  return (
    <div>
      <p className="text-[17px] font-bold">ToDo</p>
      <p className="text-[12px] text-fg-2">のこり {open.length} 件 · 完了 {done.length} 件</p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input className="field py-2.5" placeholder="やることを追加" value={text} onChange={(e) => setText(e.target.value)} maxLength={80} />
        <motion.button whileTap={{ scale: 0.88 }} type="submit" disabled={!text.trim()} aria-label="追加" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-white disabled:opacity-40">
          <Plus size={20} />
        </motion.button>
      </form>
      <ul className="mt-3 space-y-1.5">
        <AnimatePresence initial={false}>
          {open.map((t) => (
            <TodoRow key={t.id} text={t.text} done={false} onToggle={() => toggleTodo(t.id)} onDelete={() => deleteTodo(t.id)} />
          ))}
        </AnimatePresence>
        {open.length === 0 && <li className="py-6 text-center text-[13px] text-fg-3">ぜんぶ終わり！</li>}
      </ul>
      {done.length > 0 && (
        <>
          <button onClick={() => setShowDone((v) => !v)} className="mt-4 flex items-center gap-1 text-[12px] font-bold text-fg-2">
            完了したタスク（{done.length}）<motion.span animate={{ rotate: showDone ? 180 : 0 }}><ChevronDown size={14} /></motion.span>
          </button>
          <AnimatePresence initial={false}>
            {showDone && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-1.5 space-y-1.5 overflow-hidden">
                {done.map((t) => (
                  <TodoRow key={t.id} text={t.text} done onToggle={() => toggleTodo(t.id)} onDelete={() => deleteTodo(t.id)} />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function TodoRow({ text, done, onToggle, onDelete }: { text: string; done: boolean; onToggle: () => void; onDelete: () => void }) {
  return (
    <motion.li layout initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30, height: 0 }} transition={springSoft} className="group flex items-center gap-3 rounded-2xl bg-fill px-3 py-2.5">
      <CheckCircle checked={done} onChange={onToggle} label={text} />
      <span className={`relative min-w-0 flex-1 text-[14px] ${done ? 'text-fg-3' : ''}`}>
        {text}
        {done && (
          <motion.svg className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 overflow-visible" viewBox="0 0 100 4" preserveAspectRatio="none">
            <motion.path d="M0 2 Q30 0.6 60 2.4 T100 1.6" stroke="rgb(var(--c-fg3))" strokeWidth="1.6" fill="none" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35 }}  />
          </motion.svg>
        )}
      </span>
      <button onClick={onDelete} aria-label="削除" className="hit grid h-8 w-8 place-items-center rounded-full text-fg-2 active:bg-fill">
        <Trash2 size={15} />
      </button>
    </motion.li>
  );
}

// ───────────── 習慣 ─────────────

/** 習慣のアイコン。保存する値はキー（以前の絵文字で保存した習慣も同じアイコンで表示する） */
const HABIT_ICONS: { key: string; Icon: LucideIcon; legacy: string }[] = [
  { key: 'book', Icon: BookOpen, legacy: '📖' },
  { key: 'mountain', Icon: Mountain, legacy: '⛰️' },
  { key: 'mind', Icon: Flower2, legacy: '🧘' },
  { key: 'run', Icon: Footprints, legacy: '🏃' },
  { key: 'water', Icon: Droplet, legacy: '💧' },
  { key: 'sleep', Icon: Moon, legacy: '🌙' },
  { key: 'write', Icon: PenLine, legacy: '✍️' },
  { key: 'listen', Icon: Headphones, legacy: '🎧' },
  { key: 'food', Icon: Salad, legacy: '🥗' },
  { key: 'tidy', Icon: Sparkles, legacy: '🧹' },
];
function HabitIcon({ value, size = 20 }: { value: string; size?: number }) {
  const hit = HABIT_ICONS.find((h) => h.key === value || h.legacy === value) ?? HABIT_ICONS[0];
  return <hit.Icon size={size} strokeWidth={2.1} />;
}

function streakOf(log: string[]) {
  const set = new Set(log);
  let n = 0;
  let d = new Date(Date.now());
  if (!set.has(dateKey(d))) d = addDays(d, -1);
  while (set.has(dateKey(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

function HabitView() {
  const { habits, addHabit, toggleHabit, deleteHabit } = useApp();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(HABIT_ICONS[0].key);
  const today = dateKey(Date.now());
  // 週が変わったら（月曜になったら）作り直す
  const weekStart = startOfWeek(useNow(60_000));
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(weekStart + i * DAY)), [weekStart]);

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[17px] font-bold">習慣トラッカー</p>
          <p className="text-[12px] text-fg-2">今日 {habits.filter((h) => h.log.includes(today)).length}/{habits.length} 達成</p>
        </div>
        {habits.length > 0 && (
          <button onClick={() => setEditing((v) => !v)} className="rounded-full bg-fill px-3 py-1.5 text-[12px] font-bold text-fg-2">
            {editing ? '完了' : '編集'}
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2.5">
        <AnimatePresence initial={false}>
          {habits.map((h) => {
            const doneToday = h.log.includes(today);
            const streak = streakOf(h.log);
            return (
              <motion.div key={h.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={springSoft} className="group-box rounded-2xl p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: `${h.color}22`, color: h.color }}><HabitIcon value={h.emoji} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">{h.name}</p>
                    <p className="text-[11px] text-fg-2">{streak > 0 ? `${streak}日連続` : 'きょうから始めよう'} · 累計 {h.log.length}日</p>
                  </div>
                  {editing ? (
                    <button onClick={() => deleteHabit(h.id)} aria-label="削除" className="grid h-9 w-9 place-items-center rounded-full bg-danger-soft text-danger-ink">
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    <CheckCircle checked={doneToday} onChange={() => toggleHabit(h.id, today)} color={h.color} size={34} label={`${h.name} 今日`} />
                  )}
                </div>
                <div className="mt-2.5 grid grid-cols-7 gap-1">
                  {week.map((d) => {
                    const k = dateKey(d);
                    const on = h.log.includes(k);
                    const future = k > today;
                    return (
                      <button key={k} disabled={future} onClick={() => toggleHabit(h.id, k)} className="flex flex-col items-center gap-0.5 disabled:opacity-30" aria-label={`${weekdayJa(d)} ${on ? '達成' : '未達成'}`}>
                        <span className={`text-[11px] font-bold ${k === today ? 'text-fg' : 'text-fg-2'}`}>{weekdayJa(d)}</span>
                        <motion.span className="relative block h-6 w-6 rounded-full" animate={{ scale: on ? 1 : 0.86 }} transition={springBouncy} style={{ background: on ? h.color : 'rgb(var(--c-fill))' }} />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {adding ? (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="group-box mt-3 space-y-3 rounded-2xl p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              addHabit(name, emoji, SUBJECT_COLORS[habits.length % SUBJECT_COLORS.length]);
              setName('');
              setAdding(false);
            }}
          >
            <input className="field py-2.5" placeholder="習慣の名前（例：朝の音読）" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoFocus />
            <div className="flex flex-wrap gap-1.5">
              {HABIT_ICONS.map(({ key, Icon }) => (
                <button type="button" key={key} onClick={() => setEmoji(key)} aria-pressed={emoji === key} className={`grid h-9 w-9 place-items-center rounded-xl ${emoji === key ? 'bg-accent text-white' : 'bg-fill text-fg-2'}`}>
                  <Icon size={18} strokeWidth={2.1} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdding(false)} className="flex-1 rounded-full bg-fill py-2.5 text-[14px] font-bold text-fg-2">やめる</button>
              <button type="submit" disabled={!name.trim()} className="flex-1 rounded-full bg-accent py-2.5 text-[14px] font-semibold text-white disabled:opacity-40">追加</button>
            </div>
          </motion.form>
        ) : (
          <motion.button key="add" whileTap={{ scale: 0.96 }} onClick={() => setAdding(true)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line py-3 text-[14px] font-semibold text-fg-2">
            <Plus size={16} /> 新しい習慣
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
