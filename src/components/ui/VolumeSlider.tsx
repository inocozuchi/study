import type { CSSProperties } from 'react';

/**
 * コントロールセンター風の太い音量スライダー。見た目は塗りの幅だけで、
 * 操作は上に重ねた透明な <input type="range">（指を置いた位置にそのまま合う・読み上げにも対応）。
 */
export function VolumeSlider({ value, onChange, color = 'rgb(var(--c-accent))', label, disabled = false }: { value: number; onChange: (v: number) => void; color?: string; label: string; disabled?: boolean }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={`relative h-7 w-full overflow-hidden rounded-full bg-fill ${disabled ? 'opacity-40' : ''}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 rounded-full" style={{ width: `${v * 100}%`, background: color, transition: 'width 80ms linear' } as CSSProperties} />
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={v}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="ios-range absolute inset-0 h-full cursor-pointer opacity-0"
      />
    </div>
  );
}
