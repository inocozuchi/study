import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bug, ChevronDown, CloudRain, Flame, Pause, Play, SkipBack, SkipForward, Trees, Waves } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Toggle } from '@/components/ui/Toggle';
import { CrayonCheck } from '@/components/ui/PaperControls';
import { CrayonOutline } from '@/components/ui/CrayonDefs';
import { useApp } from '@/store/AppStore';
import { BGM_TRACKS, type BgmTrack } from '@/audio/bgm';
import { ambient } from '@/audio/ambient';
import { springBouncy, springSoft } from '@/lib/motion';
import type { AmbientChannel } from '@/types';

const ENV: { key: AmbientChannel; label: string; icon: typeof Trees }[] = [
  { key: 'wind', label: '森', icon: Trees },
  { key: 'river', label: '川', icon: Waves },
  { key: 'rain', label: '雨', icon: CloudRain },
  { key: 'insects', label: '虫', icon: Bug },
  { key: 'fire', label: '焚き火', icon: Flame },
];

function TrackScreen({ track }: { track: BgmTrack }) {
  const c = track.colors;
  return (
    <svg viewBox="0 0 120 90" className="h-full w-full" aria-hidden>
      <g filter="url(#crayon-soft)">
        <rect width="120" height="90" fill={c.sky} />
        <circle cx="92" cy="22" r="9" fill="#FFF3D6" opacity="0.9" />
        <path d="M0 58 L22 40 L36 50 L58 28 L80 48 L120 36 L120 90 L0 90Z" fill="#8FA7C2" opacity="0.85" />
        <path d="M0 74 L120 58 L120 90 L0 90Z" fill={c.ground} stroke="#2E221C" strokeWidth="1" />
        <path d="M30 70 l-5 -10 l5 2 l3 -9 l3 9 l5 -2 l-5 10Z" fill="#2E4A38" />
        <rect x="56" y="58" width="6" height="12" rx="2" fill="#E0562D" stroke="#2E221C" strokeWidth="0.8" />
        <circle cx="59" cy="55" r="3.2" fill="#F2C3A0" stroke="#2E221C" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

function Cassette({ track, playing }: { track: BgmTrack; playing: boolean }) {
  const c = track.colors;
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl" style={{ background: c.band, backgroundImage: 'var(--noise-light), var(--twill)' }}>
      <div className="absolute inset-x-[6%] top-[10%] h-[44%] rounded-md px-2 py-1.5" style={{ background: '#F6EFDD', backgroundImage: 'var(--noise-warm), var(--weave)' }}>
        <div className="h-1 w-full rounded" style={{ background: c.label }} />
        <p className="mt-1 truncate text-center font-maru text-[13px] font-bold text-ink">{track.title}</p>
        <p className="truncate text-center text-[10px] text-ink-soft">Focus Trail · {track.subtitle}</p>
      </div>
      {/* テープ窓とリール */}
      <div className="absolute inset-x-[16%] bottom-[12%] flex h-[30%] items-center justify-between rounded-full px-[6%]" style={{ background: c.label }}>
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="relative grid aspect-square h-[78%] place-items-center rounded-full bg-[#3B302A]"
            animate={{ rotate: playing ? 360 : 0 }}
            transition={playing ? { duration: 2.4, repeat: Infinity, ease: 'linear' } : { duration: 0.4 }}
          >
            {[0, 60, 120].map((r) => (
              <span key={r} className="absolute h-[70%] w-[14%] rounded-sm bg-paper/85" style={{ transform: `rotate(${r}deg)` }} />
            ))}
            <span className="absolute h-[34%] w-[34%] rounded-full bg-[#3B302A]" />
          </motion.div>
        ))}
        <div className="absolute inset-x-[30%] top-1/2 h-[46%] -translate-y-1/2 rounded bg-[#2B221E]/80" />
      </div>
    </div>
  );
}

