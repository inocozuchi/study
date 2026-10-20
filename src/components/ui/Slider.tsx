import type { ReactNode } from 'react';

/** コントロールセンター風の太い縦長スライダー（横向き） */
export function Slider({
  value,
  onChange,
  icon,
  label,
  color = '#ffffff',
  min = 0,
  max = 1,
  step = 0.01,
}: {
  value: number;
  onChange: (v: number) => void;
  icon?: ReactNode;
  label: string;
  color?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="group relative block h-14 overflow-hidden rounded-2xl bg-white/[0.08]">
      <div
        className="absolute inset-y-0 left-0 transition-[width] duration-75"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}55, ${color}cc)` }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-4">
        <span className="flex items-center gap-2.5 text-[15px] font-semibold">
          <span className="text-white/90">{icon}</span>
          {label}
        </span>
        <span className="tabular text-[13px] font-semibold text-white/60">{Math.round(pct)}%</span>
      </div>
      <input
        type="range"
        className="ios-range absolute inset-0 h-full cursor-pointer opacity-0"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
