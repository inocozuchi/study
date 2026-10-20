import { useEffect, useRef, useState } from 'react';

/**
 * アプリ全体で使うクレヨン調の SVG フィルタ。
 *  - #crayon       ：静的な絵（山・草原・木・テント）。輪郭を揺らし、紙目にワックスが乗らない粒を抜く
 *  - #crayon-soft  ：UI の線（ボタンの縁取り・下線）用の弱いもの
 *  - #crayon-boil  ：キャラクター用。乱数の種を 8fps で入れ替え、手描きアニメの「線の震え」を出す
 * アニメーションする要素をこのフィルタの内側に置くと毎フレーム再計算になるため、
 * 動く絵は小さな箱（キャラクター）だけにかける。
 */
export function CrayonDefs() {
  const boilRef = useRef<SVGFETurbulenceElement>(null);
  useEffect(() => {
    let seed = 1;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const id = setInterval(() => {
      seed = (seed % 4) + 1;
      boilRef.current?.setAttribute('seed', String(seed));
    }, 125);
    return () => clearInterval(id);
  }, []);

  return (
    <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden>
      <defs>
        <filter id="crayon" x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="2" seed="3" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -7 0 0 0 5.35" result="mask" />
          <feComposite in="rough" in2="mask" operator="in" />
        </filter>
        <filter id="crayon-soft" x="-6%" y="-20%" width="112%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="11" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="2" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5 0 0 0 3.9" result="mask" />
          <feComposite in="rough" in2="mask" operator="in" />
        </filter>
        <filter id="crayon-boil" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence ref={boilRef} type="fractalNoise" baseFrequency="0.07" numOctaves="2" seed="1" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="9" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5 0 0 0 3.85" result="mask" />
          <feComposite in="rough" in2="mask" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

/** 手描きの縁取り（円 or 角丸）。親要素（relative）に重ねて使う。2 回なぞったような線にする */
export function CrayonOutline({ shape = 'rect', color = 'currentColor', width = 2, radius = 22, className = '' }: { shape?: 'rect' | 'circle'; color?: string; width?: number; radius?: number; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w, h } = box;
  const i = width;
  return (
    <svg ref={ref} className={`pointer-events-none absolute inset-0 h-full w-full overflow-visible ${className}`} aria-hidden>
      {w > 0 && (
        <g filter="url(#crayon-soft)" fill="none" stroke={color} strokeLinecap="round">
          {shape === 'circle' ? (
            <>
              <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - i} ry={h / 2 - i} strokeWidth={width} />
              <path d={`M${w * 0.18} ${h * 0.2} A${w / 2 - i * 1.6} ${h / 2 - i * 0.8} 0 0 1 ${w * 0.92} ${h * 0.62}`} strokeWidth={width * 0.6} opacity="0.55" />
            </>
          ) : (
            <>
              <rect x={i} y={i} width={w - i * 2} height={h - i * 2} rx={Math.min(radius, h / 2 - i)} strokeWidth={width} />
              <path d={`M${radius} ${i * 1.8} L${w - radius * 1.3} ${i * 0.9}`} strokeWidth={width * 0.55} opacity="0.5" />
            </>
          )}
        </g>
      )}
    </svg>
  );
}
