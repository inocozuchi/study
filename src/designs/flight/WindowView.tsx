import { useLayoutEffect, useRef, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';

/** 窓枠の絵（public/flight/window-frame.webp）の比と、透過した窓ガラスの位置（絵に対する割合。scripts/process-flight-assets.py） */
const FRAME_AR = 1000 / 1791;
const GLASS = { x: 0.231, y: 0.3316, w: 0.5328, h: 0.4514 };
/**
 * シェード（窓枠の手前に出す 1 枚）。窓枠の絵には引き上げたシェードの帯（取っ手つき）が描いてあるので、
 * その帯ごと自分で覆って描き、下へ引くと同じ 1 枚がそのまま下りてくる（2 枚に見えない）。
 * 見える形は shade-mask.png（窓ガラスの穴 + 上の帯。scripts/process-flight-assets.py の shade_mask）で切り抜く。値は窓枠の絵に対する割合。
 *  - SHADE：シェードの板の上端と、閉めたときの下端。開けたときは下端が帯の下（OPEN_BOTTOM）にくる
 */
const SHADE = { top: 0.27, bottom: 0.79 };
const OPEN_BOTTOM = 0.356;
const SHADE_MASK = `url(${import.meta.env.BASE_URL}flight/shade-mask.png)`;
const BASE = import.meta.env.BASE_URL;

/** 窓の外の画像（フライトの画面を開いたら先に読み込んでおく） */
export const windowUrls = () => [`${BASE}flight/window-frame.webp`, `${BASE}flight/shade-mask.png`, `${BASE}flight/wing.webp`, ...(['day', 'sunset', 'night'] as const).map((s) => `${BASE}flight/${s}/sky.webp`)];

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
 * 窓の外（上の「レーダー地図 | 機窓ビュー」で切り替えるサブの画面。メインはレーダーの地図）。
 * 下から：空と雲海（sky。ゆっくり横に流れる）→ 主翼（wing。かすかに揺れる）→ シェード → 窓枠（window-frame。ガラスは透過）。
 * 右の座席（D / F）は進行方向が右：雲は右から左へ。左の座席（A / C）は雲が左から右へ流れ、主翼を左右反転する。
 */
export function WindowView({ seat, hour }: { seat?: string; hour: number }) {
  const left = /[ABC]$/i.test(seat ?? '');
  const set = skySetFor(hour);
  const box = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  const y = useMotionValue(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // 開けた位置（下端が帯の下）。閉めた位置は 0
  const openY = -(SHADE.bottom - OPEN_BOTTOM) * h;
  const opened = useRef(true);
  useLayoutEffect(() => {
    if (h > 0 && opened.current) y.set(openY);
  }, [h, openY, y]);

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
      <div ref={box} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: `max(100vw, calc(100dvh * ${FRAME_AR}))`, aspectRatio: `${FRAME_AR}` }}>
        <div
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
        </div>
        {/* z10 窓枠（内装のパネル）。押した指はシェードへ通す */}
        <img src={`${BASE}flight/window-frame.webp`} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none" style={{ zIndex: 10, filter: FRAME_FILTER[set] }} />
        {/* z11 シェード：窓ガラスの穴 + 上の帯の形（shade-mask）で切り抜いた 1 枚の板を上下に動かす */}
        {h > 0 && (
          <div className="pointer-events-none absolute inset-0" style={{ zIndex: 11, WebkitMaskImage: SHADE_MASK, maskImage: SHADE_MASK, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' }}>
            <motion.div
              drag="y"
              dragConstraints={{ top: openY, bottom: 0 }}
              dragElastic={0.04}
              dragMomentum={false}
              onDragEnd={() => (opened.current = y.get() < openY * 0.98)}
              className="pointer-events-auto absolute inset-x-[20%] cursor-grab touch-none"
              style={{ y, top: `${SHADE.top * 100}%`, height: `${(SHADE.bottom - SHADE.top) * 100}%`, filter: FRAME_FILTER[set] }}
              aria-label="窓のシェード（上下にドラッグ）"
            >
              <ShadePanel />
            </motion.div>
          </div>
        )}
      </div>

      <p className="absolute inset-x-0 top-[calc(var(--safe-top)+58px)] z-20 text-center text-[12px] text-white/70 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">シェードは上下にドラッグして開け閉めできます</p>
    </motion.div>
  );
}

/** シェードの板（樹脂のうすい横の筋、下の縁の厚み、くぼんだ取っ手）。取っ手は窓の真ん中 */
function ShadePanel() {
  return (
    <div className="relative h-full w-full" style={{ background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0 2px, rgba(0,0,0,0.025) 2px 5px), linear-gradient(180deg,#DAD6CD 0%,#CFCBC2 75%,#C6C2B9 100%)', boxShadow: 'inset 0 -10px 12px -8px rgba(0,0,0,0.25)' }}>
      <span className="absolute inset-x-0 bottom-0 h-[6px] bg-[linear-gradient(180deg,#BDB9B0,#A5A198)]" />
      <span className="absolute bottom-[9px] left-1/2 h-[8px] w-[18%] -translate-x-1/2 rounded-full bg-[#A8A49B] shadow-[inset_0_2px_3px_rgba(0,0,0,0.35),0_1px_0_rgba(255,255,255,0.5)]" />
    </div>
  );
}
