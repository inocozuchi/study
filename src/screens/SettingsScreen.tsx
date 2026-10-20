import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell, ChevronLeft, ChevronRight, Clock, Coffee, Database, Eye, Leaf, Mountain, Music, PlusSquare, Repeat, Smartphone, Sun, Timer, Trash2,
  Type, User, Volume2, Waves, Wind,
} from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { Toggle } from '@/components/ui/Toggle';
import { PickerModal, type PickerOption } from '@/components/ui/PickerModal';
import { Sheet } from '@/components/ui/Sheet';
import { Modal } from '@/components/ui/Modal';
import { InstallSheet, isStandalone } from '@/components/home/InstallSheet';
import { useBgmTracks } from '@/audio/bgmLibrary';
import { SEASONS, SEASON_ORDER } from '@/designs/mountain/scene/palette';
import { getDesign } from '@/designs';
import { wakeLockSupported } from '@/hooks/useWakeLock';
import { springSheet } from '@/lib/motion';
import { ambient } from '@/audio/ambient';
import { FONTS, fontById, loadFontPreviews, unloadFontPreviews } from '@/lib/fonts';
import type { AmbientChannel, AmbientMix, FontId, Season, Settings, SkyOverride } from '@/types';

function Row({ icon, color, title, detail, value, onClick, right }: { icon: ReactNode; color: string; title: string; detail?: string; value?: ReactNode; onClick?: () => void; right?: ReactNode }) {
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp whileTap={onClick ? { backgroundColor: 'rgba(255,255,255,0.06)' } : undefined} onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-white" style={{ background: color }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{title}</span>
        {detail && <span className="mt-0.5 block text-[12px] leading-snug text-white/45">{detail}</span>}
      </span>
      {value != null && <span className="shrink-0 text-[14px] text-white/45">{value}</span>}
      {right}
      {onClick && !right && <ChevronRight size={17} className="shrink-0 text-white/25" />}
    </Comp>
  );
}

function Group({ title, children, footer }: { title: string; children: ReactNode; footer?: string }) {
  return (
    <section className="mt-6">
      <p className="section-label mb-1.5 px-4">{title}</p>
      <div className="glass-thin divide-y divide-white/[0.06] overflow-hidden rounded-2xl">{children}</div>
      {footer && <p className="mt-1.5 px-4 text-[12px] leading-relaxed text-white/35">{footer}</p>}
    </section>
  );
}

const SKY_LABEL: Record<SkyOverride, string> = { auto: '旅の時間', clock: '今の時刻', dawn: '朝', day: '昼', sunset: '夕', night: '夜' };

const FONT_SAMPLE = Array.from(new Set(FONTS.map((f) => `${f.label}${f.detail}　集中 25:00`).join(''))).join('');

type PickerKey = 'focus' | 'short' | 'long' | 'every' | 'bgm' | 'ambient' | 'sky' | 'season' | 'font';

const AMBIENT_PRESETS: { key: string; label: string; mix: AmbientMix; icon: string }[] = [
  { key: 'none', label: 'なし', icon: '🔇', mix: { rain: 0, fire: 0, wind: 0, river: 0, insects: 0 } },
  { key: 'wind', label: '森', icon: '🌲', mix: { rain: 0, fire: 0, wind: 0.6, river: 0, insects: 0 } },
  { key: 'river', label: '川', icon: '🏞', mix: { rain: 0, fire: 0, wind: 0.2, river: 0.65, insects: 0 } },
  { key: 'rain', label: '雨', icon: '🌧', mix: { rain: 0.7, fire: 0, wind: 0.1, river: 0, insects: 0 } },
  { key: 'insects', label: '虫の音', icon: '🦗', mix: { rain: 0, fire: 0, wind: 0.15, river: 0, insects: 0.6 } },
  { key: 'fire', label: '焚き火', icon: '🔥', mix: { rain: 0, fire: 0.7, wind: 0.15, river: 0, insects: 0.2 } },
];

