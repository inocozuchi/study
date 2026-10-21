import type { MouseEvent } from 'react';

/** ホームの「集中」ボタン（列車）：真鍮の二重リングと竜頭の懐中時計。12 の目盛りと生成りの明朝。まわりの淡い真鍮の光が静かに呼吸する */
export function TrainFocus({ onClick }: { onClick: (e: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <div className="relative grid h-[80px] w-[80px] place-items-center">
      <span className="tr-watch-glow pointer-events-none absolute -inset-5 rounded-full" aria-hidden />
      <span className="tr-watch-crown pointer-events-none absolute -top-[7px] left-1/2 h-[9px] w-[12px] -translate-x-1/2 rounded-t-[3px]" aria-hidden />
      <button onClick={onClick} aria-label="集中する" className="tr-watch tr-mincho relative grid h-full w-full place-items-center rounded-full">
        <svg viewBox="0 0 80 80" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="40" y1="11" x2="40" y2={i % 3 === 0 ? 16 : 14} stroke="#D4AF73" strokeOpacity={i % 3 === 0 ? 0.9 : 0.55} strokeWidth={i % 3 === 0 ? 1.6 : 1} transform={`rotate(${i * 30} 40 40)`} />
          ))}
        </svg>
        <span className="relative text-[19px] font-bold tracking-[0.18em]">集中</span>
      </button>
    </div>
  );
}
