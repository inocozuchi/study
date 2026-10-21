import { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

/** 窓枠の絵（public/flight/window-frame.webp）の比と、透過した窓ガラスの位置（絵に対する割合。scripts/process-flight-assets.py） */
const FRAME_AR = 1000 / 1791;
const GLASS = { x: 0.231, y: 0.3316, w: 0.5328, h: 0.4514 };
const BASE = import.meta.env.BASE_URL;

export type SkySet = 'day' | 'sunset' | 'night';
/** 時間帯 → 空の絵（夜明けは夕方の絵） */
export const skySetFor = (hour: number): SkySet => (hour >= 6.5 && hour < 16.5 ? 'day' : (hour >= 16.5 && hour < 19) || (hour >= 5 && hour < 6.5) ? 'sunset' : 'night');

/** 窓枠・主翼にかける色（夜は内装を暗く、夕方は暖かく。動かない絵にだけかける） */
const FRAME_FILTER: Record<SkySet, string> = {
  day: 'none',
  sunset: 'brightness(0.82) sepia(0.18)',
  night: 'brightness(0.4) saturate(0.7)',
};
const WING_FILTER: Record<SkySet, string> = {
  day: 'none',
  sunset: 'sepia(0.4) saturate(1.3) brightness(0.82) hue-rotate(-8deg)',
  night: 'brightness(0.32) saturate(0.6)',
};

/**
 * 窓の外（右上の窓のボタンで開くサブの画面。メインはレーダーの地図）。
 * 下から：空と雲海（sky。ゆっくり横に流れる）→ 主翼（wing。かすかに揺れる）→ シェード → 窓枠（window-frame。ガラスは透過）。
 * 右の座席（D / F）は進行方向が右：雲は右から左へ。左の座席（A / C）は雲が左から右へ流れ、主翼を左右反転する。
 */
export function WindowView({ onClose, seat, hour }: { onClose: () => void; seat?: string; hour: number }) {
  const left = /[ABC]$/i.test(seat ?? '');
  const set = skySetFor(hour);
  const glass = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = glass.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const lip = h * 0.05;

  return (
    <motion.div
      className="absolute inset-0 z-[35] overflow-hidden bg-[#121418]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {/* 窓枠の絵を画面いっぱいに（cover）。窓ガラスの位置はこの箱の割合で決まる */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: `max(100vw, calc(100dvh * ${FRAME_AR}))`, aspectRatio: `${FRAME_AR}` }}>
        <div
          ref={glass}
          className="absolute overflow-hidden rounded-[48%/34%]"
          style={{ left: `${(GLASS.x - 0.01) * 100}%`, top: `${(GLASS.y - 0.01) * 100}%`, width: `${(GLASS.w + 0.02) * 100}%`, height: `${(GLASS.h + 0.02) * 100}%` }}
        >
          {/* z1 空と雲海：2 枚つなぎを流す */}
          <div className={`fl-sky absolute inset-y-0 left-0 flex h-full w-max ${left ? 'fl-sky-rev' : ''}`} style={{ zIndex: 1 }}>
            {[0, 1].map((k) => (
              <img key={k} src={`${BASE}flight/${set}/sky.webp`} alt="" draggable={false} className="h-full w-auto max-w-none select-none" />
            ))}
          </div>
          {/* z5 主翼：左の座席は左右反転。揺れは内側の箱だけ */}
          <div className="absolute bottom-[-4%] w-[175%]" style={{ zIndex: 5, [left ? 'right' : 'left']: '-62%', transform: left ? 'scaleX(-1)' : undefined }}>
            <div className="fl-wing">
              <img src={`${BASE}flight/wing.webp`} alt="" draggable={false} className="block w-full select-none" style={{ filter: WING_FILTER[set] }} />
            </div>
          </div>
          {/* シェード（下へ引くと閉まる）。窓枠の下に入る */}
          {h > 0 && (
            <motion.div
              drag="y"
              dragConstraints={{ top: -(h - lip), bottom: 0 }}
              dragElastic={0.04}
              dragMomentum={false}
              initial={{ y: -(h - lip) }}
              className="absolute inset-x-0 top-0 cursor-grab touch-none"
              style={{ height: h, zIndex: 8 }}
              aria-label="窓のシェード（上下にドラッグ）"
            >
              <div className="h-full w-full" style={{ background: 'repeating-linear-gradient(180deg,#DAD6CD 0 3px,#CFCBC1 3px 4px)', filter: FRAME_FILTER[set] }} />
              <span className="absolute bottom-[10px] left-1/2 h-[6px] w-14 -translate-x-1/2 rounded-full bg-[#9F9B93] shadow-[inset_0_1px_1px_rgba(0,0,0,0.25)]" />
            </motion.div>
          )}
        </div>
        {/* z10 窓枠（内装のパネル）。押した指はシェードへ通す */}
        <img src={`${BASE}flight/window-frame.webp`} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none" style={{ zIndex: 10, filter: FRAME_FILTER[set] }} />
      </div>

      <button onClick={onClose} aria-label="窓を閉じる（地図に戻る）" className="fl-glass absolute left-1/2 top-[calc(var(--safe-top)+10px)] z-20 flex h-10 -translate-x-1/2 items-center gap-1.5 rounded-full pl-3 pr-4 text-[14px] font-semibold active:scale-95">
        <X size={16} /> 地図に戻る
      </button>
      <p className="absolute inset-x-0 top-[calc(var(--safe-top)+60px)] z-20 text-center text-[12px] text-white/70 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">シェードは上下にドラッグして開け閉めできます</p>
    </motion.div>
  );
}
