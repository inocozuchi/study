import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
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
import { getDesign, TRAVEL_MODES, type BookingPlan } from '@/designs';
import { ModeSheet } from '@/components/profile/ModeSheet';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { streaks, summary } from '@/lib/stats';
import { dateKey, fmtDuration } from '@/lib/time';
import { useNow } from '@/hooks/useNow';
import { easeIOS, springBouncy, springSoft } from '@/lib/motion';

interface Props {
  result: JourneyResult | null;
  setResult: (r: JourneyResult | null) => void;
}

export function HomeScreen({ result, setResult }: Props) {
  const { settings, updateSettings, ensureSubject } = useApp();
  const t = useTimer();
  const { timer } = t;
  const [setup, setSetup] = useState(false);
  const [breath, setBreath] = useState(false);
  const [music, setMusic] = useState(false);
  const [tool, setTool] = useState<ToolTab | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // 到着した直後（リザルトを受け取るまでの 1 回の描画）も旅の画面のままにする。
  // ここで一度ホームに戻ると、AnimatePresence（wait）が hud → home → result の速い切り替えで止まってしまう
  const journeying = timer.phase !== 'idle' || !!timer.journeyStartedAt || !!t.arrival;
  const design = getDesign(settings.timerDesign);

  const onStarted = useCallback(() => {
    if (settings.breathing) setBreath(true);
    if (settings.bgmOnFocus && !settings.bgmPlaying) updateSettings({ bgmPlaying: true });
  }, [settings.breathing, settings.bgmOnFocus, settings.bgmPlaying, updateSettings]);
  const endBreath = useCallback(() => setBreath(false), []);

  // 予約の画面（列車・航空）から出発：科目を用意し、設定を保存して旅を始める。
  // 出発の儀式（改札・搭乗）が深呼吸の代わりなので、深呼吸は挟まない
  const departFromBooking = (plan: BookingPlan) => {
    const subject = ensureSubject(plan.task, plan.icon);
    updateSettings({ ...plan.settings, bookingStep: plan.step, bookingMinutes: plan.minutes });
    const pomodoro = plan.step === 'pomodoro';
    t.startJourney({
      subjectId: subject.id,
      mode: pomodoro ? 'pomodoro' : 'countdown',
      minutes: pomodoro ? Math.min(25, plan.minutes) : plan.minutes,
      journeyMinutes: plan.minutes,
      booking: { ...plan.booking, bookedAt: Date.now() },
    });
    if (settings.bgmOnFocus && !settings.bgmPlaying) updateSettings({ bgmPlaying: true });
    setSetup(false);
  };

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
      {design.Booking ? (
        <design.Booking open={setup} onClose={() => setSetup(false)} onStart={departFromBooking} />
      ) : (
        <SetupSheet open={setup} onClose={() => setSetup(false)} onStarted={onStarted} />
      )}
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
      <div className="relative flex items-center justify-between gap-2 px-5 pt-safe">
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
        <h1 className="text-[30px] font-bold leading-tight tracking-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55),0_2px_14px_rgba(0,0,0,0.45)]">
          やあ！{settings.userName}、
          <br />
          <span className="text-[21px] font-semibold text-white/95">前へ進む準備はいい？</span>
        </h1>
      </motion.div>

      {/* サイドのツールタブ */}
      <motion.nav initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...springBouncy, delay: 0.15 }} className="fabric-denim stitch absolute right-3 top-[30%] flex flex-col gap-1 rounded-full p-1.5" aria-label="ツール">
        {TOOL_TABS.map(({ key, label, icon: Icon }) => (
          <Pressable key={key} scale={0.85} onClick={() => onTool(key)} aria-label={label} className="relative z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10">
            <Icon size={19} strokeWidth={2.2} />
          </Pressable>
        ))}
      </motion.nav>

      {/* 下部：今日の記録と集中ボタン（記録のバッジは上の挨拶から下へ。シーンの駅名標や窓枠と重ならない） */}
      <div className="absolute inset-x-0 bottom-[calc(var(--nav-space)+24px)] flex flex-col items-center px-6">
        <div className="mb-6 flex flex-wrap justify-center gap-1.5">
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
        <FocusButton onClick={onFocus} />
      </div>
    </div>
  );
}

/**
 * 大きな「集中」ボタン：白いグラデーションの円。まわりの光の輪と淡い光が、静かに呼吸するように脈打つ（CSS のアニメーション）。
 * 押すと光が画面いっぱいにふわっと広がり、その上へ予約の画面（または支度シート）がせり上がる。
 */
function FocusButton({ onClick }: { onClick: () => void }) {
  const [bloom, setBloom] = useState<{ x: number; y: number; r: number; k: number } | null>(null);
  const press = (e: MouseEvent<HTMLButtonElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    const x = b.left + b.width / 2;
    const y = b.top + b.height / 2;
    setBloom({ x, y, r: b.width / 2, k: Date.now() });
    onClick();
  };
  return (
    <div className="focus-breath relative grid h-[124px] w-[124px] place-items-center">
      <span className="focus-glow pointer-events-none absolute -inset-6 rounded-full" aria-hidden />
      <span className="focus-ring pointer-events-none absolute inset-0 rounded-full border border-white/55" aria-hidden />
      <span className="focus-ring focus-ring-2 pointer-events-none absolute inset-0 rounded-full border border-white/55" aria-hidden />
      <motion.button
        onClick={press}
        aria-label="集中する"
        className="relative grid h-full w-full place-items-center rounded-full text-night-950"
        style={{ background: 'linear-gradient(160deg, #ffffff, #dfe9f7)', boxShadow: '0 18px 44px -12px rgba(142,197,255,0.65), inset 0 1px 0 rgba(255,255,255,0.9)' }}
      >
        <span className="text-[26px] font-bold tracking-[0.12em]">集中</span>
      </motion.button>
      <AnimatePresence>
        {bloom && (
          <motion.span
            key={bloom.k}
            className="pointer-events-none fixed z-[60] rounded-full"
            style={{
              left: bloom.x - bloom.r,
              top: bloom.y - bloom.r,
              width: bloom.r * 2,
              height: bloom.r * 2,
              background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(223,233,247,0.85) 45%, rgba(142,197,255,0) 72%)',
              willChange: 'transform, opacity',
            }}
            initial={{ scale: 1, opacity: 0.9 }}
            // 画面の対角線まで届く大きさへ
            animate={{ scale: (Math.hypot(innerWidth, innerHeight) / bloom.r) * 1.1, opacity: 0 }}
            transition={{ duration: 0.75, ease: easeIOS }}
            onAnimationComplete={() => setBloom(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
