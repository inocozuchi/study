import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { MAP } from './airports';

/**
 * 夜の地図（航空デザインの地図はすべてこれ）。
 *
 *  - 地図の絵は public/flight/map-*.svg を <img> で 1 枚。カメラ（中心 cx, cy・倍率 zoom）は transform だけで動かす
 *  - svg：地図の単位で描く線（航路・レーダーの円）。地図と一緒に拡大する（線の太さは non-scaling-stroke で一定）
 *  - children：画面の単位で置くもの（ピル・都市名・飛行機）。<MapAnchor> で地図の位置に合わせ、拡大しない
 * カメラの値は MotionValue。動かしても React は描き直さない。
 */
export interface Camera {
  cx: MotionValue<number>;
  cy: MotionValue<number>;
  zoom: MotionValue<number>;
}

export interface CameraTarget {
  cx: number;
  cy: number;
  zoom: number;
}

export function useCamera(initial: CameraTarget): Camera {
  return { cx: useMotionValue(initial.cx), cy: useMotionValue(initial.cy), zoom: useMotionValue(initial.zoom) };
}

const ZOOM_MIN = 0.14;
const ZOOM_MAX = 3.2;

/** 点の集まりが insets の内側に収まるカメラ */
export function fitCamera(points: { x: number; y: number }[], size: { w: number; h: number }, inset: { top: number; bottom: number; left: number; right: number }, maxZoom = 1.4): CameraTarget {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const w = Math.max(40, size.w - inset.left - inset.right);
  const h = Math.max(40, size.h - inset.top - inset.bottom);
  const zoom = Math.min(maxZoom, Math.max(ZOOM_MIN, Math.min(w / Math.max(1, x1 - x0), h / Math.max(1, y1 - y0))));
  // 余白の中心が点の中心に来るよう、中心をずらす
  const cx = (x0 + x1) / 2 - (inset.left - inset.right) / 2 / zoom;
  const cy = (y0 + y1) / 2 - (inset.top - inset.bottom) / 2 / zoom;
  return { cx, cy, zoom };
}

export function moveCamera(cam: Camera, to: CameraTarget, instant = false) {
  const opts = { type: 'spring' as const, stiffness: 70, damping: 20, restDelta: 0.001 };
  if (instant) {
    cam.cx.set(to.cx);
    cam.cy.set(to.cy);
    cam.zoom.set(to.zoom);
    return;
  }
  animate(cam.cx, to.cx, opts);
  animate(cam.cy, to.cy, opts);
  animate(cam.zoom, Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, to.zoom)), opts);
}

export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

interface Ctx {
  cam: Camera;
  w: MotionValue<number>;
  h: MotionValue<number>;
}
const MapCtx = createContext<Ctx | null>(null);

/** 地図の大きさ（px）を親へ */
export function FlightMap({ cam, layer = 'dark', svg, children, onSize, className = '' }: { cam: Camera; layer?: 'dark' | 'lines'; svg?: ReactNode; children?: ReactNode; onSize?: (s: { w: number; h: number }) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const w = useMotionValue(393);
  const h = useMotionValue(852);
  const sizeCb = useRef(onSize);
  sizeCb.current = onSize;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => {
      w.set(el.clientWidth);
      h.set(el.clientHeight);
      sizeCb.current?.({ w: el.clientWidth, h: el.clientHeight });
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  const transform = useTransform([cam.cx, cam.cy, cam.zoom, w, h], ([cx, cy, z, W, H]: number[]) => `translate3d(${W / 2 - cx * z}px, ${H / 2 - cy * z}px, 0) scale(${z})`);

  return (
    <MapCtx.Provider value={{ cam, w, h }}>
      <div ref={ref} className={`absolute inset-0 overflow-hidden bg-[#050608] ${className}`}>
        <motion.div className="pointer-events-none absolute left-0 top-0 origin-top-left" style={{ width: MAP.width, height: MAP.height, transform, willChange: 'transform' }}>
          <img src={layer === 'dark' ? './flight/map-dark.svg' : './flight/map-lines.svg'} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" />
          <svg viewBox={`0 0 ${MAP.width} ${MAP.height}`} className="absolute inset-0 h-full w-full overflow-visible">
            {svg}
          </svg>
        </motion.div>
        {children}
      </div>
    </MapCtx.Provider>
  );
}

/** 地図の位置（地図の単位）に、拡大しない HTML を置く。中心がその位置に来る */
export function MapAnchor({ x, y, children, className = '', z = 0 }: { x: number; y: number; children: ReactNode; className?: string; z?: number }) {
  const ctx = useContext(MapCtx)!;
  const { cam, w, h } = ctx;
  const tx = useTransform([cam.cx, cam.zoom, w], ([cx, zoom, W]: number[]) => W / 2 + (x - cx) * zoom);
  const ty = useTransform([cam.cy, cam.zoom, h], ([cy, zoom, H]: number[]) => H / 2 + (y - cy) * zoom);
  return (
    <motion.div className={`pointer-events-none absolute left-0 top-0 ${className}`} style={{ x: tx, y: ty, zIndex: z }}>
      <div className="-translate-x-1/2 -translate-y-1/2">{children}</div>
    </motion.div>
  );
}

/** 動く位置（飛行機など）に置く版。位置は MotionValue（地図の単位） */
export function MovingAnchor({ x, y, rotate, children, z = 0 }: { x: MotionValue<number>; y: MotionValue<number>; rotate?: MotionValue<number>; children: ReactNode; z?: number }) {
  const { cam, w, h } = useContext(MapCtx)!;
  const tx = useTransform([x, cam.cx, cam.zoom, w], ([px, cx, zoom, W]: number[]) => W / 2 + (px - cx) * zoom);
  const ty = useTransform([y, cam.cy, cam.zoom, h], ([py, cy, zoom, H]: number[]) => H / 2 + (py - cy) * zoom);
  return (
    <motion.div className="pointer-events-none absolute left-0 top-0" style={{ x: tx, y: ty, zIndex: z }}>
      <motion.div className="-translate-x-1/2 -translate-y-1/2" style={{ rotate }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

/** 地図の 1 単位が画面で何 px か（ズームに合わせて文字を出し入れする） */
export function useZoomLevel(cam: Camera, threshold: number) {
  const [over, setOver] = useState(cam.zoom.get() >= threshold);
  useEffect(() => cam.zoom.on('change', (z) => setOver(z >= threshold)), [cam.zoom, threshold]);
  return over;
}
