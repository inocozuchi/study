import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bug, ChevronDown, Music2, CloudRain, Flame, Pause, Play, SkipBack, SkipForward, Trees, Volume1, Volume2, Waves } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Toggle } from '@/components/ui/Toggle';
import { useApp } from '@/store/AppStore';
import { useBgmTracks, type LibraryTrack } from '@/audio/bgmLibrary';
import { useBgmStatus } from '@/audio/useBgmStatus';
import { ambient } from '@/audio/ambient';
import { alpha } from '@/lib/subjects';
import { spring, springBouncy, springSoft } from '@/lib/motion';
import type { AmbientChannel } from '@/types';

const ENV: { key: AmbientChannel; label: string; icon: typeof Trees; color: string }[] = [
  { key: 'wind', label: '森', icon: Trees, color: '#7FD1A8' },
  { key: 'river', label: '川', icon: Waves, color: '#5EE0E6' },
  { key: 'rain', label: '雨', icon: CloudRain, color: '#8EC5FF' },
  { key: 'insects', label: '虫', icon: Bug, color: '#C3A6FF' },
  { key: 'fire', label: '焚き火', icon: Flame, color: '#FF8A4C' },
];

/** カセットテープ（すっきりしたベクター） */
function Cassette({ track, spinning }: { track: LibraryTrack; spinning: boolean }) {
  const c = track.colors;
  return (
    <div className="relative aspect-[1.6] w-full overflow-hidden rounded-2xl shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)]" style={{ background: `linear-gradient(160deg, ${c.band}, ${alpha(c.band, 0.85)})` }}>
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15" />
      {/* ラベル */}
      <div className="absolute inset-x-[7%] top-[9%] h-[40%] rounded-lg bg-white/95 px-3 py-2">
        <div className="h-1.5 w-full rounded-full" style={{ background: c.label }} />
        <p className="mt-1.5 truncate text-center text-[15px] font-bold text-night-950">{track.title}</p>
        <p className="truncate text-center text-[11px] text-night-950/55">∞ {track.subtitle}</p>
      </div>
      {/* テープ窓とリール */}
      <div className="absolute inset-x-[17%] bottom-[12%] flex h-[30%] items-center justify-between rounded-full bg-black/35 px-[5%] ring-1 ring-inset ring-white/10">
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="relative grid aspect-square h-[78%] place-items-center rounded-full bg-white/90"
            animate={{ rotate: spinning ? 360 : 0 }}
            transition={spinning ? { duration: 2.4, repeat: Infinity, ease: 'linear' } : { duration: 0.4 }}
          >
            {[0, 60, 120].map((r) => (
              <span key={r} className="absolute h-[64%] w-[12%] rounded-sm" style={{ background: c.band, transform: `rotate(${r}deg)` }} />
            ))}
            <span className="absolute h-[30%] w-[30%] rounded-full" style={{ background: c.band }} />
          </motion.div>
        ))}
        <div className="absolute inset-x-[32%] top-1/2 h-[40%] -translate-y-1/2 rounded bg-[#3A2A22]/80" />
      </div>
    </div>
  );
}

