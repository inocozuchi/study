import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Clock3, Flame, IdCard, Music, Settings2 } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { useTimer, type JourneyResult } from '@/store/TimerStore';
import { Pressable } from '@/components/ui/Pressable';
import { SetupSheet } from '@/components/home/SetupSheet';
import { BreathOverlay } from '@/components/focus/BreathOverlay';
import { CassettePlayer } from '@/components/audio/CassettePlayer';
import { TOOL_TABS, ToolsPanel, type ToolTab } from '@/components/tools/ToolsPanel';
import { SettingsScreen } from './SettingsScreen';
import { getDesign, TRAVEL_MODES } from '@/designs';
import { ModeSheet } from '@/components/profile/ModeSheet';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
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
  const [modeOpen, setModeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

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
              onMode={() => setModeOpen(true)}
              onProfile={() => setProfileOpen(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <BreathOverlay open={breath && journeying && !result} onDone={endBreath} />
      <SetupSheet open={setup} onClose={() => setSetup(false)} onStarted={onStarted} />
      <CassettePlayer open={music} onClose={() => setMusic(false)} />
      <ToolsPanel tab={tool} onTab={setTool} onClose={() => setTool(null)} />
      <SettingsScreen open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ModeSheet open={modeOpen} onClose={() => setModeOpen(false)} />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

function HomeIdle({ onFocus, onMusic, onSettings, onTool, onMode, onProfile }: { onFocus: () => void; onMusic: () => void; onSettings: () => void; onTool: (t: ToolTab) => void; onMode: () => void; onProfile: () => void }) {
  const { settings, sessions } = useApp();
  const mode = TRAVEL_MODES.find((m) => m.id === settings.timerDesign);
  // 日付が変わったら「今日」と連続日数を数え直す
  const today = dateKey(useNow(60_000));
  const sum = useMemo(() => summary(sessions), [sessions, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = useMemo(() => streaks(sessions), [sessions, today]); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <div className="relative mx-auto h-full max-w-xl">
      {/* 上部 */}
      <div className="flex items-center justify-between gap-2 px-5 pt-safe">
        <Pressable onClick={onMusic} aria-label="サウンド" className={`fabric-denim stitch mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full ${settings.bgmPlaying || settings.ambientPlaying ? 'text-sun' : ''}`}>
          <Music size={18} />
        </Pressable>
        {/* 旅のモード（登山 / 列車 / 航空） */}
        <Pressable onClick={onMode} aria-label={`旅のモード：${mode?.mode.name}`} className="fabric-denim stitch mt-1 flex h-11 items-center gap-1.5 rounded-full pl-3.5 pr-3 text-[14px] font-bold">
          {mode && <mode.Icon size={18} strokeWidth={2.1} />}
          {mode?.mode.name}
          <ChevronDown size={15} strokeWidth={2.6} className="opacity-80" />
        </Pressable>
        <div className="flex shrink-0 gap-2">
          <Pressable onClick={onProfile} aria-label="旅のパス" className="fabric-denim stitch mt-1 grid h-11 w-11 place-items-center rounded-full">
            <IdCard size={18} />
          </Pressable>
          <Pressable onClick={onSettings} aria-label="設定" className="fabric-denim stitch mt-1 grid h-11 w-11 place-items-center rounded-full">
            <Settings2 size={18} />
          </Pressable>
        </div>
      </div>

      {/* 挨拶 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springSoft} className="px-6 pt-5">
        {/* シーンの上なので、外観（ライト／ダーク）に関係なく白い文字 */}
        <h1 className="text-[30px] font-bold leading-tight tracking-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.35)]">
          やあ！{settings.userName}、
          <br />
          <span className="text-[21px] font-semibold text-white/95">前へ進む準備はいい？</span>
        </h1>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            { k: 'today', icon: <Clock3 size={13} strokeWidth={2.4} />, text: `今日 ${fmtDuration(sum.today, true)}` },
            { k: 'streak', icon: <Flame size={13} strokeWidth={2.4} />, text: `${st.current}日連続` },
          ].map((c) => (
            <span key={c.k} className="fabric-denim stitch tabular flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold">
              {c.icon}
              {c.text}
            </span>
          ))}
        </div>
      </motion.div>

      {/* サイドのツールタブ */}
      <motion.nav initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...springBouncy, delay: 0.15 }} className="fabric-denim stitch absolute right-3 top-[30%] flex flex-col gap-1 rounded-full p-1.5" aria-label="ツール">
        {TOOL_TABS.map(({ key, label, icon: Icon }) => (
          <Pressable key={key} scale={0.85} onClick={() => onTool(key)} aria-label={label} className="relative z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10">
            <Icon size={19} strokeWidth={2.2} />
          </Pressable>
        ))}
      </motion.nav>

      {/* 下部：集中ボタン */}
      <div className="absolute inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom)-6px,14px)+84px)] flex flex-col items-center px-6">
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
          className="absolute inset-0 rounded-full border border-white/50"
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
