import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bell, CalendarDays, ChevronRight, Clock, Coffee, Database, Leaf, Mountain, Music, PlusSquare, Repeat, Smartphone, Sun, Timer, Trash2,
  Bug, CloudRain, Compass, Disc3, Flame, Flower2, Snowflake, Sprout, Sunrise, Sunset, TrainFrontTunnel, Trees, VolumeX,
  AudioLines, Contrast, IdCard, Moon, Ruler, TrainFront, Type, User, Volume2, Waves, Wind,
  ALargeSmall, Download, Goal, Languages, TextQuote, Upload,
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
import { ambient } from '@/audio/ambient';
import { FONTS, fontById, loadFontPreviews, unloadFontPreviews } from '@/lib/fonts';
import { GoogleCalendarSheet, googleStatusLabel } from '@/components/settings/GoogleCalendarSheet';
import { isConnected, useGoogleCalendar } from '@/lib/googleCalendar';
import { ModeSheet } from '@/components/profile/ModeSheet';
import { DayHoursSheet } from '@/components/timeline/DayHoursSheet';
import { fmtClock } from '@/lib/time';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { setLayoutProbe, useLayoutProbe } from '@/components/debug/LayoutProbe';
import type { AmbientChannel, AmbientMix, Appearance, FontId, Language, LineSpacing, Season, Settings, SkyOverride, TrainClass } from '@/types';
import { TEXT_SCALES } from '@/lib/display';
import { fmtDuration } from '@/lib/time';

/**
 * 設定の 1 項目＝1 枚の浮いたカード（泰山木POS の設定と同じ）。
 *  - 開く項目：青いアイコン + 題名 + いまの値（下の行）+ 「>」
 *  - スイッチの項目：へこんだ面のアイコン + 題名 + 説明 + スイッチ
 */
