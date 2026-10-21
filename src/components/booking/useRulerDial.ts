import { useCallback, useEffect, useRef, type PointerEvent as RPointerEvent, type WheelEvent as RWheelEvent } from 'react';
import { animate, useMotionValue, type MotionValue } from 'framer-motion';

/**
 * 予約の「横目盛りダイヤル」の手ざわり（見た目は持たない。目盛りの絵はデザインごとに描く）。
 *
 * 目盛りの帯を x だけ動かす（transform。React の再描画なしで指に吸いつく）。
 *   x = -(value - min) * pxPerMin   （帯の左端＝min が中央の ▼ に来ると 0）
 * 指を離すと勢いの先の刻みへスプリングで止まる。刻みをまたぐたびに onDetent（カチッという音）。
 * 値（onChange）は刻みが変わったときだけ渡す。外から value が変わったら（カードを押したなど）帯をそこへ動かす。
 */
export interface RulerDialOptions {
  value: number;
  min: number;
  max: number;
  step: number;
  /** 1 分あたりの幅（px） */
  pxPerMin: number;
  onChange: (value: number) => void;
  onDetent?: () => void;
}

export interface RulerDial {
  x: MotionValue<number>;
  bind: {
    onPointerDown: (e: RPointerEvent) => void;
    onPointerMove: (e: RPointerEvent) => void;
    onPointerUp: (e: RPointerEvent) => void;
    onPointerCancel: (e: RPointerEvent) => void;
    onWheel: (e: RWheelEvent) => void;
  };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function useRulerDial({ value, min, max, step, pxPerMin, onChange, onDetent }: RulerDialOptions): RulerDial {
  const toX = useCallback((v: number) => -(v - min) * pxPerMin, [min, pxPerMin]);
  const x = useMotionValue(toX(value));
  const last = useRef(value);
  const drag = useRef<{ id: number; startX: number; startOffset: number; samples: { t: number; x: number }[] } | null>(null);
  const anim = useRef<ReturnType<typeof animate> | null>(null);
  /** 外から値を変えて帯を動かしている間は、途中の刻みを親へ返さない */
  const programmatic = useRef(false);
  const cb = useRef({ onChange, onDetent });
  cb.current = { onChange, onDetent };

  const snap = useCallback((v: number) => clamp(Math.round((v - min) / step) * step + min, min, max), [min, max, step]);

  // 帯が動くたびに、いま ▼ の下にある刻みを親へ（刻みが変わったときだけ）
  useEffect(
    () =>
      x.on('change', (pos) => {
        const v = snap(min - pos / pxPerMin);
        if (v !== last.current) {
          last.current = v;
          if (programmatic.current) return;
          cb.current.onDetent?.();
          cb.current.onChange(v);
        }
      }),
    [x, snap, min, pxPerMin],
  );

  // 外から値が変わった（カード・刻みの切り替え）ら、帯をそこへ
  useEffect(() => {
    if (drag.current) return;
    // 帯がすでにその刻みを指しているなら（指やスプリングで動いている途中も）何もしない
    if (snap(min - x.get() / pxPerMin) === value) return;
    last.current = value;
    anim.current?.stop();
    programmatic.current = true;
    anim.current = animate(x, toX(value), { type: 'spring', stiffness: 260, damping: 32, onComplete: () => (programmatic.current = false) });
  }, [value, pxPerMin, min, toX, snap, x]);

  const settle = useCallback(
    (velocity: number) => {
      // 勢いの先（0.22 秒ぶん）にある刻みで止める
      const target = snap(min - (x.get() + velocity * 0.22) / pxPerMin);
      anim.current = animate(x, toX(target), { type: 'spring', stiffness: 220, damping: 30, velocity });
    },
    [x, snap, min, pxPerMin, toX],
  );

  const onPointerDown = (e: RPointerEvent) => {
    anim.current?.stop();
    programmatic.current = false;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    drag.current = { id: e.pointerId, startX: e.clientX, startOffset: x.get(), samples: [{ t: e.timeStamp, x: e.clientX }] };
  };
  const onPointerMove = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const lo = toX(max);
    const hi = toX(min);
    let next = d.startOffset + (e.clientX - d.startX);
    // 端では少しだけ引っぱれる（ゴムのように）
    if (next > hi) next = hi + (next - hi) * 0.3;
    if (next < lo) next = lo + (next - lo) * 0.3;
    x.set(next);
    d.samples.push({ t: e.timeStamp, x: e.clientX });
    if (d.samples.length > 6) d.samples.shift();
  };
  const onPointerUp = (e: RPointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const a = d.samples[0];
    const b = d.samples[d.samples.length - 1];
    const dt = (b.t - a.t) / 1000;
    settle(dt > 0 ? (b.x - a.x) / dt : 0);
  };
  const onWheel = (e: RWheelEvent) => {
    anim.current?.stop();
    programmatic.current = false;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    x.set(clamp(x.get() - delta, toX(max), toX(min)));
    if (wheelTimer.current) clearTimeout(wheelTimer.current);
    wheelTimer.current = setTimeout(() => settle(0), 120);
  };
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return { x, bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onWheel } };
}

/** 時間の表記（50m / 1h 20m） */
export function fmtHM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