/** カセットデッキ風の音楽・環境音プレイヤー */
export function CassettePlayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useApp();
  const [mixer, setMixer] = useState(false);
  const track = BGM_TRACKS[settings.bgmTrack % BGM_TRACKS.length];
  const playing = settings.bgmPlaying;

  const setPlaying = (v: boolean) => {
    ambient.unlock();
    updateSettings({ bgmPlaying: v });
  };
  const step = (d: number) => {
    ambient.unlock();
    updateSettings({ bgmTrack: (settings.bgmTrack + d + BGM_TRACKS.length) % BGM_TRACKS.length, bgmPlaying: true });
  };
  const toggleEnv = (k: AmbientChannel) => {
    ambient.unlock();
    const on = settings.ambient[k] > 0.01;
    const mix = { ...settings.ambient, [k]: on ? 0 : 0.6 };
    updateSettings({ ambient: mix, ambientPlaying: Object.values(mix).some((v) => v > 0.01) });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      tone="paper"
      title="集中音楽"
      action={<Toggle tone="paper" checked={playing} onChange={setPlaying} color="#3E86C9" label="集中音楽" />}
      maxHeight="92vh"
    >
      <div className="pb-5">
        {/* デッキ本体 */}
        <div className="relative mt-3">
          <div className="absolute -top-3 right-8 flex gap-1.5">
            {['#B9B2A6', '#B9B2A6', '#D9573B'].map((c, i) => (
              <motion.span key={i} className="h-4 w-8 rounded-t-md" style={{ background: c }} animate={{ y: i === 2 && playing ? 3 : 0 }} transition={springBouncy} />
            ))}
          </div>
          <div className="tex-kraft relative flex gap-3 rounded-[1.6rem] p-3.5 shadow-[0_14px_30px_-16px_rgba(58,46,40,0.7)]">
            <CrayonOutline radius={24} color="rgba(58,46,40,0.4)" width={1.6} />
            <div className="flex w-[46%] flex-col gap-2.5">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border-4 border-[#CFC6B6]">
                <TrackScreen track={track} />
              </div>
              <div className="flex justify-between gap-1.5">
                {[
                  { icon: <SkipBack size={16} fill="currentColor" />, label: '前の曲', on: () => step(-1) },
                  { icon: playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />, label: playing ? '一時停止' : '再生', on: () => setPlaying(!playing) },
                  { icon: <SkipForward size={16} fill="currentColor" />, label: '次の曲', on: () => step(1) },
                ].map((b) => (
                  <motion.button key={b.label} whileTap={{ y: 3, scale: 0.95 }} transition={springBouncy} onClick={b.on} aria-label={b.label} className="grid h-10 flex-1 place-items-center rounded-lg bg-[#4C6E9A] text-paper shadow-[0_3px_0_#2F4766]" style={{ backgroundImage: 'var(--noise-light), var(--twill)' }}>
                    {b.icon}
                  </motion.button>
                ))}
              </div>
            </div>
            <div className="relative flex-1 rounded-xl bg-[#CFC6B6] p-1.5">
              <AnimatePresence mode="popLayout">
                <motion.div key={track.title} className="h-full" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={springSoft}>
                  <Cassette track={track} playing={playing} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* 曲リスト */}
        <div className="paper-card mt-4 divide-y divide-ink/10 overflow-hidden">
          {BGM_TRACKS.map((tr, i) => {
            const active = i === settings.bgmTrack;
            return (
              <button key={tr.title} onClick={() => { ambient.unlock(); updateSettings({ bgmTrack: i, bgmPlaying: true }); }} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="h-7 w-2 rounded-full" style={{ background: tr.colors.label }} />
                <span className="min-w-0 flex-1">
                  <span className="block font-maru text-[15px] font-bold">{tr.title}</span>
                  <span className="block text-[11px] text-ink-soft">{tr.subtitle} · {tr.bpm} BPM</span>
                </span>
                {active && playing && (
                  <span className="flex h-4 items-end gap-0.5">
                    {[0, 1, 2].map((b) => (
                      <motion.span key={b} className="w-1 rounded-full bg-crayon-blue" animate={{ height: ['30%', '100%', '45%', '80%', '30%'] }} transition={{ duration: 1.1, repeat: Infinity, delay: b * 0.15 }} />
                    ))}
                  </span>
                )}
                {active && !playing && <span className="text-[11px] font-bold text-ink-soft">選択中</span>}
              </button>
            );
          })}
        </div>
        <label className="mt-3 flex items-center gap-3 px-1 text-[12px] font-bold text-ink-soft">
          音量
          <input type="range" min={0} max={1} step={0.01} value={settings.bgmVolume} onChange={(e) => updateSettings({ bgmVolume: Number(e.target.value) })} className="flex-1 accent-[#4A3A34]" aria-label="BGM の音量" />
        </label>

        {/* 環境音：ボトムコントロール */}
        <p className="mb-3 mt-6 font-maru text-[13px] font-bold text-ink-soft">環境音</p>
        <div className="grid grid-cols-5 gap-1">
          {ENV.map(({ key, label, icon: Icon }) => {
            const on = settings.ambient[key] > 0.01;
            return (
              <div key={key} className="flex flex-col items-center gap-2">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => toggleEnv(key)} aria-label={label} className={`grid h-14 w-14 place-items-center rounded-2xl ${on ? 'text-ink' : 'text-ink-faint'}`}>
                  <Icon size={30} strokeWidth={1.6} />
                </motion.button>
                <CrayonCheck checked={on} onChange={() => toggleEnv(key)} color="#4A3A34" label={`${label}の音`} />
                <span className="font-maru text-[11px] font-bold text-ink-soft">{label}</span>
              </div>
            );
          })}
        </div>

        <button onClick={() => setMixer((m) => !m)} className="mt-4 flex w-full items-center justify-center gap-1 text-[12px] font-bold text-ink-soft">
          細かく調整 <motion.span animate={{ rotate: mixer ? 180 : 0 }}><ChevronDown size={14} /></motion.span>
        </button>
        <AnimatePresence initial={false}>
          {mixer && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={springSoft} className="overflow-hidden">
              <div className="paper-card mt-2 space-y-3 p-4">
                {ENV.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 text-[13px] font-bold">
                    <span className="w-12">{label}</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={settings.ambient[key]}
                      onChange={(e) => {
                        ambient.unlock();
                        const mix = { ...settings.ambient, [key]: Number(e.target.value) };
                        updateSettings({ ambient: mix, ambientPlaying: Object.values(mix).some((v) => v > 0.01) });
                      }}
                      className="flex-1 accent-[#4A3A34]"
                      aria-label={`${label}の音量`}
                    />
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Sheet>
  );
}
