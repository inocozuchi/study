import type { SVGProps } from 'react';

/**
 * アプリ独自のピクトグラム（絵文字の代わり）。Lucide と同じ 24 グリッド・線のアイコンで、
 * 文字の色（currentColor）に従う。旅のモードの印などに使う。
 */
export type PictoProps = { size?: number; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, 'width' | 'height'>;

function Base({ size = 24, strokeWidth = 2, children, ...rest }: PictoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      {children}
    </svg>
  );
}

/** 登山：ふたつの峰と雪の稜線、小さな太陽 */
export function MountainPicto(p: PictoProps) {
  return (
    <Base {...p}>
      <path d="M2.5 20 L9 8.5 L13 15 L15.5 11.5 L21.5 20 Z" />
      <path d="M6.6 12.8 L8 11.4 L9.3 12.6 L10.8 11.2" />
      <circle cx="18" cy="5.5" r="1.8" />
    </Base>
  );
}

/** 列車：正面から見た客車（前窓・前照灯）とレール */
export function TrainPicto(p: PictoProps) {
  return (
    <Base {...p}>
      <rect x="5" y="3" width="14" height="14" rx="3.5" />
      <path d="M5 11 H19" />
      <path d="M8.5 7 H15.5" />
      <circle cx="8.6" cy="14" r="0.6" fill="currentColor" />
      <circle cx="15.4" cy="14" r="0.6" fill="currentColor" />
      <path d="M8 17 L6.5 20.5 M16 17 L17.5 20.5 M4.5 20.5 H19.5" />
    </Base>
  );
}

/** 航空：上から見た旅客機 */
export function PlanePicto(p: PictoProps) {
  return (
    <Base {...p}>
      <path d="M12 2.5 C12.9 2.5 13.4 3.6 13.4 4.8 V9.2 L20.5 13.4 V15.2 L13.4 13 V17.6 L15.6 19.3 V20.8 L12 19.8 L8.4 20.8 V19.3 L10.6 17.6 V13 L3.5 15.2 V13.4 L10.6 9.2 V4.8 C10.6 3.6 11.1 2.5 12 2.5 Z" />
    </Base>
  );
}
