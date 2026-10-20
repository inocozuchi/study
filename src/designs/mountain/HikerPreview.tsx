import { useLayoutEffect, useRef } from 'react';
import { HIKER_PALETTES, HikerRig, applyHikerPose, type HikerRefs } from './scene/HikerRig';
import { walkPose } from './scene/rigMath';
import { Baked } from './scene/Baked';
import { tentAt } from './scene/tents';

/** 立ち姿のハイカー（プロフィール・服の見本）。動かないので関節に一度だけポーズを書く */
export function HikerPreview({ look, className = '', crop = 'full' }: { look: number; className?: string; crop?: 'full' | 'bust' }) {
  const refs = useRef<HikerRefs>({});
  useLayoutEffect(() => {
    applyHikerPose(refs.current, walkPose(0, 0, 0, 0));
  }, [look]);
  const viewBox = crop === 'bust' ? '-22 -104 44 44' : '-30 -106 60 112';
  return (
    <svg viewBox={viewBox} className={`block overflow-visible ${className}`} aria-hidden>
      <HikerRig refs={refs} palette={HIKER_PALETTES[look] ?? HIKER_PALETTES[0]} />
    </svg>
  );
}

/** テントの見本（クレヨンのフィルタは焼き込んで出す） */
export function TentPreview({ tent, width }: { tent: number; width: number }) {
  const h = Math.round((width * 70) / 140);
  return (
    <Baked width={width} height={h} bakeKey={tent}>
      <svg viewBox="-70 -62 140 70">
        <g filter="url(#crayon)">{tentAt(tent).art}</g>
      </svg>
    </Baked>
  );
}
