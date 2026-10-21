import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/store/AppStore';
import { Sheet } from '@/components/ui/Sheet';
import { Segmented } from '@/components/ui/Segmented';
import { TRAVEL_MODES, type ProfileInfo } from '@/designs';
import type { TravelMode } from '@/types';

const GOAL_LABEL: Record<TravelMode, string> = { mountain: '目標', train: '行き先（目標）', flight: 'DESTINATION（目標）' };

/** 旅のパス：モードごとのカード（登山者 ID カード・きっぷ・搭乗券）と、ニックネーム・目標・モード固有の設定 */
export function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings, sessions } = useApp();
  const [view, setView] = useState<TravelMode>(settings.timerDesign);
  useEffect(() => {
    if (open) setView(settings.timerDesign);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const info: ProfileInfo = useMemo(() => {
    let total = 0;
    let since: number | null = null;
    for (const s of sessions) {
      total += s.minutes;
      if (since == null || s.start < since) since = s.start;
    }
    return { name: settings.userName || '旅人', goal: settings.goal, departure: settings.departure, totalMinutes: total, sessions: sessions.length, since, settings };
  }, [sessions, settings]);

  // 閉じるアニメーションの間も同じカードを出しておく
  const lastView = useRef(view);
  if (open) lastView.current = view;
  const entry = TRAVEL_MODES.find((m) => m.id === lastView.current) ?? TRAVEL_MODES[0];
  const Card = entry.mode.ProfileCard;
  const Options = entry.mode.ProfileOptions;
  const current = settings.timerDesign === entry.id;

  return (
    <Sheet open={open} onClose={onClose} title="旅のパス" subtitle="ニックネームと目標はすべてのモードで共通です">
      <div className="space-y-5 pb-6">
        <Segmented value={view} onChange={setView} options={TRAVEL_MODES.map((m) => ({ value: m.id, label: (<span className="flex items-center justify-center gap-1.5"><m.Icon size={16} />{m.mode.name}</span>) }))} />

        <div className="px-1">
          <Card info={info} />
        </div>

        {entry.available ? (
          current ? (
            <p className="text-center text-ui-[12px] font-semibold text-fg-2">いまの旅のモード</p>
          ) : (
            <button onClick={() => updateSettings({ timerDesign: entry.id as typeof settings.timerDesign })} className="btn-primary w-full">
              {entry.mode.name}モードで旅する
            </button>
          )
        ) : (
          <p className="rounded-card bg-sunken px-4 py-3 text-center text-ui-[12.5px] font-semibold text-fg-2">
            {entry.mode.name}モードは準備中です（Coming Soon）
          </p>
        )}

        <section className="space-y-3">
          <label className="block">
            <span className="section-label mb-1.5 block px-1">ニックネーム</span>
            <input
              className="field text-ui-[15px] font-semibold"
              value={settings.userName}
              maxLength={16}
              placeholder="旅人"
              onChange={(e) => updateSettings({ userName: e.target.value })}
              onBlur={(e) => !e.target.value.trim() && updateSettings({ userName: '旅人' })}
            />
          </label>
          <label className="block">
            <span className="section-label mb-1.5 block px-1">{GOAL_LABEL[entry.id]}</span>
            <input className="field text-ui-[15px] font-semibold" value={settings.goal} maxLength={14} placeholder="例：合格・TOEIC 800" onChange={(e) => updateSettings({ goal: e.target.value })} />
          </label>
          {entry.id === 'train' && (
            <label className="block">
              <span className="section-label mb-1.5 block px-1">出発駅</span>
              <input className="field text-ui-[15px] font-semibold" value={settings.departure} maxLength={10} placeholder="はじまり" onChange={(e) => updateSettings({ departure: e.target.value })} />
            </label>
          )}
        </section>

        {Options && (
          <section>
            <Options draft={settings} onChange={updateSettings} />
          </section>
        )}
      </div>
    </Sheet>
  );
}
