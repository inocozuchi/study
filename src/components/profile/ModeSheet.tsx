import { Check } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { Sheet } from '@/components/ui/Sheet';
import { TRAVEL_MODES } from '@/designs';
import type { TimerDesignId } from '@/types';

/** 旅のモードの切り替え（登山 / 列車 / 航空＝準備中） */
export function ModeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useApp();
  return (
    <Sheet open={open} onClose={onClose} title="旅のモード" subtitle="タイマーの見た目と演出が変わります。記録は共通です">
      <div className="flex flex-col gap-2 pb-6">
        {TRAVEL_MODES.map((m) => {
          const active = settings.timerDesign === m.id;
          return (
            <button
              key={m.id}
              disabled={!m.available}
              onClick={() => {
                updateSettings({ timerDesign: m.id as TimerDesignId });
                onClose();
              }}
              aria-pressed={active}
              className={`card flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-100 enabled:active:bg-accent-soft disabled:opacity-60 ${active ? 'shadow-[inset_0_0_0_2px_rgb(var(--c-accent))]' : ''}`}
            >
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-card ${active ? 'bg-accent text-white' : 'bg-sunken text-fg-2'}`}><m.Icon size={26} strokeWidth={1.8} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-ui-[15px] font-bold">
                  {m.mode.name}
                  {!m.available && <span className="rounded-full bg-fill px-2 py-0.5 text-ui-[10.5px] font-bold tracking-wide text-fg-2">Coming Soon</span>}
                </span>
                <span className="mt-0.5 block text-ui-[12px] leading-snug text-fg-2">{m.mode.tagline}</span>
              </span>
              {active && (
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-white">
                  <Check size={14} strokeWidth={3.2} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