function Row({ icon, title, detail, value, onClick, right, danger = false }: { icon: ReactNode; title: string; detail?: string; value?: ReactNode; onClick?: () => void; right?: ReactNode; danger?: boolean }) {
  // ふつうの要素 + CSS の押し込み（項目が多いので、1 つずつアニメーションの部品にしない）
  const Comp = onClick ? 'button' : 'div';
  const sub = value ?? detail;
  return (
    <Comp
      onClick={onClick}
      className={`card flex min-h-[60px] w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-100 ${onClick ? 'active:bg-accent-soft' : ''}`}
    >
      {right ? (
        <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-chip bg-sunken text-fg-2">{icon}</span>
      ) : (
        <span className={`grid w-[22px] shrink-0 place-items-center ${danger ? 'text-danger' : 'text-accent'}`}>{icon}</span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block text-ui-[14px] font-bold ${danger ? 'text-danger-ink' : ''}`}>{title}</span>
        {sub != null && sub !== '' && <span className="mt-[3px] block text-ui-[12px] leading-snug text-fg-2">{sub}</span>}
      </span>
      {right}
      {onClick && !right && <ChevronRight size={18} className="shrink-0 text-fg-2" />}
    </Comp>
  );
}

function Group({ title, children, footer }: { title: string; children: ReactNode; footer?: string }) {
  return (
    <section className="mt-6">
      <p className="section-label mb-2 px-1">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
      {footer && <p className="mt-2 px-1 text-ui-[12px] leading-relaxed text-fg-2">{footer}</p>}
    </section>
  );
}

const APPEARANCE_LABEL: Record<Appearance, string> = { system: '端末に合わせる', light: 'ライト', dark: 'ダーク' };

const SKY_LABEL: Record<SkyOverride, string> = { auto: '旅の時間', clock: '今の時刻', dawn: '朝', day: '昼', sunset: '夕', night: '夜' };

const FONT_SAMPLE = Array.from(new Set(FONTS.map((f) => `${f.label}${f.detail}　集中 25:00`).join(''))).join('');

const TRAIN_CLASS_LABEL: Record<TrainClass, string> = { local: '普通', rapid: '快速', kyuko: '急行', express: '特急' };

type PickerKey = 'focus' | 'short' | 'long' | 'every' | 'bgm' | 'ambient' | 'sky' | 'season' | 'font' | 'appearance' | 'trainClass' | 'language' | 'textScale' | 'lineSpacing' | 'dailyGoal';

const BACKUP_MSG_KEY = 'focus-trail:backup-msg';
const LANGUAGE_LABEL: Record<Language, string> = { ja: '日本語', en: 'English' };
const SPACING_LABEL: Record<LineSpacing, string> = { tight: '狭い', normal: 'ふつう', relaxed: '広い' };
const scaleLabel = (v: number) => (v === 1 ? '標準' : `${Math.round(v * 100)}%`);

const AMBIENT_PRESETS: { key: string; label: string; mix: AmbientMix; icon: ReactNode }[] = [
  { key: 'none', label: 'なし', icon: <VolumeX size={18} />, mix: { rain: 0, fire: 0, wind: 0, river: 0, insects: 0 } },
  { key: 'wind', label: '森', icon: <Trees size={18} />, mix: { rain: 0, fire: 0, wind: 0.6, river: 0, insects: 0 } },
  { key: 'river', label: '川', icon: <Waves size={18} />, mix: { rain: 0, fire: 0, wind: 0.2, river: 0.65, insects: 0 } },
  { key: 'rain', label: '雨', icon: <CloudRain size={18} />, mix: { rain: 0.7, fire: 0, wind: 0.1, river: 0, insects: 0 } },
  { key: 'insects', label: '虫の音', icon: <Bug size={18} />, mix: { rain: 0, fire: 0, wind: 0.15, river: 0, insects: 0.6 } },
  { key: 'fire', label: '焚き火', icon: <Flame size={18} />, mix: { rain: 0, fire: 0.7, wind: 0.15, river: 0, insects: 0.2 } },
];

function ambientKey(mix: AmbientMix) {
  const top = (Object.keys(mix) as AmbientChannel[]).sort((a, b) => mix[b] - mix[a])[0];
  return mix[top] > 0.01 ? top : 'none';
}

const SEASON_ICONS: Record<Season, typeof Sun> = { spring: Sprout, summer: Sun, autumn: Leaf, winter: Snowflake, sakura: Flower2 };
function SeasonIcon({ season, size = 18 }: { season: Season; size?: number }) {
  const I = SEASON_ICONS[season] ?? Leaf;
  return <I size={size} />;
}

/** 設定（タブバーのいちばん右のタブ）。iOS の設定アプリ風に 1 項目＝1 枚のカード */
export function SettingsScreen() {
  const { settings, updateSettings, clearAll, exportBackup, importBackup } = useApp();
  const [backupMsg, setBackupMsg] = useState<string | null>(() => {
    try {
      const m = sessionStorage.getItem(BACKUP_MSG_KEY);
      sessionStorage.removeItem(BACKUP_MSG_KEY);
      return m;
    } catch {
      return null;
    }
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const tracks = useBgmTracks();
  const currentTrack = tracks.find((t) => t.id === settings.bgmTrackId) ?? tracks[0];
  const [picker, setPicker] = useState<PickerKey | null>(null);
  const [nameOpen, setNameOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const google = useGoogleCalendar();
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof Settings>(k: K) => (v: Settings[K]) => updateSettings({ [k]: v } as Partial<Settings>);

  const minutes = (list: number[]): PickerOption<number>[] => list.map((m) => ({ value: m, label: `${m}分` }));
  const pickers: Record<PickerKey, { title: string; value: string | number; options: PickerOption<string | number>[]; onSelect: (v: string | number) => void }> = {
    focus: { title: '集中時間', value: settings.pomodoroFocus, options: minutes([15, 20, 25, 30, 40, 45, 50, 60, 90]), onSelect: (v) => updateSettings({ pomodoroFocus: Number(v) }) },
    short: { title: '休憩時間', value: settings.pomodoroShortBreak, options: minutes([3, 5, 7, 10, 15]), onSelect: (v) => updateSettings({ pomodoroShortBreak: Number(v) }) },
    long: { title: '長い休憩', value: settings.pomodoroLongBreak, options: minutes([10, 15, 20, 25, 30]), onSelect: (v) => updateSettings({ pomodoroLongBreak: Number(v) }) },
    every: { title: '長い休憩の間隔', value: settings.longBreakEvery, options: [2, 3, 4, 5, 6].map((n) => ({ value: n, label: `${n}回の登りごと` })), onSelect: (v) => updateSettings({ longBreakEvery: Number(v) }) },
    bgm: { title: 'BGM', value: currentTrack?.id ?? '', options: tracks.map((t) => ({ value: t.id, label: t.title, detail: t.subtitle, icon: <Music size={18} /> })), onSelect: (v) => updateSettings({ bgmTrackId: String(v) }) },
    ambient: {
      title: '環境音',
      value: ambientKey(settings.ambient),
      options: AMBIENT_PRESETS.map((p) => ({ value: p.key, label: p.label, icon: p.icon })),
      onSelect: (v) => {
        const p = AMBIENT_PRESETS.find((x) => x.key === v)!;
        // iOS はタップの中で音を有効にしないと鳴らない
        ambient.unlock();
        updateSettings({ ambient: p.mix, ambientPlaying: p.key !== 'none' || Object.values(settings.ambientFiles).some((v) => v > 0.01) });
      },
    },
    sky: {
      title: '空の時間',
      value: settings.sky,
      options: [
        { value: 'auto', label: '旅の時間', detail: '集中を始めると朝。進むほど昼・夕方になり、休憩は夜', icon: <Compass size={18} /> },
        { value: 'clock', label: '今の時刻', detail: '現在時刻に合わせてうつろう', icon: <Clock size={18} /> },
        { value: 'dawn', label: '朝', icon: <Sunrise size={18} /> },
        { value: 'day', label: '昼', icon: <Sun size={18} /> },
        { value: 'sunset', label: '夕', icon: <Sunset size={18} /> },
        { value: 'night', label: '夜', icon: <Moon size={18} /> },
      ],
      onSelect: (v) => updateSettings({ sky: v as SkyOverride }),
    },
    appearance: {
      title: '外観',
      value: settings.appearance,
      options: [
        { value: 'system', label: '端末に合わせる', detail: 'iPhone のライト／ダークに合わせて切り替わる', icon: <Smartphone size={18} /> },
        { value: 'light', label: 'ライト', icon: <Sun size={18} /> },
        { value: 'dark', label: 'ダーク', icon: <Moon size={18} /> },
      ],
      onSelect: (v) => updateSettings({ appearance: v as Appearance }),
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
    trainClass: {
      title: '列車の種別',
      value: settings.trainClass,
      options: [
        { value: 'local', label: '普通', detail: '各駅にのんびり', icon: <TrainFront size={18} /> },
        { value: 'rapid', label: '快速', detail: '景色が約 1.2 倍速', icon: <TrainFront size={18} /> },
        { value: 'kyuko', label: '急行', detail: '景色が約 1.4 倍速', icon: <TrainFrontTunnel size={18} /> },
        { value: 'express', label: '特急', detail: '景色が約 1.6 倍速', icon: <TrainFrontTunnel size={18} /> },
      ],
      onSelect: (v) => updateSettings({ trainClass: v as TrainClass }),
    },
    language: {
      title: '言語',
      value: settings.language,
      options: [
        { value: 'ja', label: '日本語', icon: <Languages size={18} /> },
        { value: 'en', label: 'English', icon: <Languages size={18} /> },
      ],
      onSelect: (v) => updateSettings({ language: v as Language }),
    },
    textScale: {
      title: '文字の大きさ',
      value: settings.textScale,
      options: TEXT_SCALES.map((v) => ({ value: v, label: <span style={{ fontSize: `${15 * v}px` }}>{scaleLabel(v)}　あア Aa 25:00</span> })),
      onSelect: (v) => updateSettings({ textScale: Number(v) }),
    },
    lineSpacing: {
      title: '行間',
      value: settings.lineSpacing,
      options: (['tight', 'normal', 'relaxed'] as LineSpacing[]).map((v) => ({ value: v, label: SPACING_LABEL[v] })),
      onSelect: (v) => updateSettings({ lineSpacing: v as LineSpacing }),
    },
    dailyGoal: {
      title: '1 日の目標',
      value: settings.dailyGoalMin,
      options: [0, 30, 60, 90, 120, 180, 240, 300, 360, 480].map((m) => ({ value: m, label: m === 0 ? '決めない' : fmtDuration(m) })),
      onSelect: (v) => updateSettings({ dailyGoalMin: Number(v) }),
    },
    season: { title: 'シーズン', value: settings.season, options: SEASON_ORDER.map((s) => ({ value: s, label: SEASONS[s].label, icon: <SeasonIcon season={s} /> })), onSelect: (v) => updateSettings({ season: v as Season }) },
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
  const probe = useLayoutProbe();
  return (
    <>
            <div className="mx-auto max-w-xl px-5 pb-nav pt-safe">
              <header className="pt-2">
                <h1 className="text-ui-[29px] font-bold leading-tight tracking-tight">設定</h1>
              </header>

              <Group title="プロフィール">
                <Row
                  icon={<User size={16} />}
                 
                  title="名前"
                  value={settings.userName}
                  onClick={() => {
                    setName(settings.userName);
                    setNameOpen(true);
                  }}
                />
              </Group>

              <Group title="時間設定" footer="ポモドーロの標準値です。出発前の支度でいつでも変えられます。">
                <Row icon={<Timer size={21} />} title="集中時間" value={`${settings.pomodoroFocus}分`} onClick={() => setPicker('focus')} />
                <Row icon={<Coffee size={21} />} title="休憩時間" value={`${settings.pomodoroShortBreak}分`} onClick={() => setPicker('short')} />
                <Row icon={<Clock size={21} />} title="長い休憩" value={`${settings.pomodoroLongBreak}分`} onClick={() => setPicker('long')} />
                <Row icon={<Repeat size={21} />} title="長い休憩の間隔" value={`${settings.longBreakEvery}回ごと`} onClick={() => setPicker('every')} />
                <Row icon={<Goal size={21} />} title="1 日の目標" value={settings.dailyGoalMin ? `${fmtDuration(settings.dailyGoalMin)}（ホームの「今日」に進み具合の輪）` : '決めない'} onClick={() => setPicker('dailyGoal')} />
                <Row icon={<Sunrise size={21} />} title="起床と就寝" value={`${fmtClock(settings.wakeMin)} 起床 · ${fmtClock(settings.sleepMin)} 就寝（タイムラインの始まりと終わり）`} onClick={() => setHoursOpen(true)} />
                <Row icon={<Waves size={19} />} title="休憩のあと自動で出発" right={<Toggle checked={settings.autoContinue} onChange={set('autoContinue')} label="自動で出発" />} />
                <Row icon={<Wind size={19} />} title="集中前の深呼吸" right={<Toggle checked={settings.breathing} onChange={set('breathing')} label="深呼吸" />} />
              </Group>

              <Group title="音楽設定" footer="BGM は public/bgm、環境音は public/ambient に置いた音が流れ、途切れずに繰り返します。音ごとの音量はホームの音符ボタン → ミキサーで変えられます。">
                <Row icon={<Music size={19} />} title="集中を始めたら音楽を流す" right={<Toggle checked={settings.bgmOnFocus} onChange={set('bgmOnFocus')} label="音楽を流す" />} />
                <Row icon={<Disc3 size={21} />} title="BGM" value={currentTrack?.title ?? 'まだありません'} onClick={tracks.length ? () => setPicker('bgm') : undefined} />
                <Row
                  icon={<Volume2 size={16} />}
                 
                  title="音量"
                  right={<input type="range" min={0} max={1} step={0.01} value={settings.bgmVolume} onChange={(e) => updateSettings({ bgmVolume: Number(e.target.value) })} className="w-28 accent-[rgb(var(--c-accent))]" aria-label="音量" />}
                />
                <Row icon={<Leaf size={21} />} title="環境音" value={AMBIENT_PRESETS.find((x) => x.key === ambientKey(settings.ambient))?.label} onClick={() => setPicker('ambient')} />
                <Row icon={<Bell size={19} />} title="完了チャイム" right={<Toggle checked={settings.chime} onChange={set('chime')} label="完了チャイム" />} />
              </Group>

              <Group title="表示" footer="文字の大きさ・行間はタイムライン・ルート・インサイト・設定とシートに効きます（旅のモードの絵は変わりません）。">
                <Row icon={<Contrast size={21} />} title="外観" value={APPEARANCE_LABEL[settings.appearance]} onClick={() => setPicker('appearance')} />
                <Row icon={<Type size={21} />} title="フォント" value={fontById(settings.font).label} onClick={() => setPicker('font')} />
                <Row icon={<ALargeSmall size={21} />} title="文字の大きさ" value={scaleLabel(settings.textScale)} onClick={() => setPicker('textScale')} />
                <Row icon={<TextQuote size={21} />} title="行間" value={SPACING_LABEL[settings.lineSpacing] ?? 'ふつう'} onClick={() => setPicker('lineSpacing')} />
                <Row icon={<Languages size={21} />} title="言語 / Language" value={LANGUAGE_LABEL[settings.language] ?? '日本語'} onClick={() => setPicker('language')} />
              </Group>

              <Group title="システム設定">
                <Row icon={<PlusSquare size={21} />} title="ホーム画面に追加" value={isStandalone() ? '追加済み' : undefined} onClick={() => setInstallOpen(true)} />
                <Row
                  icon={<Smartphone size={16} />}
                 
                  title="画面を常時点灯"
                  detail={wakeLockSupported ? '集中中は画面がスリープしません' : 'このブラウザは未対応です'}
                  right={<Toggle checked={settings.wakeLock} onChange={set('wakeLock')} label="常時点灯" />}
                />
                <Row icon={<Sun size={21} />} title="空の時間" value={skyLabel} onClick={() => setPicker('sky')} />
              </Group>

              <Group title="旅のモード" footer="列車の走行音は public/sounds/train.mp3 を置くと鳴ります。">
                <Row icon={<Mountain size={21} />} title="モード" value={getDesign(settings.timerDesign).name} onClick={() => setModeOpen(true)} />
                <Row icon={<IdCard size={21} />} title="旅のパス" value={`${settings.userName} · ${settings.goal.trim() || '目標を決める'}`} onClick={() => setProfileOpen(true)} />
                <Row icon={<SeasonIcon season={settings.season} size={21} />} title="登山：シーズン" value={SEASONS[settings.season].label} onClick={() => setPicker('season')} />
                <Row icon={<TrainFront size={21} />} title="列車：種別" value={TRAIN_CLASS_LABEL[settings.trainClass] ?? '普通'} onClick={() => setPicker('trainClass')} />
                <Row icon={<CloudRain size={19} />} title="列車：雨の景色" right={<Toggle checked={settings.trainWeather === 'rain'} onChange={(v) => updateSettings({ trainWeather: v ? 'rain' : 'clear' })} label="雨の景色" />} />
                <Row icon={<Volume2 size={19} />} title="列車：走行音" right={<Toggle checked={settings.trainSound} onChange={set('trainSound')} label="走行音" />} />
                <Row icon={<AudioLines size={19} />} title="航空：機内の音" detail="フライト中にジェットの低い音を鳴らす" right={<Toggle checked={settings.flightCabin} onChange={set('flightCabin')} label="機内の音" />} />
              </Group>

              <Group title="連携" footer="Google カレンダーの予定をタイムライン（週・月）にグレーで表示します。">
                <Row icon={<CalendarDays size={21} />} title="Google カレンダー" value={googleStatusLabel(google.status, isConnected())} onClick={() => setGoogleOpen(true)} />
              </Group>

              <Group title="データ" footer="記録はこの端末のブラウザ内に保存されます。ホーム画面に追加するとアプリとして全画面で使えます。">
                <Row
                  icon={<Download size={20} />}
                  title="バックアップを書き出す"
                  detail="記録・科目・予定・ノート・設定を 1 つのファイルに"
                  onClick={() => {
                    const blob = new Blob([exportBackup()], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `focus-trail-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
                    setBackupMsg('バックアップを書き出しました');
                  }}
                />
                <Row icon={<Upload size={20} />} title="バックアップから戻す" detail="いまの記録は書き出したファイルの内容に置き換わります" onClick={() => fileRef.current?.click()} />
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  aria-label="バックアップのファイル"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    const text = await f.text();
                    // 戻すとアプリ全体を作り直す（この画面も新しくなる）ので、知らせは sessionStorage に残して次の画面で出す
                    try {
                      sessionStorage.setItem(BACKUP_MSG_KEY, 'バックアップから戻しました');
                    } catch {
                      /* noop */
                    }
                    if (!(await importBackup(text))) {
                      sessionStorage.removeItem(BACKUP_MSG_KEY);
                      setBackupMsg('このファイルは読めませんでした');
                    }
                  }}
                />
                {backupMsg && <p className="px-1 text-ui-[12px] font-semibold text-accent-ink" role="status">{backupMsg}</p>}
                <Row icon={<Trash2 size={21} />} title="すべての記録を消去" onClick={() => setConfirm(true)} danger />
                <Row icon={<Database size={21} />} title="Focus Trail" value="v2.2" />
                <Row icon={<Ruler size={19} />} title="表示の診断" detail="画面の高さ・安全域・タブバーの位置を表示" right={<Toggle checked={probe} onChange={setLayoutProbe} label="表示の診断" />} />
              </Group>
            </div>

      {p && <PickerModal open={!!picker} onClose={() => setPicker(null)} title={p.title} value={p.value} options={p.options} onSelect={p.onSelect} />}

      <InstallSheet open={installOpen} onClose={() => setInstallOpen(false)} />
      <ModeSheet open={modeOpen} onClose={() => setModeOpen(false)} />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <GoogleCalendarSheet open={googleOpen} onClose={() => setGoogleOpen(false)} />
      <DayHoursSheet open={hoursOpen} onClose={() => setHoursOpen(false)} />

      <Sheet open={nameOpen} onClose={() => setNameOpen(false)} title="名前" subtitle="ホームの挨拶で呼ぶ名前です">
        <form
          className="space-y-3 pb-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) updateSettings({ userName: name.trim() });
            setNameOpen(false);
          }}
        >
          <input className="field text-ui-[17px] font-semibold" value={name} onChange={(e) => setName(e.target.value)} maxLength={16} autoFocus placeholder="旅人" />
          <button type="submit" className="btn-primary w-full">保存</button>
        </form>
      </Sheet>

      <Modal open={confirm} onClose={() => setConfirm(false)}>
        <div className="p-6 text-center">
          <p className="text-ui-[18px] font-extrabold">すべての記録を消去しますか？</p>
          <p className="mt-2 text-ui-[12.5px] text-fg-2">科目・記録・予定・ノート・ToDo・習慣がすべて消えます。この操作は取り消せません。</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => setConfirm(false)} className="rounded-card bg-fill py-3 font-bold">やめる</button>
            <button
              onClick={async () => {
                await clearAll();
                setConfirm(false);
              }}
              className="rounded-card bg-danger py-3 font-bold text-white"
            >
              消去
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