function ambientKey(mix: AmbientMix) {
  const top = (Object.keys(mix) as AmbientChannel[]).sort((a, b) => mix[b] - mix[a])[0];
  return mix[top] > 0.01 ? top : 'none';
}

/** iOS 設定アプリ風。ホームの歯車から右へスライドして開く */
export function SettingsScreen({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings, clearAll } = useApp();
  const tracks = useBgmTracks();
  const currentTrack = tracks.find((t) => t.id === settings.bgmTrackId) ?? tracks[0];
  const [picker, setPicker] = useState<PickerKey | null>(null);
  const [nameOpen, setNameOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof Settings>(k: K) => (v: Settings[K]) => updateSettings({ [k]: v } as Partial<Settings>);

  const minutes = (list: number[]): PickerOption<number>[] => list.map((m) => ({ value: m, label: `${m}分` }));
  const pickers: Record<PickerKey, { title: string; value: string | number; options: PickerOption<string | number>[]; onSelect: (v: string | number) => void }> = {
    focus: { title: '集中時間', value: settings.pomodoroFocus, options: minutes([15, 20, 25, 30, 40, 45, 50, 60, 90]), onSelect: (v) => updateSettings({ pomodoroFocus: Number(v) }) },
    short: { title: '休憩時間', value: settings.pomodoroShortBreak, options: minutes([3, 5, 7, 10, 15]), onSelect: (v) => updateSettings({ pomodoroShortBreak: Number(v) }) },
    long: { title: '長い休憩', value: settings.pomodoroLongBreak, options: minutes([10, 15, 20, 25, 30]), onSelect: (v) => updateSettings({ pomodoroLongBreak: Number(v) }) },
    every: { title: '長い休憩の間隔', value: settings.longBreakEvery, options: [2, 3, 4, 5, 6].map((n) => ({ value: n, label: `${n}回の登りごと` })), onSelect: (v) => updateSettings({ longBreakEvery: Number(v) }) },
    bgm: { title: 'BGM', value: currentTrack?.id ?? '', options: tracks.map((t) => ({ value: t.id, label: t.title, detail: t.subtitle, icon: '🎵' })), onSelect: (v) => updateSettings({ bgmTrackId: String(v) }) },
    ambient: {
      title: '環境音',
      value: ambientKey(settings.ambient),
      options: AMBIENT_PRESETS.map((p) => ({ value: p.key, label: p.label, icon: p.icon })),
      onSelect: (v) => {
        const p = AMBIENT_PRESETS.find((x) => x.key === v)!;
        // iOS はタップの中で音を有効にしないと鳴らない
        ambient.unlock();
        updateSettings({ ambient: p.mix, ambientPlaying: p.key !== 'none' });
      },
    },
    sky: {
      title: '空の時間',
      value: settings.sky,
      options: [
        { value: 'auto', label: '旅の時間', detail: '集中を始めると朝。進むほど昼・夕方になり、休憩は夜', icon: '🧭' },
        { value: 'clock', label: '今の時刻', detail: '現在時刻に合わせてうつろう', icon: '🕰' },
        { value: 'dawn', label: '朝', icon: '🌅' },
        { value: 'day', label: '昼', icon: '☀️' },
        { value: 'sunset', label: '夕', icon: '🌇' },
        { value: 'night', label: '夜', icon: '🌙' },
      ],
      onSelect: (v) => updateSettings({ sky: v as SkyOverride }),
    },
    font: {
      title: 'フォント',
      value: settings.font,
      options: FONTS.map((f) => ({
        value: f.id,
        label: <span style={{ fontFamily: f.text }}>{f.label}　集中 25:00</span>,
        detail: <span style={{ fontFamily: f.text }}>{f.detail}</span>,
      })),
      onSelect: (v) => updateSettings({ font: v as FontId }),
    },
    season: { title: 'シーズン', value: settings.season, options: SEASON_ORDER.map((s) => ({ value: s, label: SEASONS[s].label, icon: SEASONS[s].emoji })), onSelect: (v) => updateSettings({ season: v as Season }) },
  };
  // 閉じるアニメーションの間も中身を表示しておく
  const lastPicker = useRef<PickerKey | null>(null);
  if (picker) lastPicker.current = picker;
  const p = lastPicker.current ? pickers[lastPicker.current] : null;
  // フォントの見本は選択画面を開いている間だけ、見本の文字に絞って読み込む
  useEffect(() => {
    if (picker !== 'font') return;
    loadFontPreviews(FONT_SAMPLE);
    return () => unloadFontPreviews();
  }, [picker]);
  const skyLabel = SKY_LABEL[settings.sky];

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
            className="fixed inset-x-0 top-0 h-app z-40 overflow-y-auto bg-night-950 text-white" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={springSheet}>
            {/* ステータスバーの下：スクロールしたときだけぼかす */}
            <div
              className="pointer-events-none sticky top-0 z-10 -mb-[env(safe-area-inset-top)] h-[env(safe-area-inset-top)] border-b border-white/[0.06] bg-night-950/60 backdrop-blur-xl transition-opacity duration-200"
              style={{ opacity: scrolled ? 1 : 0 }}
            />
            <div className="mx-auto max-w-xl px-4 pb-16 pt-safe">
              <button onClick={onClose} className="-ml-1 mt-1 flex items-center gap-0.5 py-2 text-[16px] font-medium text-summit">
                <ChevronLeft size={22} /> ホーム
              </button>
              <h1 className="px-1 text-[32px] font-bold tracking-tight">設定</h1>

              <Group title="プロフィール">
                <Row
                  icon={<User size={16} />}
                  color="#E68FA8"
                  title="名前"
                  value={settings.userName}
                  onClick={() => {
                    setName(settings.userName);
                    setNameOpen(true);
                  }}
                />
              </Group>

              <Group title="時間設定" footer="ポモドーロの標準値です。出発前の支度でいつでも変えられます。">
                <Row icon={<Timer size={16} />} color="#D9573B" title="集中時間" value={`${settings.pomodoroFocus}分`} onClick={() => setPicker('focus')} />
                <Row icon={<Coffee size={16} />} color="#C98500" title="休憩時間" value={`${settings.pomodoroShortBreak}分`} onClick={() => setPicker('short')} />
                <Row icon={<Clock size={16} />} color="#9085e9" title="長い休憩" value={`${settings.pomodoroLongBreak}分`} onClick={() => setPicker('long')} />
                <Row icon={<Repeat size={16} />} color="#3987e5" title="長い休憩の間隔" value={`${settings.longBreakEvery}回ごと`} onClick={() => setPicker('every')} />
                <Row icon={<Waves size={16} />} color="#199e70" title="休憩のあと自動で出発" right={<Toggle checked={settings.autoContinue} onChange={set('autoContinue')} color="#34C759" label="自動で出発" />} />
                <Row icon={<Wind size={16} />} color="#5EA8B8" title="集中前の深呼吸" right={<Toggle checked={settings.breathing} onChange={set('breathing')} color="#34C759" label="深呼吸" />} />
              </Group>

              <Group title="音楽設定" footer="BGM は public/bgm に置いた曲が流れます（曲の終わりで途切れず繰り返します）。環境音はブラウザ内で合成しています。">
                <Row icon={<Music size={16} />} color="#3E86C9" title="集中を始めたら音楽を流す" right={<Toggle checked={settings.bgmOnFocus} onChange={set('bgmOnFocus')} color="#34C759" label="音楽を流す" />} />
                <Row icon={<span className="text-[15px]">📼</span>} color="#4A3A34" title="BGM" value={currentTrack?.title ?? 'まだありません'} onClick={tracks.length ? () => setPicker('bgm') : undefined} />
                <Row
                  icon={<Volume2 size={16} />}
                  color="#6E5D52"
                  title="音量"
                  right={<input type="range" min={0} max={1} step={0.01} value={settings.bgmVolume} onChange={(e) => updateSettings({ bgmVolume: Number(e.target.value) })} className="w-32 accent-white" aria-label="音量" />}
                />
                <Row icon={<Leaf size={16} />} color="#34C759" title="環境音" value={AMBIENT_PRESETS.find((x) => x.key === ambientKey(settings.ambient))?.label} onClick={() => setPicker('ambient')} />
                <Row icon={<Bell size={16} />} color="#F2B33D" title="完了チャイム" right={<Toggle checked={settings.chime} onChange={set('chime')} color="#34C759" label="完了チャイム" />} />
              </Group>

              <Group title="表示">
                <Row icon={<Type size={16} />} color="#6E7BF2" title="フォント" value={fontById(settings.font).label} onClick={() => setPicker('font')} />
              </Group>

              <Group title="システム設定">
                <Row icon={<PlusSquare size={16} />} color="#5A9FEA" title="ホーム画面に追加" value={isStandalone() ? '追加済み' : undefined} onClick={() => setInstallOpen(true)} />
                <Row
                  icon={<Smartphone size={16} />}
                  color="#3987e5"
                  title="画面を常時点灯"
                  detail={wakeLockSupported ? '集中中は画面がスリープしません' : 'このブラウザは未対応です'}
                  right={<Toggle checked={settings.wakeLock} onChange={set('wakeLock')} color="#34C759" label="常時点灯" />}
                />
                <Row icon={<Eye size={16} />} color="#9085e9" title="よそ見検知（ディープ集中）" detail="別のアプリへ移ると旅人が立ち止まります" right={<Toggle checked={settings.deepFocus} onChange={set('deepFocus')} color="#34C759" label="よそ見検知" />} />
                <Row icon={<Sun size={16} />} color="#E8743A" title="空の時間" value={skyLabel} onClick={() => setPicker('sky')} />
              </Group>

              <Group title="タイマーのデザイン" footer="デザインは今後追加予定です。">
                <Row icon={<Mountain size={16} />} color="#5A9FEA" title="デザイン" value={getDesign(settings.timerDesign).name} />
                <Row icon={<span className="text-[15px]">{SEASONS[settings.season].emoji}</span>} color="#7FB04A" title="登山：シーズン" value={SEASONS[settings.season].label} onClick={() => setPicker('season')} />
              </Group>

              <Group title="データ" footer="記録はこの端末のブラウザ内に保存されます。ホーム画面に追加するとアプリとして全画面で使えます。">
                <Row icon={<Trash2 size={16} />} color="#D9573B" title="すべての記録を消去" onClick={() => setConfirm(true)} />
                <Row icon={<Database size={16} />} color="#6E5D52" title="Focus Trail" value="v2.0" />
              </Group>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {p && <PickerModal open={!!picker} onClose={() => setPicker(null)} title={p.title} value={p.value} options={p.options} onSelect={p.onSelect} />}

      <InstallSheet open={installOpen} onClose={() => setInstallOpen(false)} />

      <Sheet open={nameOpen} onClose={() => setNameOpen(false)} title="名前" subtitle="ホームの挨拶で呼ぶ名前です">
        <form
          className="space-y-3 pb-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) updateSettings({ userName: name.trim() });
            setNameOpen(false);
          }}
        >
          <input className="field text-[18px] font-semibold" value={name} onChange={(e) => setName(e.target.value)} maxLength={16} autoFocus placeholder="旅人" />
          <button type="submit" className="w-full rounded-2xl bg-white py-3.5 text-[16px] font-bold text-night-950">保存</button>
        </form>
      </Sheet>

      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <div className="p-6 text-center">
          <p className="text-[19px] font-bold">すべての記録を消去しますか？</p>
          <p className="mt-2 text-[13px] text-white/55">科目・記録・予定・ノート・ToDo・習慣がすべて消えます。この操作は取り消せません。</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => setConfirm(false)} className="rounded-2xl bg-white/10 py-3 font-semibold">やめる</button>
            <button
              onClick={async () => {
                await clearAll();
                setConfirm(false);
                onClose();
              }}
              className="rounded-2xl bg-[#FF5A5F] py-3 font-bold text-white"
            >
              消去
            </button>
          </div>
        </div>
      </Modal>
    </>,
    document.body,
  );
}