/** 音楽・環境音プレイヤー（カセット風の再生カード + コントロールセンター風の環境音） */
export function CassettePlayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useApp();
  const [mixer, setMixer] = useState(false);
  const tracks = useBgmTracks();
  const status = useBgmStatus();
  const index = Math.max(0, tracks.findIndex((t) => t.id === settings.bgmTrackId));
  const track = tracks[index] as LibraryTrack | undefined;
  const playing = settings.bgmPlaying;
  // 読み込み中はリールを回さない
  const spinning = playing && status === 'playing';

  const setPlaying = (v: boolean) => {
    ambient.unlock();
    updateSettings({ bgmPlaying: v });
  };
  const step = (d: number) => {
    ambient.unlock();
    if (!tracks.length) return;
    updateSettings({ bgmTrackId: tracks[(index + d + tracks.length) % tracks.length].id, bgmPlaying: true });
  };
  const toggleEnv = (k: AmbientChannel) => {
    ambient.unlock();
    const on = settings.ambient[k] > 0.01;
    const mix = { ...settings.ambient, [k]: on ? 0 : 0.6 };
    updateSettings({ ambient: mix, ambientPlaying: Object.values(mix).some((v) => v > 0.01) });
  };

  return (
    <Sheet open={open} onClose={onClose} title="集中音楽" action={<Toggle checked={playing} onChange={setPlaying} color="#34C759" label="集中音楽" />} maxHeight="92vh">
      <div className="pb-5">
        {!track ? (
          // 曲がまだないとき
          <div className="glass-thin rounded-3xl px-5 py-7 text-center">
            <Music2 size={30} className="mx-auto text-white/40" />
            <p className="mt-3 text-[16px] font-semibold">BGM はまだありません</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
              曲を追加すると、ここで再生できます。
              <br />
              曲の終わりで途切れずに繰り返します。
            </p>
          </div>
        ) : (
          <>
        {/* 再生カード */}
        <div className="glass-thin rounded-3xl p-4">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={track.id} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={springSoft}>
              <Cassette track={track} spinning={spinning} />
            </motion.div>
          </AnimatePresence>
          <div className="mt-4 text-center">
            <p className="text-[17px] font-semibold">{track.title}</p>
            <p className="mt-0.5 text-[13px] text-white/50">
              {status === 'loading' ? '読み込み中…' : status === 'error' ? '曲を読み込めませんでした' : track.detail}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-center gap-8">
            <motion.button whileTap={{ scale: 0.85 }} transition={springBouncy} onClick={() => step(-1)} aria-label="前の曲" className="text-white/85">
              <SkipBack size={28} fill="currentColor" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.88 }} transition={springBouncy} onClick={() => setPlaying(!playing)} aria-label={playing ? '一時停止' : '再生'} className="grid h-16 w-16 place-items-center rounded-full bg-white text-night-950">
              {playing ? <Pause size={28} fill="currentColor" strokeWidth={0} /> : <Play size={28} fill="currentColor" strokeWidth={0} className="translate-x-0.5" />}
            </motion.button>
            <motion.button whileTap={{ scale: 0.85 }} transition={springBouncy} onClick={() => step(1)} aria-label="次の曲" className="text-white/85">
              <SkipForward size={28} fill="currentColor" />
            </motion.button>
          </div>
          <label className="mt-4 flex items-center gap-3 text-white/50">
            <Volume1 size={16} />
            <input type="range" min={0} max={1} step={0.01} value={settings.bgmVolume} onChange={(e) => updateSettings({ bgmVolume: Number(e.target.value) })} className="flex-1 accent-white" aria-label="BGM の音量" />
            <Volume2 size={16} />
          </label>
        </div>

        {/* 曲リスト */}
        <p className="section-label mb-2 mt-6">曲</p>
        <div className="glass-thin divide-y divide-white/[0.06] overflow-hidden rounded-2xl">
          {tracks.map((tr, i) => {
            const active = i === index;
            return (
              <button key={tr.id} onClick={() => { ambient.unlock(); updateSettings({ bgmTrackId: tr.id, bgmPlaying: true }); }} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/5">
                <span className="h-7 w-1.5 rounded-full" style={{ background: tr.colors.label }} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[15px] ${active ? 'font-semibold' : 'font-medium'}`}>{tr.title}</span>
                  <span className="block text-[11px] text-white/45">{tr.subtitle} · {tr.detail}</span>
                </span>
                {active && spinning && (
                  <span className="flex h-4 items-end gap-0.5">
                    {[0, 1, 2].map((b) => (
                      <motion.span key={b} className="w-1 rounded-full bg-moss" animate={{ height: ['30%', '100%', '45%', '80%', '30%'] }} transition={{ duration: 1.1, repeat: Infinity, delay: b * 0.15 }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
          </>
        )}

        {/* 環境音：コントロールセンター風のタイル */}
        <p className="section-label mb-2 mt-6">環境音</p>
        <div className="grid grid-cols-5 gap-2">
          {ENV.map(({ key, label, icon: Icon, color }) => {
            const on = settings.ambient[key] > 0.01;
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.9 }}
                transition={spring}
                onClick={() => toggleEnv(key)}
                role="checkbox"
                aria-checked={on}
                aria-label={`${label}の音`}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl transition-colors"
                style={{ background: on ? color : 'rgba(255,255,255,0.08)', color: on ? '#0C1224' : 'rgba(255,255,255,0.75)' }}
              >
                <Icon size={22} strokeWidth={2} />
                <span className="text-[11px] font-semibold">{label}</span>
              </motion.button>
            );
          })}
        </div>

        <button onClick={() => setMixer((m) => !m)} className="mt-4 flex w-full items-center justify-center gap-1 text-[12px] font-semibold text-white/50">
          細かく調整 <motion.span animate={{ rotate: mixer ? 180 : 0 }}><ChevronDown size={14} /></motion.span>
        </button>
        {mixer && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={springSoft} className="glass-thin mt-2 space-y-3 rounded-2xl p-4">
            {ENV.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 text-[13px] font-medium">
                <span className="w-12 text-white/70">{label}</span>
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
                  className="flex-1 accent-white"
                  aria-label={`${label}の音量`}
                />
              </label>
            ))}
          </motion.div>
        )}
      </div>
    </Sheet>
  );
}
