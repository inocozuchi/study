import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { ArrowLeftRight, Briefcase, ChevronDown, Clock3, CloudRain, Sun, Timer, X } from 'lucide-react';
import { ambient } from '@/audio/ambient';
import { playSfx } from '@/audio/sfx';
import { useRulerDial } from '@/components/booking/useRulerDial';
import { CLASSES, CLASS_ORDER, LINES, defaultDir, fullLine, kmFor, lineById, onLine, project, stationByName, trackTo, usableDir, type Dir, type Line, type Stop } from './line';
import { DIAL, snapTo, type TrainDraft } from './TrainBooking';
import type { SkyOverride, TimeStep, TrainClass, TrainLine } from '@/types';

/** 時間の表記（50分 / 1時間15分） */
export function jhm(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}時間${m ? `${m}分` : ''}` : `${m}分`;
}

/**
 * ① 行き先：路線の古地図にダイヤルの時間だけ線路が伸び、駅名標が切り替わる。
 * 左上の路線の札で路線と出発駅を選び、隣の札で上り・下りを替える。種別（普通〜特急）で同じ時間に進む距離が変わる。
 */
export function LineStep({ draft, stops, stop, patch, onClose, onNext }: { draft: TrainDraft; stops: Stop[]; stop: Stop | undefined; patch: (p: Partial<TrainDraft>) => void; onClose: () => void; onNext: () => void }) {
  const [options, setOptions] = useState(false);
  const [lines, setLines] = useState(false);
  const line = lineById(draft.line);
  const pick = (s: Stop) => patch({ dest: s.station.name, minutes: snapTo(s.minutes, draft.step) });
  const idx = stop ? stops.indexOf(stop) : -1;
  const prev = idx > 0 ? stops[idx - 1].station : stationByName(line, draft.origin);
  const next = stops[idx + 1]?.station;
  const ends = line.stations;
  const toward = draft.dir === 1 ? ends[ends.length - 1].name : ends[0].name;
  // 向きを替える：端の駅なら反対の端から出発する
  const flip = () => {
    const dir = (-draft.dir) as Dir;
    if (usableDir(line, draft.origin, dir) === dir) patch({ dir, dest: null });
    else {
      const origin = draft.dir === 1 ? ends[ends.length - 1].name : ends[0].name;
      patch({ origin, dir: usableDir(line, origin, dir), dest: null });
    }
  };

  return (
    <div className="tr-mincho absolute inset-0 flex flex-col">
      {/* 見出し */}
      <div className="flex items-center justify-between px-4 pt-safe">
        <button onClick={onClose} aria-label="閉じる" className="tr-brass mt-1 grid h-11 w-11 place-items-center rounded-full active:scale-95">
          <X size={19} />
        </button>
        <div className="mt-1 text-center">
          <p className="text-[17px] font-bold tracking-[0.2em] text-[#F4EEDD]">乗車券を買ふ</p>
          <Steps at={1} />
        </div>
        <button onClick={() => setOptions(true)} aria-label="旅の支度（天気・時間帯・走行音）" className="tr-brass mt-1 grid h-11 w-11 place-items-center rounded-full active:scale-95">
          <Briefcase size={18} />
        </button>
      </div>

      {/* 古地図 */}
      <div className="tr-paper tr-frame relative mx-3.5 mt-3 min-h-[190px] flex-1 overflow-hidden rounded-[6px]">
        <OldMap key={line.id} line={line} origin={draft.origin} dir={draft.dir} km={kmFor(draft.minutes, draft.cls)} minutes={draft.minutes} stops={stops} stop={stop} onPick={pick} />
        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-center gap-1.5">
          <button onClick={() => setLines(true)} aria-label="路線と出発駅を選ぶ" className="pointer-events-auto flex items-center gap-1 rounded-[3px] border border-[#6B4A2B] bg-[#F4EEDD]/90 px-2 py-0.5 text-[12px] font-bold tracking-[0.15em] text-[#4A2E1C] active:scale-95">
            {line.name} <ChevronDown size={12} />
          </button>
          <button onClick={flip} aria-label="上り・下りを替える" className="pointer-events-auto flex items-center gap-1 rounded-[3px] bg-[#7A2830] px-2 py-0.5 text-[12px] font-bold text-[#F4EEDD] active:scale-95">
            {draft.origin}發 · {toward}方面 <ArrowLeftRight size={12} />
          </button>
        </div>
        <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] tracking-[0.3em] text-[#6B4A2B]/70">鐵道路線圖</span>
      </div>

      {/* 駅名標（行き先） */}
      <div className="mx-auto mt-3 w-[min(86vw,320px)] shrink-0">
        {stop ? (
        <motion.div key={stop.station.name} initial={{ rotateX: -70, opacity: 0.4 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="tr-enamel overflow-hidden rounded-[6px] text-center" style={{ transformPerspective: 600 }}>
          <p className="pt-1.5 text-[12px] font-bold tracking-[0.3em] text-[#4A2E1C]">{stop.station.name}</p>
          <p className="-mt-0.5 text-[30px] font-bold leading-tight tracking-[0.18em]">{stop.station.kana}</p>
          <p className="pb-1 font-sans text-[11px] font-semibold tracking-[0.2em] text-[#6B7076]">{stop.station.roman}</p>
          <div className="flex items-center justify-between bg-[#7A2830] px-3 py-1 text-[12px] font-bold text-[#F4EEDD]">
            <span>← {prev.name}</span>
            <span className="text-[#D9C08A]">{CLASSES[draft.cls].label}</span>
            <span>{next ? `${next.name} →` : '終点'}</span>
          </div>
        </motion.div>
        ) : (
          <p className="tr-enamel rounded-[6px] py-4 text-center text-[15px] font-bold tracking-[0.2em]">この先に駅がありません</p>
        )}
      </div>

      <div className="mt-3 shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)]">
        <ClassPlates cls={draft.cls} onChange={(cls) => patch({ cls, dest: null })} />
        <StepPlates step={draft.step} onChange={(s) => patch({ step: s, minutes: snapTo(draft.minutes, s), dest: null })} />
        <p className="mt-2.5 flex items-baseline justify-between px-1 text-[#F4EEDD]">
          <span className="text-[13px] tracking-[0.2em] text-[#D9C08A]">所要</span>
          <span className="text-[30px] font-bold tabular-nums tracking-wider">{jhm(draft.minutes)}</span>
          <span className="text-[13px] tabular-nums text-[#F4EEDD]/75">營業キロ {stop?.km ?? 0} 粁</span>
        </p>
        <BrassRuler step={draft.step} value={draft.minutes} onChange={(v) => patch({ minutes: v, dest: null })} />
        <button onClick={onNext} disabled={!stop} className="tr-enji mt-3 h-14 w-full rounded-[12px] text-[18px] font-bold tracking-[0.3em] active:scale-[0.98]">
          座席を指定する
        </button>
      </div>

      <AnimatePresence>{options && <TripOptions draft={draft} patch={patch} onClose={() => setOptions(false)} />}</AnimatePresence>
      <AnimatePresence>
        {lines && (
          <LinePicker
            line={draft.line}
            origin={draft.origin}
            onPick={(id, origin) => {
              const l = lineById(id);
              const o = origin && onLine(l, origin) ? origin : onLine(l, draft.origin) ? draft.origin : l.major[0];
              patch({ line: id, origin: o, dir: usableDir(l, o, defaultDir(l, o)), dest: null });
            }}
            onClose={() => setLines(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function Steps({ at }: { at: 1 | 2 | 3 }) {
  return (
    <span className="mt-1 flex justify-center gap-1.5" aria-label={`ステップ ${at} / 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-1.5 w-1.5 rotate-45 ${i === at ? 'bg-[#D9C08A]' : 'bg-[#D9C08A]/30'}`} />
      ))}
    </span>
  );
}

/**
 * 古地図：カメラ（中心と倍率）を transform で動かす。線路は太さが一定に見えるよう倍率で割る。
 * 地図は路線ごと（大きさ・縮尺が違う）なので、倍率の上限と駅名を全部出す倍率は「地図 1 度あたりの px」で決める。
 */
function OldMap({ line, origin, dir, km, minutes, stops, stop, onPick }: { line: Line; origin: string; dir: Dir; km: number; minutes: number; stops: Stop[]; stop: Stop | undefined; onPick: (s: Stop) => void }) {
  const MAP = line.map;
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 300 });
  const cx = useMotionValue(MAP.width * 0.5);
  const cy = useMotionValue(MAP.height * 0.5);
  const z = useMotionValue(0.3);
  const zMax = Math.min(2.2, 390 / MAP.scale);
  const first = useRef(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const track = useMemo(() => trackTo(line, origin, dir, km), [line, origin, dir, km]);
  const full = useMemo(() => fullLine(line), [line]);
  const o = stationByName(line, origin);
  const op = project(line, o.lon, o.lat);
  const dp = stop ? project(line, stop.station.lon, stop.station.lat) : op;

  // 出発駅・線路の先・行き先の駅が収まるように
  useEffect(() => {
    const pts = [op, dp, track[track.length - 1]];
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const pad = 44;
    const w = Math.max(1, Math.max(...xs) - Math.min(...xs));
    const h = Math.max(1, Math.max(...ys) - Math.min(...ys));
    const zoom = Math.min(zMax, Math.max(0.08, Math.min((size.w - pad * 2) / w, (size.h - pad * 2 - 20) / h)));
    const to = { cx: (Math.max(...xs) + Math.min(...xs)) / 2, cy: (Math.max(...ys) + Math.min(...ys)) / 2 - 8 / zoom, zoom };
    const opts = { type: 'spring' as const, stiffness: 90, damping: 22 };
    if (first.current) {
      cx.set(to.cx);
      cy.set(to.cy);
      z.set(to.zoom);
      first.current = false;
      return;
    }
    animate(cx, to.cx, opts);
    animate(cy, to.cy, opts);
    animate(z, to.zoom, opts);
  }, [stop?.station.name, origin, dir, Math.round(minutes / 25), size.w, size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  const transform = useTransform([cx, cy, z], ([x, y, s]: number[]) => `translate3d(${size.w / 2 - x * s}px, ${size.h / 2 - y * s}px, 0) scale(${s})`);
  const base = useTransform(z, (s) => 6 / s);
  const dash = useTransform(z, (s) => `${9 / s} ${9 / s}`);
  const inner = useTransform(z, (s) => 3.4 / s);
  const route = useTransform(z, (s) => 6.5 / s);
  const [labelsAll, setLabelsAll] = useState(false);
  useEffect(() => z.on('change', (s) => setLabelsAll(s * MAP.scale > 170)), [z, MAP.scale]);

  const toPts = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const end = track[track.length - 1];

  return (
    <div ref={ref} className="absolute inset-0">
      <motion.div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ width: MAP.width, height: MAP.height, transform, willChange: 'transform' }}>
        {/* 地図の絵は別の合成レイヤーに（線路の線が伸びても、地図を描き直さない） */}
        <img src={line.mapUrl} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" style={{ willChange: 'transform' }} />
        <svg viewBox={`0 0 ${MAP.width} ${MAP.height}`} className="absolute inset-0 h-full w-full overflow-visible">
          {/* 鉄道の記号（黒と白の旗竿） */}
          <motion.polyline points={toPts(full)} fill="none" stroke="#2D241C" strokeLinejoin="round" style={{ strokeWidth: base }} />
          <motion.polyline points={toPts(full)} fill="none" stroke="#F4EEDD" strokeLinejoin="round" style={{ strokeWidth: inner, strokeDasharray: dash }} />
          {/* 選んだ区間（臙脂） */}
          <motion.polyline points={toPts(track)} fill="none" stroke="#7A2830" strokeLinecap="round" strokeLinejoin="round" style={{ strokeWidth: route }} />
        </svg>
      </motion.div>
      {line.stations.map((s) => {
        const p = project(line, s.lon, s.lat);
        const st = stops.find((x) => x.station.name === s.name);
        const isOrigin = s.name === origin;
        const isDest = s.name === stop?.station.name;
        const showLabel = isOrigin || isDest || labelsAll || line.major.includes(s.name);
        return <StationMark key={s.name} x={p.x} y={p.y} cx={cx} cy={cy} z={z} size={size} name={s.name} label={showLabel} kind={isDest ? 'dest' : isOrigin ? 'origin' : 'stop'} onClick={st ? () => onPick(st) : undefined} />;
      })}
      {/* 線路の先（いまのダイヤルの時間） */}
      <StationMark x={end.x} y={end.y} cx={cx} cy={cy} z={z} size={size} name="" label={false} kind="head" />
    </div>
  );
}

function StationMark({ x, y, cx, cy, z, size, name, label, kind, onClick }: { x: number; y: number; cx: MotionValue<number>; cy: MotionValue<number>; z: MotionValue<number>; size: { w: number; h: number }; name: string; label: boolean; kind: 'origin' | 'dest' | 'stop' | 'head'; onClick?: () => void }) {
  const tx = useTransform([cx, z], ([c, s]: number[]) => size.w / 2 + (x - c) * s);
  const ty = useTransform([cy, z], ([c, s]: number[]) => size.h / 2 + (y - c) * s);
  if (kind === 'head') {
    return (
      <motion.span className="pointer-events-none absolute left-0 top-0" style={{ x: tx, y: ty }}>
        <span className="block h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#F4EEDD] bg-[#7A2830] shadow-[0_0_0_2px_#7A2830]" />
      </motion.span>
    );
  }
  return (
    <motion.button type="button" onClick={onClick} disabled={!onClick} className="absolute left-0 top-0" style={{ x: tx, y: ty, zIndex: kind === 'stop' ? 1 : 2 }} aria-label={name}>
      <span className="flex -translate-x-1/2 -translate-y-[7px] flex-col items-center">
        <span className={`block rounded-full border-[2px] ${kind === 'dest' ? 'h-4 w-4 border-[#7A2830] bg-[#F4EEDD]' : kind === 'origin' ? 'h-3.5 w-3.5 border-[#2D241C] bg-[#2D241C]' : 'h-3 w-3 border-[#2D241C] bg-[#F4EEDD]'}`} />
        {label && (
          <span className={`tr-mincho mt-0.5 whitespace-nowrap rounded-[2px] px-1 text-[12px] font-bold leading-tight ${kind === 'dest' ? 'bg-[#7A2830] text-[#F4EEDD]' : 'bg-[#F4EEDD]/80 text-[#2D241C]'}`}>{name}</span>
        )}
      </span>
    </motion.button>
  );
}

/** 種別の札：普通 / 快速 / 急行 / 特急（同じ時間に進む距離が変わる） */
function ClassPlates({ cls, onChange }: { cls: TrainClass; onChange: (c: TrainClass) => void }) {
  return (
    <div className="mb-2 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="種別">
      {CLASS_ORDER.map((c) => {
        const on = c === cls;
        return (
          <button key={c} role="radio" aria-checked={on} onClick={() => onChange(c)} className={`h-9 rounded-[6px] text-[14px] font-bold tracking-[0.2em] ${on ? 'tr-enji' : 'border border-[#B8955A]/45 bg-black/25 text-[#F4EEDD]/80'}`}>
            {CLASSES[c].label}
          </button>
        );
      })}
    </div>
  );
}

/** 路線と出発駅を選ぶ（古い路線図の帳面ふう） */
function LinePicker({ line, origin, onPick, onClose }: { line: TrainLine; origin: string; onPick: (line: TrainLine, origin?: string) => void; onClose: () => void }) {
  const current = lineById(line);
  return (
    <motion.div className="absolute inset-0 z-30 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="tr-paper no-scrollbar absolute inset-x-4 top-[calc(var(--safe-top)+56px)] max-h-[calc(100%-var(--safe-top)-90px)] overflow-y-auto rounded-[8px] p-4 shadow-[0_0_0_2px_#6B4A2B,0_0_0_5px_#F4EEDD,0_0_0_6px_#6B4A2B,0_24px_50px_-20px_rgba(0,0,0,0.9)]"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -16, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-[17px] font-bold tracking-[0.3em] text-[#4A2E1C]">路線を選ぶ</p>
        <div className="mt-3 space-y-1.5">
          {LINES.map((l) => {
            const on = l.id === line;
            return (
              <button key={l.id} onClick={() => onPick(l.id)} aria-pressed={on} className={`flex w-full items-center justify-between gap-2 rounded-[6px] px-3 py-2 text-left ${on ? 'tr-enji' : 'border border-[#6B4A2B]/35 text-[#2D241C]'}`}>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-bold tracking-[0.1em]">{l.name}</span>
                  <span className={`block text-[11.5px] ${on ? 'text-[#D9C08A]' : 'text-[#6B4A2B]'}`}>{l.span}</span>
                </span>
                <span className={`shrink-0 text-[12px] tabular-nums ${on ? 'text-[#F4EEDD]/80' : 'text-[#6B4A2B]'}`}>{Math.round(l.totalKm).toLocaleString()} 粁</span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-[12px] font-bold tracking-[0.2em] text-[#6B4A2B]">出發驛 · {current.name}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {current.major.map((name) => (
            <button key={name} onClick={() => onPick(current.id, name)} aria-pressed={name === origin} className={`h-9 rounded-[6px] px-3 text-[14px] font-bold ${name === origin ? 'tr-enji' : 'border border-[#6B4A2B]/40 text-[#4A2E1C]'}`}>
              {name}
            </button>
          ))}
        </div>
        {current.id === 'trail' && <p className="mt-3 text-[11.5px] leading-relaxed text-[#6B4A2B]">長い旅は何回かに分けて乗り継げます。着いた駅が次の出發驛になります。</p>}
        <button onClick={onClose} className="tr-enji mt-4 h-11 w-full rounded-[8px] text-[15px] font-bold tracking-[0.3em]">
          これでよし
        </button>
      </motion.div>
    </motion.div>
  );
}

function StepPlates({ step, onChange }: { step: TimeStep; onChange: (s: TimeStep) => void }) {
  const items: { value: TimeStep; label: string; note: string; Icon: typeof Timer }[] = [
    { value: 'pomodoro', label: 'ポモドーロ', note: '二十五分刻み', Icon: Timer },
    { value: 'free', label: 'フリー', note: '五分刻み', Icon: Clock3 },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(({ value, label, note, Icon }) => {
        const on = value === step;
        return (
          <button key={value} onClick={() => onChange(value)} aria-pressed={on} className={`flex h-11 items-center justify-center gap-1.5 rounded-[8px] text-[14px] font-bold transition-colors ${on ? 'tr-brass' : 'border border-[#B8955A]/45 bg-black/25 text-[#F4EEDD]/80'}`}>
            <Icon size={15} />
            {label}
            <span className={`text-[11px] ${on ? 'text-[#2B1D0E]/65' : 'text-[#F4EEDD]/50'}`}>{note}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 真鍮の物差し（左右にドラッグ） */
function BrassRuler({ step, value, onChange }: { step: TimeStep; value: number; onChange: (v: number) => void }) {
  const d = DIAL[step];
  const ppm = step === 'pomodoro' ? 4.4 : 7;
  const dial = useRulerDial({ value, min: d.min, max: d.max, step: d.step, pxPerMin: ppm, onChange, onDetent: () => playSfx('tick') });
  const ticks = useMemo(() => {
    const out: { x: number; h: number; label?: string; major: boolean }[] = [];
    for (let m = d.min; m <= d.max; m++) {
      if (step === 'pomodoro' && m % 5) continue;
      const major = step === 'pomodoro' ? m % 25 === 0 : m % 10 === 0;
      const mid = !major && m % 5 === 0;
      out.push({ x: (m - d.min) * ppm, h: major ? 20 : mid ? 13 : 7, major, label: major && (step === 'pomodoro' || m % 30 === 0 || m === d.min + 5) ? jhm(m) : undefined });
    }
    return out;
  }, [step, d.min, d.max, ppm]);
  const width = (d.max - d.min) * ppm;
  return (
    <div
      className="tr-ruler relative mt-2 h-[64px] touch-none select-none overflow-hidden rounded-[8px]"
      {...dial.bind}
      onPointerDown={(e) => {
        ambient.unlock();
        dial.bind.onPointerDown(e);
      }}
      role="slider"
      aria-label="乗車の時間"
      aria-valuemin={d.min}
      aria-valuemax={d.max}
      aria-valuenow={value}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onChange(Math.min(d.max, value + d.step));
        if (e.key === 'ArrowLeft') onChange(Math.max(d.min, value - d.step));
      }}
    >
      <motion.div className="absolute left-1/2 top-0" style={{ x: dial.x, width }}>
        <svg width={width + 2} height={40} className="absolute left-0 top-0 overflow-visible">
          {ticks.map((t) => (
            <line key={t.x} x1={t.x + 1} x2={t.x + 1} y1={0} y2={t.h} stroke="#3B2614" strokeOpacity={t.major ? 0.95 : 0.55} strokeWidth={t.major ? 1.6 : 1} />
          ))}
        </svg>
        {ticks
          .filter((t) => t.label)
          .map((t) => (
            <span key={t.x} className="tr-mincho absolute top-[26px] -translate-x-1/2 whitespace-nowrap text-[12px] font-bold text-[#3B2614]" style={{ left: t.x + 1 }}>
              {t.label}
            </span>
          ))}
      </motion.div>
      <svg className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2" width="18" height="14" viewBox="0 0 18 14" aria-hidden>
        <path d="M1 0h16L9 13z" fill="#7A2830" stroke="#F4EEDD" strokeWidth="1.2" />
      </svg>
      <span className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#6b4a22]/45 to-transparent" />
      <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#6b4a22]/45 to-transparent" />
    </div>
  );
}

const SKIES: { value: SkyOverride; label: string }[] = [
  { value: 'auto', label: '旅の時間' },
  { value: 'clock', label: '今の時刻' },
  { value: 'day', label: '晝' },
  { value: 'sunset', label: '夕' },
  { value: 'night', label: '夜' },
];

/** 旅の支度：天気・時間帯・走行音 */
function TripOptions({ draft, patch, onClose }: { draft: TrainDraft; patch: (p: Partial<TrainDraft>) => void; onClose: () => void }) {
  const o = draft.options;
  const set = (p: Partial<TrainDraft['options']>) => patch({ options: { ...o, ...p } });
  return (
    <motion.div className="absolute inset-0 z-30 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="tr-paper absolute inset-x-4 top-[calc(var(--safe-top)+64px)] rounded-[8px] p-5 shadow-[0_0_0_2px_#6B4A2B,0_0_0_5px_#F4EEDD,0_0_0_6px_#6B4A2B,0_24px_50px_-20px_rgba(0,0,0,0.9)]"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -16, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-[17px] font-bold tracking-[0.3em] text-[#4A2E1C]">旅の支度</p>
        <p className="mt-4 text-[12px] font-bold tracking-[0.2em] text-[#6B4A2B]">天氣</p>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {[
            { v: 'clear' as const, label: '晴れ', Icon: Sun },
            { v: 'rain' as const, label: '雨', Icon: CloudRain },
          ].map(({ v, label, Icon }) => (
            <button key={v} onClick={() => set({ trainWeather: v })} className={`flex h-10 items-center justify-center gap-1.5 rounded-[6px] text-[15px] font-bold ${o.trainWeather === v ? 'tr-enji' : 'border border-[#6B4A2B]/40 text-[#4A2E1C]'}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-[12px] font-bold tracking-[0.2em] text-[#6B4A2B]">時間帯</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SKIES.map((s) => (
            <button key={s.value} onClick={() => set({ sky: s.value })} className={`h-9 rounded-[6px] px-3 text-[14px] font-bold ${o.sky === s.value ? 'tr-enji' : 'border border-[#6B4A2B]/40 text-[#4A2E1C]'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span>
            <span className="block text-[15px] font-bold text-[#2D241C]">走行音</span>
            <span className="block font-sans text-[11.5px] text-[#6B4A2B]">public/sounds/train.* を鳴らす</span>
          </span>
          <button onClick={() => set({ trainSound: !o.trainSound })} aria-pressed={o.trainSound} aria-label="走行音" className={`relative h-8 w-14 rounded-full transition-colors ${o.trainSound ? 'bg-[#7A2830]' : 'bg-[#6B4A2B]/30'}`}>
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-[#F4EEDD] shadow transition-transform ${o.trainSound ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
        <button onClick={onClose} className="tr-enji mt-5 h-11 w-full rounded-[8px] text-[15px] font-bold tracking-[0.3em]">
          これでよし
        </button>
      </motion.div>
    </motion.div>
  );
}
