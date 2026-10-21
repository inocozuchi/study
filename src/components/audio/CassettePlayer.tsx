import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Music2, Pause, Play, SkipBack, SkipForward, Volume1, Volume2 } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Toggle } from '@/components/ui/Toggle';
import { Segmented } from '@/components/ui/Segmented';
import { SoundMixer } from './SoundMixer';
import { useApp } from '@/store/AppStore';
import { useBgmTracks, type LibraryTrack } from '@/audio/bgmLibrary';
import { useBgmStatus } from '@/audio/useBgmStatus';
import { ambient } from '@/audio/ambient';
import { alpha } from '@/lib/subjects';
import { springBouncy, springSoft } from '@/lib/motion';

/** カセットテープ（すっきりしたベクター） */
function Cassette({ track, spinning }: { track: LibraryTrack; spinning: boolean }) {
  const c = track.colors;
  return (
    <div className="relative aspect-[1.6] w-full overflow-hidden rounded-2xl shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)]" style={{ background: `linear-gradient(160deg, ${c.band}, ${alpha(c.band, 0.85)})` }}>
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-line" />
      {/* ラベル */}
      <div className="absolute inset-x-[7%] top-[9%] h-[40%] rounded-lg bg-surface px-3 py-2">
        <div className="h-1.5 w-full rounded-full" style={{ background: c.label }} />
        <p className="mt-1.5 truncate text-center text-ui-[14px] font-bold text-night-950">{track.title}</p>
        <p className="truncate text-center text-ui-[11px] text-night-950/55">∞ {track.subtitle}</p>
      </div>
      {/* テープ窓とリール */}
      <div className="absolute inset-x-[17%] bottom-[12%] flex h-[30%] items-center justify-between rounded-full bg-black/35 px-[5%] ring-1 ring-inset ring-line">
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="relative grid aspect-square h-[78%] place-items-center rounded-full bg-surface"
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

type Pane = 'bgm' | 'mixer';

/** サウンド：BGM（カセット風の再生カード）と音ミキサー（BGM・環境音それぞれの音量） */
export function CassettePlayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useApp();
  const [pane, setPane] = useState<Pane>('bgm');
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
  return (
    <Sheet open={open} onClose={onClose} title="サウンド" action={<Toggle checked={playing} onChange={setPlaying} label="BGM" />} maxHeight="92vh">
      <div className="pb-5">
        <Segmented<Pane>
          value={pane}
          onChange={setPane}
          className="mb-4"
          options={[
            { value: 'bgm', label: 'BGM' },
            { value: 'mixer', label: 'ミキサー' },
          ]}
        />
        {pane === 'mixer' ? (
          <SoundMixer />
        ) : !track ? (
          // 曲がまだないとき
          <div className="group-box rounded-3xl px-5 py-7 text-center">
            <Music2 size={30} className="mx-auto text-fg-2" />
            <p className="mt-3 text-ui-[15px] font-semibold">BGM はまだありません</p>
            <p className="mt-1.5 text-ui-[12.5px] leading-relaxed text-fg-2">
              曲を追加すると、ここで再生できます。
              <br />
              曲の終わりで途切れずに繰り返します。
            </p>
          </div>
        ) : (
          <>
        {/* 再生カード */}
        <div className="group-box rounded-3xl p-4">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={track.id} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }} transition={springSoft}>
              <Cassette track={track} spinning={spinning} />
            </motion.div>
          </AnimatePresence>
          <div className="mt-4 text-center">
            <p className="text-ui-[16px] font-semibold">{track.title}</p>
            <p className="mt-0.5 text-ui-[12.5px] text-fg-2">
              {status === 'loading' ? '読み込み中…' : status === 'error' ? '曲を読み込めませんでした' : track.detail}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-center gap-8">
            <motion.button transition={springBouncy} onClick={() => step(-1)} aria-label="前の曲" className="text-fg">
              <SkipBack size={28} fill="currentColor" />
            </motion.button>
            <motion.button transition={springBouncy} onClick={() => setPlaying(!playing)} aria-label={playing ? '一時停止' : '再生'} className="grid h-16 w-16 place-items-center rounded-full bg-accent text-white">
              {playing ? <Pause size={28} fill="currentColor" strokeWidth={0} /> : <Play size={28} fill="currentColor" strokeWidth={0} className="translate-x-0.5" />}
            </motion.button>
            <motion.button transition={springBouncy} onClick={() => step(1)} aria-label="次の曲" className="text-fg">
              <SkipForward size={28} fill="currentColor" />
            </motion.button>
          </div>
          <label className="mt-4 flex items-center gap-3 text-fg-2">
            <Volume1 size={16} />
            <input type="range" min={0} max={1} step={0.01} value={settings.bgmVolume} onChange={(e) => updateSettings({ bgmVolume: Number(e.target.value) })} className="flex-1 accent-white" aria-label="BGM の音量" />
            <Volume2 size={16} />
          </label>
        </div>

        {/* 曲リスト */}
        <p className="section-label mb-2 mt-6">曲</p>
        <div className="group-box divide-y divide-line overflow-hidden rounded-2xl">
          {tracks.map((tr, i) => {
            const active = i === index;
            return (
              <button key={tr.id} onClick={() => { ambient.unlock(); updateSettings({ bgmTrackId: tr.id, bgmPlaying: true }); }} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fill">
                <span className="h-7 w-1.5 rounded-full" style={{ background: tr.colors.label }} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-ui-[14px] ${active ? 'font-semibold' : 'font-medium'}`}>{tr.title}</span>
                  <span className="block text-ui-[11px] text-fg-2">{tr.subtitle} · {tr.detail}</span>
                </span>
                {active && spinning && (
                  <span className="flex h-4 items-end gap-0.5">
                    {[0, 1, 2].map((b) => (
                      <motion.span key={b} className="w-1 rounded-full bg-accent" animate={{ height: ['30%', '100%', '45%', '80%', '30%'] }} transition={{ duration: 1.1, repeat: Infinity, delay: b * 0.15 }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
          </>
        )}

      </div>
    </Sheet>
  );
}
