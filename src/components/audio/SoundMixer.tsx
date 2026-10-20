import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Bird, Bug, Clock, CloudLightning, CloudRain, Coffee, Flame, FolderOpen, Headphones, Keyboard, Music2, PartyPopper, Pause, Play, Snowflake, TrainFront, Trees, VolumeX, Waves, Wind, type LucideIcon } from 'lucide-react';
import { VolumeSlider } from '@/components/ui/VolumeSlider';
import { useApp } from '@/store/AppStore';
import { useBgmTracks } from '@/audio/bgmLibrary';
import { useAmbientSounds, type AmbientKind } from '@/audio/ambientLibrary';
import { ambient } from '@/audio/ambient';
import { spring } from '@/lib/motion';
import type { AmbientChannel, AmbientMix } from '@/types';

/** 内蔵（ブラウザ内で合成）の環境音 */
const KIND_ICON: Record<AmbientKind, LucideIcon> = {
  storm: CloudLightning, rain: CloudRain, river: Waves, sea: Waves, fire: Flame, insects: Bug, birds: Bird, wind: Wind, forest: Trees,
  snow: Snowflake, cafe: Coffee, train: TrainFront, book: BookOpen, clock: Clock, keyboard: Keyboard, festival: PartyPopper, other: Headphones,
};

const BUILTIN: { key: AmbientChannel; label: string; icon: typeof Trees }[] = [
  { key: 'wind', label: '森の風', icon: Trees },
  { key: 'river', label: '川', icon: Waves },
  { key: 'rain', label: '雨', icon: CloudRain },
  { key: 'insects', label: '虫の音', icon: Bug },
  { key: 'fire', label: '焚き火', icon: Flame },
];

/** ミキサーで音を入れたときの最初の音量 */
const DEFAULT_LEVEL = 0.6;

function anyOn(builtin: AmbientMix, files: Record<string, number>) {
  return Object.values(builtin).some((v) => v > 0.01) || Object.values(files).some((v) => v > 0.01);
}

