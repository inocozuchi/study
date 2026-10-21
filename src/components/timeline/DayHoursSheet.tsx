import { Moon, Sunrise } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { Sheet } from '@/components/ui/Sheet';
import { fmtClock } from '@/lib/time';

const WAKE = [5 * 60, 5 * 60 + 30, 6 * 60, 6 * 60 + 30, 7 * 60, 7 * 60 + 30, 8 * 60, 9 * 60];
const SLEEP = [22 * 60, 22 * 60 + 30, 23 * 60, 23 * 60 + 30, 24 * 60, 24 * 60 + 30, 25 * 60, 26 * 60];

/** 0:00〜23:55 の時刻を 5 分刻みで選ぶ（type=time は iPhone で開きにくいので、時と分の 2 つの選択にする） */
function TimeSelect({ value, onChange, from, to, label }: { value: number; onChange: (v: number) => void; from: number; to: number; label: string }) {
  const hours: number[] = [];
  for (let h = Math.floor(from / 60); h <= Math.floor(to / 60); h++) hours.push(h);
  const h = Math.floor(value / 60);
  const m = value % 60;
  const sel = 'field appearance-none py-2.5 text-center text-[17px] font-bold tabular';
  return (
    <div className="flex items-center gap-1.5" aria-label={label}>
      <select className={sel} value={h} onChange={(e) => onChange(Math.min(to, Math.max(from, Number(e.target.value) * 60 + m)))} aria-label={`${label}（時）`}>
        {hours.map((x) => (
          <option key={x} value={x}>
            {x}時{x >= 24 ? '（翌）' : ''}
          </option>
        ))}
      </select>
      <select className={sel} value={m} onChange={(e) => onChange(h * 60 + Number(e.target.value))} aria-label={`${label}（分）`}>
        {Array.from({ length: 12 }, (_, i) => i * 5).map((x) => (
          <option key={x} value={x}>
            {String(x).padStart(2, '0')}分
          </option>
        ))}
      </select>
    </div>
  );
}

/** 起床・就寝の時刻（タイムラインの最初と最後）。タイムラインの「おはよう」「おやすみ」を押しても開く */
export function DayHoursSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useApp();
  const wake = settings.wakeMin;
  const sleep = settings.sleepMin;
  const setWake = (v: number) => updateSettings({ wakeMin: v, sleepMin: Math.max(sleep, v + 60) });
  const setSleep = (v: number) => updateSettings({ sleepMin: v, wakeMin: Math.min(wake, v - 60) });

  const block = (icon: React.ReactNode, title: string, value: number, presets: number[], set: (v: number) => void, from: number, to: number) => (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[14px] font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent-ink">{icon}</span>
          {title}
        </span>
        <span className="tabular text-[22px] font-extrabold">{fmtClock(value)}</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {presets.map((p) => (
          <button key={p} onClick={() => set(p)} className={`tabular rounded-chip py-2 text-[12.5px] font-bold ${p === value ? 'bg-accent text-white' : 'bg-fill text-fg-2'}`}>
            {fmtClock(p)}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <TimeSelect value={value} onChange={set} from={from} to={to} label={title} />
      </div>
    </section>
  );

  return (
    <Sheet open={open} onClose={onClose} title="起床と就寝" subtitle={`1 日の活動時間 ${Math.floor((sleep - wake) / 60)}時間${(sleep - wake) % 60 ? `${(sleep - wake) % 60}分` : ''}`}>
      <div className="space-y-3 pb-6">
        {block(<Sunrise size={17} />, '起床', wake, WAKE, setWake, 3 * 60, 12 * 60)}
        {block(<Moon size={17} />, '就寝', sleep, SLEEP, setSleep, 19 * 60, 28 * 60 - 5)}
        <p className="px-1 text-[12px] leading-relaxed text-fg-2">タイムラインはこの時刻から始まり、この時刻で終わります。24 時を過ぎる時刻は「25:00」（翌 1 時）のように表示します。</p>
      </div>
    </Sheet>
  );
}
