import { Check } from 'lucide-react';
import { CampPreview, HikerPreview, TentPreview } from './HikerPreview';
import { TENTS } from './scene/tents';
import type { DesignSetupProps } from '../types';

const LOOKS = ['テラコッタ', 'そらいろ', 'ラベンダー'];

/** プロフィールに差し込む登山のカスタマイズ：ハイカーの服とテント */
export function MountainCustomize({ draft, onChange }: DesignSetupProps) {
  const look = draft.hikerLook ?? 0;
  const tent = draft.tentStyle ?? 0;
  return (
    <>
      <p className="section-label mb-2">ハイカー</p>
      <div className="grid grid-cols-3 gap-2">
        {LOOKS.map((name, i) => (
          <Cell key={name} label={name} active={look === i} onClick={() => onChange({ hikerLook: i })}>
            <HikerPreview look={i} className="mx-auto h-[84px] w-auto" />
          </Cell>
        ))}
      </div>
      <p className="section-label mb-2 mt-5">テント</p>
      <div className="mb-2 overflow-hidden rounded-card">
        <CampPreview tent={tent} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TENTS.map((t, i) => (
          <Cell key={t.name} label={t.name} active={tent === i} onClick={() => onChange({ tentStyle: i })}>
            <div className="flex h-[84px] items-end justify-center pb-2">
              <TentPreview tent={i} width={96} />
            </div>
          </Cell>
        ))}
      </div>
    </>
  );
}

function Cell({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} aria-label={label} className={`relative overflow-hidden rounded-card bg-sunken pt-2 transition-shadow ${active ? 'shadow-[inset_0_0_0_2px_rgb(var(--c-accent))]' : ''}`}>
      {children}
      <span className={`block py-1.5 text-[12px] font-bold ${active ? 'text-accent-ink' : 'text-fg-2'}`}>{label}</span>
      {active && (
        <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-white">
          <Check size={12} strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
}
