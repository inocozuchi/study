import { CloudRain, Flame, Pause, Play, Waves, Wind } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sheet } from '@/components/ui/Sheet';
import { Slider } from '@/components/ui/Slider';
import { useApp } from '@/store/AppStore';
import type { AmbientChannel, AmbientMix } from '@/types';
import { spring } from '@/lib/motion';
import { ambient } from '@/audio/ambient';

const CHANNELS: { key: AmbientChannel; label: string; icon: typeof Flame; color: string }[] = [
  { key: 'rain', label: '雨', icon: CloudRain, color: '#8EC5FF' },
  { key: 'fire', label: '焚き火', icon: Flame, color: '#FF8A4C' },
  { key: 'wind', label: '森の風', icon: Wind, color: '#7FD1A8' },
  { key: 'river', label: '川のせせらぎ', icon: Waves, color: '#5EE0E6' },
];

const PRESETS: { name: string; emoji: string; mix: AmbientMix }[] = [
  { name: '焚き火の夜', emoji: '🔥', mix: { rain: 0, fire: 0.75, wind: 0.25, river: 0 } },
  { name: '雨の山小屋', emoji: '🌧', mix: { rain: 0.7, fire: 0.35, wind: 0.1, river: 0 } },
  { name: '渓流の森', emoji: '🌲', mix: { rain: 0, fire: 0, wind: 0.5, river: 0.6 } },
  { name: '嵐の稜線', emoji: '⛈', mix: { rain: 0.85, fire: 0, wind: 0.8, river: 0.2 } },
];

export function AmbientSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateSettings } = useApp();
  const playing = settings.ambientPlaying;
  const setMix = (mix: AmbientMix) => {
    ambient.unlock();
    updateSettings({ ambient: mix, ambientPlaying: true });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="環境音ミキサー"
      subtitle="すべてリアルタイムに合成された自然の音"
      action={
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={spring}
          onClick={() => {
            ambient.unlock();
            updateSettings({ ambientPlaying: !playing });
          }}
          className={`flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold ${playing ? 'bg-white/15 text-white' : 'bg-white text-night-950'}`}
        >
          {playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
          {playing ? '停止' : '再生'}
        </motion.button>
      }
    >
      <div className="space-y-2.5 pb-3">
        {CHANNELS.map(({ key, label, icon: Icon, color }) => (
          <Slider
            key={key}
            label={label}
            color={color}
            icon={<Icon size={18} />}
            value={settings.ambient[key]}
            onChange={(v) => setMix({ ...settings.ambient, [key]: v })}
          />
        ))}
      </div>
      <p className="section-label mb-2 mt-3">プリセット</p>
      <div className="grid grid-cols-2 gap-2 pb-4">
        {PRESETS.map((p) => (
          <motion.button
            key={p.name}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMix(p.mix)}
            className="glass-thin flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left text-[14px] font-semibold"
          >
            <span className="text-[20px]">{p.emoji}</span>
            {p.name}
          </motion.button>
        ))}
      </div>
    </Sheet>
  );
}
