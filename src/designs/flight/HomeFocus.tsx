import type { MouseEvent } from 'react';

/** ホームの「集中」ボタン（航空）：フロストガラスの円に、細いアンバーの計器リング（目盛り付きの 270° の弧）が静かに脈打つ */
export function FlightFocus({ onClick }: { onClick: (e: MouseEvent<HTMLButtonElement>) => void }) {
  const r = 34;
  const arc = 2 * Math.PI * r;
  return (
    <div className="relative grid h-[80px] w-[80px] place-items-center">
      <span className="fl-gauge-glow pointer-events-none absolute -inset-5 rounded-full" aria-hidden />
      <button onClick={onClick} aria-label="集中する" className="fl-gauge relative grid h-full w-full place-items-center rounded-full">
        <svg viewBox="0 0 80 80" className="pointer-events-none absolute inset-0 h-full w-full -rotate-[225deg]" aria-hidden>
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" strokeDasharray={`${arc * 0.75} ${arc}`} strokeLinecap="round" />
          <circle className="fl-gauge-ring" cx="40" cy="40" r={r} fill="none" stroke="#FF9F0A" strokeWidth="2.2" strokeDasharray={`${arc * 0.5} ${arc}`} strokeLinecap="round" />
        </svg>
        <span className="relative text-[18px] font-semibold tracking-[0.12em]">集中</span>
      </button>
    </div>
  );
}
