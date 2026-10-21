import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useTransform } from 'framer-motion';
import { Check, ChevronDown, Clock3, Search, Shuffle, Timer, X } from 'lucide-react';
import { ambient } from '@/audio/ambient';
import { playSfx } from '@/audio/sfx';
import { useRulerDial } from '@/components/booking/useRulerDial';
import { AIRPORTS, ORIGINS, airportByCode, arc, project, unitsPerKm, type Route } from '../airports';
import { FlightMap, MapAnchor, fitCamera, moveCamera, useCamera, type Camera } from '../FlightMap';
import { AirportPill, OriginMarker, hm } from '../parts';
import { DIAL, snapTo, type FlightDraft } from './FlightBooking';
import type { TimeStep } from '@/types';

const RINGS = [250, 500, 1000, 1500, 2000, 3000];
const PANEL_H = 404;

/** ① フライト予約：上に夜の航路図とレーダー、下に時間のダイヤルと空港のカード */
export function RouteStep({ draft, routes, route, patch, onClose, onNext }: { draft: FlightDraft; routes: Route[]; route: Route; patch: (p: Partial<FlightDraft>) => void; onClose: () => void; onNext: () => void }) {
  const origin = airportByCode(draft.origin);
  const o = project(origin.lon, origin.lat);
  const cam = useCamera({ cx: o.x, cy: o.y, zoom: 0.5 });
  const [size, setSize] = useState({ w: 393, h: 852 });
  const [search, setSearch] = useState<'dest' | 'origin' | null>(null);
  const first = useRef(true);

  // 行き先が変わったら、出発地と行き先が上の地図の部分に収まるようにカメラを動かす
  const path = useMemo(() => arc(origin, route.airport), [origin, route.airport]);
  // ダイヤルを回している間は待ち、止まってから動かす（拡大率が変わるたびに大きな地図を描き直すため）。
  // 拡大率は、行き先が見えなくなる・小さくなりすぎるときだけ変える
  useEffect(() => {
    const pts = [path.p0, path.p2, path.p1];
    const inset = { top: 150, bottom: PANEL_H + 30, left: 46, right: 46 };
    const target = fitCamera(pts, size, inset, 1.25);
    if (first.current) {
      first.current = false;
      moveCamera(cam, target, true);
      return;
    }
    const id = setTimeout(() => {
      const z = cam.zoom.get();
      // 収まらない（引く必要がある）か、ずっと寄れるときだけ拡大率を変え、それ以外は今の拡大率のまま動かす
      const rezoom = target.zoom < z * 0.95 || target.zoom > z * 1.6;
      moveCamera(cam, rezoom ? target : fitCamera(pts, size, inset, 1.25, z));
    }, 260);
    return () => clearTimeout(id);
  }, [path, size]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (r: Route) => patch({ dest: r.airport.code, minutes: snapTo(r.minutes, draft.step) });
  const shuffle = () => {
    const others = routes.filter((r) => r.airport.code !== route.airport.code);
    pick(others[Math.floor(Math.random() * others.length)]);
    playSfx('blip');
  };

  return (
    <div className="absolute inset-0">
      <FlightMap cam={cam} onSize={setSize} svg={<RouteLines cam={cam} lat={origin.lat} o={o} d={path.d} dest={route.airport.code} />}>
        {RINGS.map((km) => (
          <MapAnchor key={km} x={o.x} y={o.y - km * unitsPerKm(origin.lat)} z={1}>
            <span className="fl-num block rounded-full bg-black/50 px-1.5 text-[9px] font-semibold text-white/45">{km} km</span>
          </MapAnchor>
        ))}
        {routes.map((r) => {
          const p = project(r.airport.lon, r.airport.lat);
          const selected = r.airport.code === route.airport.code;
          const near = Math.abs(r.minutes - draft.minutes) <= DIAL[draft.step].step * 1.2;
          return (
            <MapAnchor key={r.airport.code} x={p.x} y={p.y} z={selected ? 5 : near ? 4 : 2}>
              <AirportPill code={r.airport.code} state={selected ? 'selected' : near ? 'near' : 'idle'} onClick={() => pick(r)} />
            </MapAnchor>
          );
        })}
        <MapAnchor x={o.x} y={o.y} z={6}>
          <OriginMarker ping />
        </MapAnchor>
      </FlightMap>

      {/* 上：閉じる・題・シャッフル・検索、出発地 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 pb-8 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
        <div className="screen-header">
          <button onClick={onClose} aria-label="閉じる" className="btn-icon fl-btn fl-glass pointer-events-auto">
            <X />
          </button>
          <div>
            <p className="text-[14px] font-semibold">フライトを予約</p>
            <Steps at={1} />
          </div>
          <button onClick={() => setSearch('dest')} aria-label="空港を探す" className="btn-icon fl-btn fl-glass pointer-events-auto">
            <Search />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between px-5">
          <button onClick={() => setSearch('origin')} className="btn-pill fl-glass pointer-events-auto rounded-full pl-3 pr-2.5 font-normal">
            <span className="text-white/55">出発</span>
            <span className="fl-num font-bold">{origin.code}</span>
            <span className="font-semibold">{origin.name}</span>
            <ChevronDown size={14} className="text-white/60" />
          </button>
          <button onClick={shuffle} aria-label="おまかせ" className="btn-icon fl-btn fl-glass pointer-events-auto">
            <Shuffle />
          </button>
        </div>
      </div>

      {/* 下：刻み・時間・ダイヤル・空港のカード・予約 */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#050608] via-[#050608]/95 to-transparent px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-10" style={{ minHeight: PANEL_H }}>
        <StepToggle step={draft.step} onChange={(s) => patch({ step: s, minutes: snapTo(draft.minutes, s), dest: null })} />
        <div className="mt-3 flex items-end justify-between px-1">
          <motion.p key={draft.minutes} initial={{ opacity: 0.5, y: 4 }} animate={{ opacity: 1, y: 0 }} className="fl-num text-[37px] font-bold leading-none tracking-tight">
            {hm(draft.minutes).replace(/(\d+)([hm])/g, '$1 $2')}
          </motion.p>
          <p className="fl-num pb-1 text-right text-[12.5px] leading-tight text-white/60">
            <span className="block text-[14px] font-bold text-[#FF9F0A]">
              {route.airport.code} <span className="font-semibold text-white">{route.airport.name}</span>
            </span>
            {route.km.toLocaleString()} km
          </p>
        </div>
        <Ruler step={draft.step} value={draft.minutes} onChange={(v) => patch({ minutes: v, dest: null })} />
        <Carousel routes={routes} selected={route.airport.code} onPick={pick} />
        <button onClick={onNext} className="btn-cta fl-cta mt-3">
          フライトを予約
        </button>
      </div>

      <AnimatePresence>
        {search && (
          <AirportSearch
            mode={search}
            routes={routes}
            origin={draft.origin}
            onClose={() => setSearch(null)}
            onPick={(code) => {
              if (search === 'origin') patch({ origin: code, dest: null });
              else {
                const r = routes.find((x) => x.airport.code === code);
                if (r) pick(r);
              }
              setSearch(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function Steps({ at }: { at: 1 | 2 | 3 }) {
  return (
    <span className="mt-1 flex justify-center gap-1" aria-label={`ステップ ${at} / 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-1 rounded-full transition-all ${i === at ? 'w-4 bg-[#FF9F0A]' : 'w-1 bg-white/35'}`} />
      ))}
    </span>
  );
}

/** 航路の線とレーダーの円（地図の単位。線の太さはズームに合わせて一定に見せる） */
function RouteLines({ cam, lat, o, d, dest }: { cam: Camera; lat: number; o: { x: number; y: number }; d: string; dest: string }) {
  const sw = useTransform(cam.zoom, (z) => 1.6 / z);
  const ring = useTransform(cam.zoom, (z) => 1 / z);
  const dash = useTransform(cam.zoom, (z) => `${3 / z} ${5 / z}`);
  return (
    <>
      {RINGS.map((km) => (
        <motion.circle key={km} cx={o.x} cy={o.y} r={km * unitsPerKm(lat)} fill="none" stroke="rgba(255,255,255,0.16)" style={{ strokeWidth: ring, strokeDasharray: dash }} />
      ))}
      <circle cx={o.x} cy={o.y} r={250 * unitsPerKm(lat)} fill="rgba(255,214,10,0.035)" />
      <motion.path key={dest} d={d} fill="none" stroke="#FFFFFF" strokeLinecap="round" style={{ strokeWidth: sw }} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: 'easeOut' }} />
    </>
  );
}

function StepToggle({ step, onChange }: { step: TimeStep; onChange: (s: TimeStep) => void }) {
  const items: { value: TimeStep; label: string; note: string; Icon: typeof Timer }[] = [
    { value: 'pomodoro', label: 'ポモドーロ', note: '25分刻み', Icon: Timer },
    { value: 'free', label: 'フリー', note: '5分刻み', Icon: Clock3 },
  ];
  return (
    <div className="flex justify-center gap-2">
      {items.map(({ value, label, note, Icon }) => {
        const on = value === step;
        return (
          <button key={value} onClick={() => onChange(value)} aria-pressed={on} className={`btn-pill font-semibold transition-colors ${on ? 'bg-white text-[#050608]' : 'fl-tint text-white/80'}`}>
            <Icon size={15} strokeWidth={2.2} />
            {label}
            <span className={on ? 'text-black/45' : 'text-white/45'}>{note}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 横目盛りのダイヤル：中央の ▼ に合わせて左右にドラッグする */
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
      out.push({ x: (m - d.min) * ppm, h: major ? 22 : mid ? 14 : 8, major, label: major ? hm(m) : undefined });
    }
    return out;
  }, [step, d.min, d.max, ppm]);
  const width = (d.max - d.min) * ppm;
  return (
    <div
      className="relative mt-3 h-[66px] touch-none select-none overflow-hidden"
      style={{ WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)', maskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)' }}
      {...dial.bind}
      onPointerDown={(e) => {
        ambient.unlock();
        dial.bind.onPointerDown(e);
      }}
      role="slider"
      aria-label="フライトの時間"
      aria-valuemin={d.min}
      aria-valuemax={d.max}
      aria-valuenow={value}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onChange(Math.min(d.max, value + d.step));
        if (e.key === 'ArrowLeft') onChange(Math.max(d.min, value - d.step));
      }}
    >
      <motion.div className="absolute left-1/2 top-3" style={{ x: dial.x, width, willChange: 'transform' }}>
        <svg width={width + 2} height={52} className="absolute left-0 top-0 overflow-visible">
          {ticks.map((t) => (
            <line key={t.x} x1={t.x + 1} x2={t.x + 1} y1={0} y2={t.h} stroke={t.major ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)'} strokeWidth={t.major ? 1.6 : 1} />
          ))}
        </svg>
        {ticks
          .filter((t) => t.label)
          .map((t) => (
            <span key={t.x} className="fl-num absolute top-[28px] -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-white/70" style={{ left: t.x + 1 }}>
              {t.label}
            </span>
          ))}
      </motion.div>
      {/* 中央の ▼ */}
      <svg className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2" width="16" height="12" viewBox="0 0 16 12" aria-hidden>
        <path d="M1 1h14L8 11z" fill="#FFFFFF" />
      </svg>
      <span className="pointer-events-none absolute left-1/2 top-[10px] h-[26px] w-[2px] -translate-x-1/2 rounded-full bg-white" />
    </div>
  );
}

/** 空港のカード（ダイヤルと連動して横に流れる） */
function Carousel({ routes, selected, onPick }: { routes: Route[]; selected: string; onPick: (r: Route) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    const card = box?.querySelector<HTMLElement>(`[data-code="${selected}"]`);
    if (!box || !card) return;
    box.scrollTo({ left: card.offsetLeft - (box.clientWidth - card.clientWidth) / 2, behavior: 'smooth' });
  }, [selected]);
  return (
    <div ref={ref} className="no-scrollbar -mx-4 mt-2 flex snap-x gap-2 overflow-x-auto px-4 py-1.5">
      {routes.map((r) => {
        const on = r.airport.code === selected;
        return (
          <button
            key={r.airport.code}
            data-code={r.airport.code}
            onClick={() => onPick(r)}
            className={`relative w-[112px] shrink-0 snap-center rounded-[16px] px-3 py-2.5 text-left transition-colors ${on ? 'bg-white text-[#050608]' : 'fl-tint text-white'}`}
          >
            {on && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#FF9F0A] text-[#1A1206]">
                <Check size={12} strokeWidth={3.4} />
              </span>
            )}
            <span className={`fl-num inline-block rounded-[6px] px-1.5 py-[1px] text-[10.5px] font-bold ${on ? 'bg-black/8 bg-[#050608]/10' : 'bg-white/10'}`}>{r.airport.code}</span>
            <span className="mt-1 block truncate text-[13px] font-bold">{r.airport.name}</span>
            <span className={`fl-num block text-[12px] font-semibold ${on ? 'text-black/55' : 'text-white/55'}`}>{hm(r.minutes)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 空港を探す（行き先・出発地） */
function AirportSearch({ mode, routes, origin, onPick, onClose }: { mode: 'dest' | 'origin'; routes: Route[]; origin: string; onPick: (code: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const list = mode === 'origin' ? AIRPORTS.filter((a) => ORIGINS.includes(a.code)).map((a) => ({ a, sub: a.code === origin ? 'いまの出発地' : '' })) : routes.map((r) => ({ a: r.airport, sub: `${hm(r.minutes)} · ${r.km.toLocaleString()} km` }));
  const key = q.trim().toUpperCase();
  const hits = key ? list.filter(({ a }) => a.code.includes(key) || a.name.includes(q.trim())) : list;
  return (
    <motion.div className="absolute inset-0 z-20 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="fl-glass absolute inset-x-3 top-[calc(var(--safe-top)+8px)] max-h-[70%] overflow-hidden rounded-[24px] !bg-[#16181D]/80"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Search size={16} className="text-white/50" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={mode === 'origin' ? '出発する空港' : '空港コード・都市名'} className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/35" />
          <button onClick={onClose} className="text-[13px] font-semibold text-[#FF9F0A]">
            閉じる
          </button>
        </div>
        <div className="no-scrollbar max-h-[56vh] overflow-y-auto py-1">
          {hits.map(({ a, sub }) => (
            <button key={a.code} onClick={() => onPick(a.code)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-white/5">
              <AirportPill code={a.code} state="idle" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{a.name}</span>
              <span className="fl-num text-[12px] text-white/50">{sub}</span>
            </button>
          ))}
          {!hits.length && <p className="px-4 py-6 text-center text-[12.5px] text-white/50">見つかりません</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}
