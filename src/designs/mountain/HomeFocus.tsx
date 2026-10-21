import type { MouseEvent } from 'react';

/** ホームの「集中」ボタン（登山）：方位磁針。生成りの文字盤にフォレストグリーンの縁、N の針はテラコッタ。まわりのセージの光が静かに呼吸する */
export function MountainFocus({ onClick }: { onClick: (e: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <div className="relative grid h-[80px] w-[80px] place-items-center">
      <span className="mt-compass-glow pointer-events-none absolute -inset-5 rounded-full" aria-hidden />
      <button onClick={onClick} aria-label="集中する" className="mt-compass relative grid h-full w-full place-items-center rounded-full font-maru">
        <svg viewBox="0 0 80 80" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {Array.from({ length: 16 }, (_, i) => (
            <line key={i} x1="40" y1="10" x2="40" y2={i % 4 === 0 ? 15 : 13} stroke="#2C4A3E" strokeOpacity={i % 4 === 0 ? 0.75 : 0.35} strokeWidth={i % 4 === 0 ? 1.5 : 1} transform={`rotate(${i * 22.5} 40 40)`} />
          ))}
          <text x="40" y="22.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#B5603F">N</text>
          {/* 針：北はテラコッタ、南はフォレストグリーン（文字の後ろにうすく） */}
          <g opacity="0.28" transform="rotate(18 40 40)">
            <path d="M40 24 L44 40 L36 40 Z" fill="#B5603F" />
            <path d="M40 56 L44 40 L36 40 Z" fill="#2C4A3E" />
          </g>
        </svg>
        <span className="relative text-[17px] font-bold tracking-[0.12em]">集中</span>
      </button>
    </div>
  );
}
