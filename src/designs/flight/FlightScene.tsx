import { useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Plane } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { useTimer } from '@/store/TimerStore';
import { cabinSound } from '@/audio/cabinSound';
import { AIRPORTS, CITIES, airportByCode, arc, project } from './airports';
import { FlightMap, MapAnchor, MovingAnchor, fitCamera, moveCamera, useZoomLevel } from './FlightMap';
import { AirportPill, OriginMarker, PlaneGlyph } from './parts';
import { flightCam, setFlightView, useFlightView } from './view';
import type { DesignSceneProps } from '../types';
import type { JourneyBooking } from '@/types';

/**
 * 航空デザインの背景：夜の東アジアの地図。
 *  - ホーム：出発空港を中心にレーダーがゆっくり回る
 *  - フライト中：出発地と到着地を結ぶ航路。進み具合に合わせて白い機体が航路の上を進む（飛んだところは明るく、これからは薄く）
 *  - 着陸（リザルト）：機体は到着地に
 * カメラは HUD（FlightSession）のボタン・指の操作で動く（view.ts で共有）。
 */
export function FlightScene({ ended, paused }: DesignSceneProps) {
  const { settings } = useApp();
  const { timer, journeyProgress } = useTimer();
  const view = useFlightView();
  const [size, setSize] = useState({ w: 393, h: 852 });

  // 着陸後（リザルト）も航路を残すため、最後の予約を覚えておく
  const last = useRef<JourneyBooking | null>(timer.booking ?? null);
  if (timer.booking) last.current = timer.booking;
  const journeying = timer.phase !== 'idle' || !!timer.journeyStartedAt;
  const booking = journeying || ended ? last.current : null;

  const origin = airportByCode(booking?.from ?? settings.flightFrom ?? 'HND');
  const dest = booking ? airportByCode(booking.to) : null;
  const path = useMemo(() => (dest ? arc(origin, dest) : null), [origin, dest]);
  const o = project(origin.lon, origin.lat);

  // 進み具合（1 秒ごとに更新される値を、なめらかに追いかける）
  const progress = useMotionValue(ended ? 1 : journeyProgress ?? 0);
  useEffect(() => {
    const to = ended ? 1 : journeyProgress ?? 0;
    const c = animate(progress, to, { duration: Math.abs(to - progress.get()) > 0.2 ? 1.4 : 1, ease: 'linear' });
    return () => c.stop();
  }, [ended, journeyProgress, progress]);
  const px = useTransform(progress, (t) => path?.at(t).x ?? o.x);
  const py = useTransform(progress, (t) => path?.at(t).y ?? o.y);
  const angle = useTransform(progress, (t) => path?.at(t).angle ?? 0);

  // フライトが始まったら、まずルート全体を見せる
  useEffect(() => {
    if (booking) setFlightView({ camera: 'route', window: false, clock: false });
  }, [booking?.bookedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // カメラ
  const first = useRef(true);
  useEffect(() => {
    const instant = first.current;
    first.current = false;
    if (!path) {
      // ホーム：出発地を画面の上寄りに（挨拶の下・集中ボタンの上）
      moveCamera(flightCam, { cx: o.x, cy: o.y + size.h * 0.06 / 0.5, zoom: 0.5 }, instant);
      return;
    }
    if (view.camera === 'route') moveCamera(flightCam, fitCamera([path.p0, path.p1, path.p2], size, { top: 150, bottom: 210, left: 70, right: 70 }, 1.3), instant);
  }, [path, size, view.camera]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!path || view.camera !== 'plane') return;
    // まず機体のところへスプリングで寄り、着いたら機体の動きにそのまま合わせる
    moveCamera(flightCam, { cx: px.get(), cy: py.get(), zoom: Math.max(1.1, flightCam.zoom.get()) });
    return px.on('change', () => {
      if (flightCam.cx.isAnimating() || flightCam.cy.isAnimating()) return;
      flightCam.cx.set(px.get());
      flightCam.cy.set(py.get());
    });
  }, [path, view.camera, px, py]);

  // 機内の音：飛んでいる間だけ
  const flying = !!booking && !ended && timer.phase === 'focus' && timer.running;
  useEffect(() => cabinSound.set(flying && settings.flightCabin), [flying, settings.flightCabin]);
  useEffect(() => () => cabinSound.set(false), []);

  const labels = useZoomLevel(flightCam, 0.3);

  return (
    <div className={`fl-root absolute inset-0 ${paused ? 'fl-still' : ''}`}>
      <FlightMap cam={flightCam} layer={view.layer} onSize={setSize} svg={path && <RouteTrail d={path.d} progress={progress} />}>
        {labels &&
          path &&
          CITIES.map((c) => {
            const p = project(c.lon, c.lat);
            return (
              <MapAnchor key={c.name} x={p.x} y={p.y} z={1}>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="h-[5px] w-[5px] rounded-full bg-white/80" />
                  <span className="text-[10.5px] font-semibold text-white/70 [text-shadow:0_1px_3px_#000]">{c.name}</span>
                </span>
              </MapAnchor>
            );
          })}

        {!path && (
          <>
            {AIRPORTS.filter((a) => a.code !== origin.code).map((a) => {
              const p = project(a.lon, a.lat);
              return (
                <MapAnchor key={a.code} x={p.x} y={p.y} z={2}>
                  <AirportPill code={a.code} />
                </MapAnchor>
              );
            })}
            <MapAnchor x={o.x} y={o.y} z={3}>
              <span className="relative grid h-[300px] w-[300px] place-items-center">
                <span className="fl-sweep absolute inset-0" />
                <span className="absolute inset-[22%] rounded-full border border-white/10" />
                <span className="absolute inset-0 rounded-full border border-white/10" />
                <OriginMarker ping />
              </span>
            </MapAnchor>
          </>
        )}

        {path && dest && (
          <>
            <MapAnchor x={path.p0.x} y={path.p0.y} z={3}>
              <Endpoint code={origin.code} />
            </MapAnchor>
            <MapAnchor x={path.p2.x} y={path.p2.y} z={3}>
              <Endpoint code={dest.code} />
            </MapAnchor>
            <MovingAnchor x={px} y={py} rotate={angle} z={5}>
              <PlaneGlyph size={34} />
            </MovingAnchor>
          </>
        )}
      </FlightMap>
    </div>
  );
}

/** 出発地・到着地：黄色の角丸の印 */
function Endpoint({ code }: { code: string }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-[#FFD60A] text-[#1A1606] shadow-[0_0_0_4px_rgba(255,214,10,0.18)]">
        <Plane size={15} strokeWidth={2.6} className="-rotate-45" />
      </span>
      <span className="fl-num rounded-[5px] bg-black/60 px-1 text-[10.5px] font-bold text-[#FFD60A]">{code}</span>
    </span>
  );
}

/** 航路：これから飛ぶところは薄い破線、飛んだところは明るい線 */
function RouteTrail({ d, progress }: { d: string; progress: ReturnType<typeof useMotionValue<number>> }) {
  const sw = useTransform(flightCam.zoom, (z) => 2.2 / z);
  const thin = useTransform(flightCam.zoom, (z) => 1.4 / z);
  const dash = useTransform(flightCam.zoom, (z) => `${5 / z} ${6 / z}`);
  return (
    <>
      <motion.path d={d} fill="none" stroke="rgba(255,255,255,0.4)" strokeLinecap="round" style={{ strokeWidth: thin, strokeDasharray: dash }} />
      <motion.path d={d} fill="none" stroke="#FFFFFF" strokeLinecap="round" style={{ strokeWidth: sw, pathLength: progress }} />
    </>
  );
}
