import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Music, Settings2 } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { useTimer, type JourneyResult } from '@/store/TimerStore';
import { Pressable } from '@/components/ui/Pressable';
import { SetupSheet } from '@/components/home/SetupSheet';
import { BreathOverlay } from '@/components/focus/BreathOverlay';
import { CassettePlayer } from '@/components/audio/CassettePlayer';
import { TOOL_TABS, ToolsPanel, type ToolTab } from '@/components/tools/ToolsPanel';
import { SettingsScreen } from './SettingsScreen';
import { getDesign } from '@/designs';
import { streaks, summary } from '@/lib/stats';
import { dateKey, fmtDuration } from '@/lib/time';
import { useNow } from '@/hooks/useNow';
import { springBouncy, springSoft } from '@/lib/motion';

interface Props {
  result: JourneyResult | null;
  setResult: (r: JourneyResult | null) => void;
}

export function HomeScreen({ result, setResult }: Props) {
  const { settings, updateSettings } = useApp();
  const t = useTimer();
  const { timer } = t;
  const [setup, setSetup] = useState(false);
  const [breath, setBreath] = useState(false);
  const [music, setMusic] = useState(false);
  const [tool, setTool] = useState<ToolTab | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const journeying = timer.phase !== 'idle' || !!timer.journeyStartedAt;
  const design = getDesign(settings.timerDesign);

  const onStarted = useCallback(() => {
    if (settings.breathing) setBreath(true);
    if (settings.bgmOnFocus && !settings.bgmPlaying) updateSettings({ bgmPlaying: true });
  }, [settings.breathing, settings.bgmOnFocus, settings.bgmPlaying, updateSettings]);
  const endBreath = useCallback(() => setBreath(false), []);

  const end = () => {
    const r = t.endJourney();
    if (r) setResult(r);
  };

  // 予定から出発した場合などは、深呼吸なしで HUD に入る
  const wasJourney = useRef(journeying);
  useEffect(() => {
    if (journeying && !wasJourney.current && settings.bgmOnFocus && !settings.bgmPlaying) updateSettings({ bgmPlaying: true });
    wasJourney.current = journeying;
  }, [journeying]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative h-full">
      <AnimatePresence mode="wait">
        {result ? (
          <motion.div key="result" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
            <design.Result result={result} onContinue={() => setResult(null)} />
          </motion.div>
        ) : journeying ? (
          <motion.div key="hud" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <design.Session onMusic={() => setMusic(true)} onEnd={end} />
          </motion.div>
        ) : (
          <motion.div key="home" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
            <HomeIdle
              onFocus={() => setSetup(true)}
              onMusic={() => setMusic(true)}
              onSettings={() => setSettingsOpen(true)}
              onTool={setTool}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <BreathOverlay open={breath && journeying && !result} onDone={endBreath} />
      <SetupSheet open={setup} onClose={() => setSetup(false)} onStarted={onStarted} />
      <CassettePlayer open={music} onClose={() => setMusic(false)} />
      <ToolsPanel tab={tool} onTab={setTool} onClose={() => setTool(null)} />
      <SettingsScreen open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function HomeIdle({ onFocus, onMusic, onSettings, onTool }: { onFocus: () => void; onMusic: () => void; onSettings: () => void; onTool: (t: ToolTab) => void }) {
  const { settings, sessions } = useApp();
  // 日付が変わったら「今日」と連続日数を数え直す
  const today = dateKey(useNow(60_000));
  const sum = useMemo(() => summary(sessions), [sessions, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = useMemo(() => streaks(sessions), [sessions, today]); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <div className="relative mx-auto h-full max-w-xl">
      {/* 上部 */}
      <div className="flex items-center justify-between px-5 pt-safe">
        <Pressable onClick={onMusic} aria-label="集中音楽" className={`glass-scene mt-1 grid h-10 w-10 place-items-center rounded-full ${settings.bgmPlaying ? 'text-ember' : 'text-white/85'}`}>
          <Music size={18} />
        </Pressable>
        <Pressable onClick={onSettings} aria-label="設定" className="glass-scene mt-1 grid h-10 w-10 place-items-center rounded-full text-white">
          <Settings2 size={18} />
        </Pressable>
      </div>

      {/* 挨拶 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springSoft} className="px-6 pt-5">
        <h1 className="text-[30px] font-bold leading-tight tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
          やあ！{settings.userName}、
          <br />
          <span className="text-[21px] font-semibold text-white/90">前へ進む準備はいい？</span>
        </h1>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[`今日 ${fmtDuration(sum.today, true)}`, `🔥 ${st.current}日連続`].map((c) => (
            <span key={c} className="tabular rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur-md">
              {c}
            </span>
          ))}
        </div>
      </motion.div>

      {/* サイドのツールタブ */}
      <motion.nav initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...springBouncy, delay: 0.15 }} className="glass-scene absolute right-3 top-[30%] flex flex-col gap-1 rounded-full p-1.5" aria-label="ツール">
        {TOOL_TABS.map(({ key, label, icon: Icon, color }) => (
          <Pressable key={key} scale={0.85} onClick={() => onTool(key)} aria-label={label} className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.08]">
            <Icon size={19} color={color} strokeWidth={2.2} />
          </Pressable>
        ))}
      </motion.nav>

      {/* 下部：集中ボタン */}
      <div className="absolute inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom),8px)+84px)] flex flex-col items-center px-6">
        <FocusButton onClick={onFocus} />
      </div>
    </div>
  );
}

/** 大きな「集中」ボタン：白いグラデーションの円と、ゆっくり広がる光の輪 */
function FocusButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative grid h-[124px] w-[124px] place-items-center">
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-white/40"
          animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 1.6, ease: 'easeOut' }}
        />
      ))}
      <motion.button
        whileTap={{ scale: 0.92 }}
        transition={springBouncy}
        onClick={onClick}
        aria-label="集中する"
        className="relative grid h-full w-full place-items-center rounded-full text-night-950"
        style={{ background: 'linear-gradient(160deg, #ffffff, #dfe9f7)', boxShadow: '0 18px 44px -12px rgba(142,197,255,0.65), inset 0 1px 0 rgba(255,255,255,0.9)' }}
      >
        <span className="text-[26px] font-bold tracking-[0.12em]">集中</span>
      </motion.button>
    </div>
  );
}
