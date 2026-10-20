import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { bakeSvg } from './Baked';

/**
 * キャラクター（ハイカー・犬）用のクレヨン × パステル × キャンバス地のフィルタ。
 * 単位はリグの座標（1 ≒ 1.2 CSS px）。
 *  1. 輪郭の揺れ：fractalNoise 0.08 / 3 オクターブ → displacement 3
 *  2. 紙の歯：細かいノイズでワックスが乗らない粒を抜く
 *  3. キャンバス地：横糸のような明るいすじをうっすら重ねる
 */
const CHAR_FILTER = `
<filter id="cc" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" seed="4" result="warp"/>
  <feDisplacementMap in="SourceGraphic" in2="warp" scale="3" xChannelSelector="R" yChannelSelector="G" result="rough"/>
  <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="9" result="grain"/>
  <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -6 0 0 0 4.7" result="tooth"/>
  <feComposite in="rough" in2="tooth" operator="in" result="wax"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.09 1.3" numOctaves="1" seed="2" result="weft"/>
  <feColorMatrix in="weft" type="matrix" values="0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.9  1.8 0 0 0 -1.0" result="threads"/>
  <feComposite in="threads" in2="wax" operator="in" result="lit"/>
  <feMerge><feMergeNode in="wax"/><feMergeNode in="lit"/></feMerge>
</filter>`;

/** 目・鼻・口などの小さな印（焦げ茶をミルクで割った色） */
export const INK = '#6B5246';

/** 色を少し暗くする（縁の色） */
export function darker(hex: string, amt = 0.2) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v * (1 - amt)).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/** 塗り + 縁（黒い輪郭線の代わりに、塗りより少し濃いパステル色の途切れた線） */
export const pastel = (fill: string, w = 0.95) => ({ fill, stroke: darker(fill), strokeWidth: w, strokeLinejoin: 'round' as const, strokeDasharray: '5.5 1.3' });

/** 焼く解像度（リグの 1 単位あたりの px）。表示は 1 単位 ≒ 1.2〜1.8 CSS px */
const PX = 3;
const PAD = 3;

/**
 * 関節の中の「動かない絵」をクレヨンのフィルタつきで画像に焼き、<image> に置き換える。
 * 関節（親の <g>）は今までどおり transform だけで動くので、毎フレーム フィルタを計算しない。
 * 焼き上がるまでは同じ絵をフィルタなしで出す。children に関節（ref つきの <g>）を入れないこと。
 */
export function CrayonPart({ bakeKey = '', children }: { bakeKey?: string; children: ReactNode }) {
  const ref = useRef<SVGGElement>(null);
  const [img, setImg] = useState<{ key: string; href: string; x: number; y: number; w: number; h: number } | null>(null);
  const ready = img && img.key === bakeKey;

  useLayoutEffect(() => {
    const el = ref.current;
    if (ready || !el) return;
    let b: DOMRect;
    try {
      b = el.getBBox();
    } catch {
      return;
    }
    if (!b.width || !b.height) return;
    const x = Math.floor(b.x - PAD);
    const y = Math.floor(b.y - PAD);
    const w = Math.ceil(b.width + PAD * 2);
    const h = Math.ceil(b.height + PAD * 2);
    const ser = new XMLSerializer();
    const inner = Array.from(el.childNodes, (n) => ser.serializeToString(n)).join('');
    const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * PX}" height="${h * PX}" viewBox="${x} ${y} ${w} ${h}"><defs>${CHAR_FILTER}</defs><g filter="url(#cc)">${inner}</g></svg>`;
    let cancelled = false;
    void bakeSvg(markup, w * PX, h * PX).then((href) => {
      if (!cancelled && href) setImg({ key: bakeKey, href, x, y, w, h });
    });
    return () => {
      cancelled = true;
    };
  }, [bakeKey, ready]);

  if (ready) return <image href={img.href} x={img.x} y={img.y} width={img.w} height={img.h} preserveAspectRatio="none" />;
  return <g ref={ref}>{children}</g>;
}
