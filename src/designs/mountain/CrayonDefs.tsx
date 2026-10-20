import { useEffect, useRef, useState } from 'react';

/**
 * クレヨン調の SVG フィルタ。
 *  - #crayon       ：静的な絵（山・草原・木・テント・雲）。輪郭を揺らし、紙目にワックスが乗らない粒を抜く
 *  - #crayon-soft  ：UI の線（ボタンの縁取り・下線）用の弱いもの
 * iOS Safari は SVG フィルタを CPU で計算するため、画面に出したまま使うと再描画のたびに重くなる。
 * シーンの絵は scene/Baked.tsx で一度だけキャンバスに焼き込み、ここの文字列を焼き込み用 SVG にも埋め込む。
 */
export const CRAYON_FILTERS = `
<filter id="crayon" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="warp"/>
  <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" result="rough"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="2" seed="3" result="grain"/>
  <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -7 0 0 0 5.35" result="mask"/>
  <feComposite in="rough" in2="mask" operator="in"/>
</filter>
<filter id="crayon-soft" x="-6%" y="-20%" width="112%" height="140%">
  <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="11" result="warp"/>
  <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="rough"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="2" result="grain"/>
  <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -5 0 0 0 3.9" result="mask"/>
  <feComposite in="rough" in2="mask" operator="in"/>
</filter>`;

/** UI の小さな部品（縁取り・見本）用に、フィルタを文書に 1 回だけ置く */
export function CrayonDefs() {
  return (
    <svg width="0" height="0" className="pointer-events-none absolute" aria-hidden>
      <defs dangerouslySetInnerHTML={{ __html: CRAYON_FILTERS }} />
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
