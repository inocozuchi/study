import { useState } from 'react';
import { Bell, Database, Minus, Plus, RotateCcw, Smartphone, Sunrise, Trash2 } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Segmented } from '@/components/ui/Segmented';
import { Toggle } from '@/components/ui/Toggle';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { useApp } from '@/store/AppStore';
import type { Settings, SkyOverride } from '@/types';

function Stepper({ value, onChange, min, max, step = 1, unit = '分' }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string }) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-white/[0.07] p-1">
      <button aria-label="減らす" onClick={() => onChange(Math.max(min, value - step))} className="grid h-7 w-7 place-items-center rounded-lg text-white/70 active:bg-white/10">
        <Minus size={14} />
      </button>
      <span className="tabular w-12 text-center text-[14px] font-semibold">
        {value}
        <span className="text-[11px] text-white/50">{unit}</span>
      </span>
      <button aria-label="増やす" onClick={() => onChange(Math.min(max, value + step))} className="grid h-7 w-7 place-items-center rounded-lg text-white/70 active:bg-white/10">
        <Plus size={14} />
      </button>
    </div>
  );
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings, resetToSample, clearAll } = useApp();
  const [confirm, setConfirm] = useState<null | 'sample' | 'clear'>(null);
  const set = <K extends keyof Settings>(k: K) => (v: Settings[K]) => updateSettings({ [k]: v } as Partial<Settings>);

  return (
    <Sheet open={open} onClose={onClose} title="旅の設定">
      <div className="space-y-6 pb-4">
        <section>
          <p className="section-label mb-2 px-1">ポモドーロ</p>
          <ListGroup>
            <ListRow title="集中" right={<Stepper value={settings.pomodoroFocus} onChange={set('pomodoroFocus')} min={5} max={120} step={5} />} />
            <ListRow title="休憩" right={<Stepper value={settings.pomodoroShortBreak} onChange={set('pomodoroShortBreak')} min={1} max={30} />} />
            <ListRow title="長い休憩" right={<Stepper value={settings.pomodoroLongBreak} onChange={set('pomodoroLongBreak')} min={5} max={60} step={5} />} />
            <ListRow title="長い休憩の間隔" right={<Stepper value={settings.longBreakEvery} onChange={set('longBreakEvery')} min={2} max={8} unit="回" />} />
          </ListGroup>
        </section>

        <section>
          <p className="section-label mb-2 px-1">体験</p>
          <ListGroup>
            <ListRow icon={<Bell size={16} />} iconBg="#FF8A4C" title="完了チャイム" subtitle="集中・休憩の終わりにシンギングボウルの音" right={<Toggle checked={settings.chime} onChange={set('chime')} />} />
            <ListRow
              icon={<Smartphone size={16} />}
              iconBg="#5A9FEA"
              title="画面を常時点灯"
              subtitle={'wakeLock' in navigator ? 'タイマー作動中はスリープしません' : 'このブラウザは Wake Lock に未対応です'}
              right={<Toggle checked={settings.wakeLock} onChange={set('wakeLock')} />}
            />
          </ListGroup>
        </section>

        <section>
          <p className="section-label mb-2 flex items-center gap-1.5 px-1"><Sunrise size={13} /> 空の時間</p>
          <Segmented<SkyOverride>
            value={settings.sky}
            onChange={set('sky')}
            options={[
              { value: 'auto', label: '自動' },
              { value: 'dawn', label: '朝' },
              { value: 'day', label: '昼' },
              { value: 'sunset', label: '夕' },
              { value: 'night', label: '夜' },
            ]}
          />
          <p className="mt-2 px-1 text-[12px] text-white/40">自動では現在時刻に合わせて空がうつろいます</p>
        </section>

        <section>
          <p className="section-label mb-2 flex items-center gap-1.5 px-1"><Database size={13} /> データ</p>
          <ListGroup>
            <ListRow icon={<RotateCcw size={16} />} iconBg="#7FD1A8" title="サンプルデータに戻す" onClick={() => setConfirm('sample')} />
            <ListRow icon={<Trash2 size={16} />} iconBg="#FF5A5F" title="すべての記録を消去" subtitle="空の状態から旅を始めます" onClick={() => setConfirm('clear')} />
          </ListGroup>
          {confirm && (
            <div className="glass-thin mt-2 flex items-center justify-between gap-3 rounded-2xl p-3">
              <p className="text-[13px] text-white/70">{confirm === 'sample' ? '現在の記録はサンプルで上書きされます' : '本当にすべて消去しますか？'}</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirm(null)} className="rounded-xl bg-white/10 px-3 py-2 text-[13px] font-semibold">やめる</button>
                <button
                  onClick={async () => {
                    await (confirm === 'sample' ? resetToSample() : clearAll());
                    setConfirm(null);
                    onClose();
                  }}
                  className="rounded-xl bg-[#FF5A5F] px-3 py-2 text-[13px] font-bold"
                >
                  実行
                </button>
              </div>
            </div>
          )}
          <p className="mt-3 px-1 text-[12px] leading-relaxed text-white/35">
            記録はこの端末のブラウザ内にのみ保存されます。ホーム画面に追加するとアプリとして全画面で使えます。
          </p>
        </section>
      </div>
    </Sheet>
  );
}