function MixerRow({ icon, title, level, live, onLevel, onToggle }: { icon: ReactNode; title: string; level: number; live: boolean; onLevel: (v: number) => void; onToggle: () => void }) {
  const set = level > 0.01;
  // 音量が入っていて、環境音が再生中のときだけ「鳴っている」
  const on = set && live;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <motion.button
        whileTap={{ scale: 0.88 }}
        transition={spring}
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        aria-label={`${title}を${on ? '止める' : '鳴らす'}`}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-card text-[20px] transition-colors ${on ? 'bg-accent text-white' : 'bg-fill text-fg-2'}`}
      >
        {icon}
      </motion.button>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="truncate text-[14px] font-bold">{title}</span>
          <span className="tabular shrink-0 text-[12px] text-fg-2">{set ? `${Math.round(level * 100)}%` : 'オフ'}</span>
        </div>
        <div className={live ? '' : 'opacity-50'}>
          <VolumeSlider value={level} onChange={onLevel} label={`${title}の音量`} />
        </div>
      </div>
    </div>
  );
}

/** 音ミキサー：BGM・追加した環境音・内蔵の環境音を、それぞれ自由な音量で重ねる */
export function SoundMixer() {
  const { settings, updateSettings } = useApp();
  const tracks = useBgmTracks();
  const sounds = useAmbientSounds();
  const track = tracks.find((t) => t.id === settings.bgmTrackId) ?? tracks[0];

  const setBuiltin = (k: AmbientChannel, v: number) => {
    ambient.unlock();
    const mix = { ...settings.ambient, [k]: v };
    updateSettings({ ambient: mix, ambientPlaying: anyOn(mix, settings.ambientFiles) });
  };
  const setFile = (id: string, v: number) => {
    ambient.unlock();
    const files = { ...settings.ambientFiles, [id]: v };
    updateSettings({ ambientFiles: files, ambientPlaying: anyOn(settings.ambient, files) });
  };
  const stopAll = () => {
    const mix = Object.fromEntries(Object.keys(settings.ambient).map((k) => [k, 0])) as AmbientMix;
    updateSettings({ ambient: mix, ambientFiles: {}, ambientPlaying: false });
  };
  const ambientOn = anyOn(settings.ambient, settings.ambientFiles);
  const live = settings.ambientPlaying;
  const toggleAmbient = () => {
    ambient.unlock();
    updateSettings({ ambientPlaying: !live && ambientOn });
  };
  // アイコンをタップ：止まっていて音量が入っている音は、そのまま再生を始める。鳴っていれば 0、0 なら既定の音量へ
  const toggle = (level: number, set: (v: number) => void) => {
    if (level > 0.01 && !live) {
      ambient.unlock();
      updateSettings({ ambientPlaying: true });
    } else set(level > 0.01 ? 0 : DEFAULT_LEVEL);
  };
  // 環境音の見出し：音量を残したまま、まとめて再生・一時停止
  const ambientHeader = (title: string) => (
    <div className="mb-2 flex items-center justify-between px-1">
      <p className="section-label">{title}</p>
      {ambientOn && (
        <button onClick={toggleAmbient} className="hit flex items-center gap-1 text-[13px] font-semibold text-accent-ink">
          {live ? <Pause size={13} fill="currentColor" strokeWidth={0} /> : <Play size={13} fill="currentColor" strokeWidth={0} />}
          {live ? '一時停止' : '再生'}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* BGM */}
      <section>
        <p className="section-label mb-2 px-1">BGM</p>
        <div className="group-box overflow-hidden rounded-2xl">
          <div className="flex items-center gap-3 px-4 py-3">
            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={spring}
              disabled={!track}
              onClick={() => {
                ambient.unlock();
                updateSettings({ bgmPlaying: !settings.bgmPlaying });
              }}
              aria-label={settings.bgmPlaying ? 'BGM を一時停止' : 'BGM を再生'}
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-card transition-colors disabled:opacity-40 ${settings.bgmPlaying && track ? 'bg-accent text-white' : 'bg-fill text-fg-2'}`}
            >
              {settings.bgmPlaying && track ? <Pause size={20} fill="currentColor" strokeWidth={0} /> : <Play size={20} fill="currentColor" strokeWidth={0} className="translate-x-0.5" />}
            </motion.button>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="truncate text-[14px] font-bold">{track?.title ?? '曲がまだありません'}</span>
                <span className="tabular shrink-0 text-[12px] text-fg-2">{Math.round(settings.bgmVolume * 100)}%</span>
              </div>
              <VolumeSlider value={settings.bgmVolume} onChange={(v) => updateSettings({ bgmVolume: v })} label="BGM の音量" disabled={!track} />
            </div>
          </div>
        </div>
      </section>

      {/* 追加した環境音 */}
      <section>
        {ambientHeader('環境音')}
        <div className="group-box divide-y divide-line overflow-hidden rounded-2xl">
          {sounds.map((s) => (
            <MixerRow
              key={s.id}
              icon={(() => { const I = KIND_ICON[s.kind] ?? Headphones; return <I size={20} strokeWidth={2.2} />; })()}
              title={s.title}
              level={settings.ambientFiles[s.id] ?? 0}
              live={live}
              onLevel={(v) => setFile(s.id, v)}
              onToggle={() => toggle(settings.ambientFiles[s.id] ?? 0, (v) => setFile(s.id, v))}
            />
          ))}
          {sounds.length === 0 && (
            <div className="flex items-center gap-3 px-4 py-3.5 text-fg-2">
              <FolderOpen size={20} className="shrink-0" />
              <p className="text-[13px] leading-snug">追加した環境音はまだありません。音のファイルを追加すると、ここに並びます。</p>
            </div>
          )}
        </div>
      </section>

      {/* 内蔵の環境音 */}
      <section>
        <p className="section-label mb-2 px-1">内蔵の環境音</p>
        <div className="group-box divide-y divide-line overflow-hidden rounded-2xl">
          {BUILTIN.map(({ key, label, icon: Icon }) => (
            <MixerRow
              key={key}
              icon={<Icon size={20} strokeWidth={2.2} />}
              title={label}
              level={settings.ambient[key]}
              live={live}
              onLevel={(v) => setBuiltin(key, v)}
              onToggle={() => toggle(settings.ambient[key], (v) => setBuiltin(key, v))}
            />
          ))}
        </div>
        <p className="mt-1.5 px-1 text-[12px] text-fg-2">ブラウザの中で合成している音です。</p>
      </section>

      <motion.button
        whileTap={{ scale: 0.97 }}
        transition={spring}
        disabled={!ambientOn}
        onClick={stopAll}
        className="btn-secondary w-full text-[14px]"
      >
        <VolumeX size={17} /> 環境音をすべて止める
      </motion.button>
      {!track && (
        <p className="flex items-center justify-center gap-1.5 text-[12px] text-fg-2">
          <Music2 size={13} /> BGM は曲のファイルを追加すると選べます
        </p>
      )}
    </div>
  );
}
