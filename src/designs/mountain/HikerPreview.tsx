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

/** テントを選ぶときの見本の景色：草原にテントと焚き火（クレヨンで焼き込む） */
export function CampPreview({ tent }: { tent: number }) {
  return (
    <Baked width={340} height={150} bakeKey={tent} className="block" style={{ width: '100%', height: 'auto' }}>
      <svg viewBox="0 0 340 150">
        <defs>
          <linearGradient id="cp-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8FC3E6" />
            <stop offset="1" stopColor="#DCEFF4" />
          </linearGradient>
        </defs>
        <g filter="url(#crayon)">
          <rect width="340" height="150" fill="url(#cp-sky)" />
          <path d="M0 92 L40 40 L70 70 L110 22 L150 76 L190 44 L230 80 L270 30 L310 66 L340 50 L340 110 L0 110 Z" fill="#7FA6C9" opacity="0.8" />
          <path d="M0 96 L30 70 L60 92 L95 60 L130 94 L170 66 L210 96 L250 72 L290 96 L340 74 L340 120 L0 120 Z" fill="#5E8C78" />
          <path d="M0 104 Q170 90 340 104 L340 150 L0 150 Z" fill="#9CC27A" />
          <path d="M0 116 Q170 104 340 118 L340 150 L0 150 Z" fill="#8AB56A" />
          {/* 焚き火 */}
          <g transform="translate(118 122)">
            <path d="M-12 0 L11 -5 M12 0 L-10 -5.5" stroke="#5B3A26" strokeWidth="3.6" strokeLinecap="round" />
            <path d="M-8 -3 Q-10 -15 -2 -22 Q-2 -28 1 -32 Q4 -24 7 -19 Q11 -12 8 -3 Z" fill="#FF7A2E" />
            <path d="M-5 -3 Q-6 -11 0 -16 Q3 -11 5 -7 Q6 -4 4 -3 Z" fill="#FFC85A" />
            <path d="M-2.4 -3 Q-3 -7 0 -9.5 Q2.4 -6.6 2.4 -3 Z" fill="#FFF2C2" />
          </g>
          <g transform="translate(220 126) scale(1.25)">{tentAt(tent).art}</g>
        </g>
      </svg>
    </Baked>
  );
}
