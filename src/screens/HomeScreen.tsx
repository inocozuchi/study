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
import type { HomeSkin } from '@/designs/types';
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
    // 登山は入山の前に深呼吸（列車・航空は改札・搭乗の儀式が深呼吸の代わり）
    if (design.id === 'mountain' && settings.breathing) setBreath(true);
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
  const skin = getDesign(settings.timerDesign).home;
  // 日付が変わったら「今日」と連続日数を数え直す
  const today = dateKey(useNow(60_000));
  const sum = useMemo(() => summary(sessions), [sessions, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = useMemo(() => streaks(sessions), [sessions, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const playing = settings.bgmPlaying || settings.ambientPlaying;

  return (
    <div className="relative mx-auto h-full max-w-xl">
      {/*
        上のセーフゾーン：ヘッダーと挨拶の後ろだけ、モードの色でうすく塗る（シーンの主役＝窓の中・駅名標・ハイカーと文字を分ける）。
        挨拶は 1 行。列車では窓枠の上の木目のパネルの高さに収まる
      */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[calc(var(--safe-top)+104px)]" style={{ background: skin.scrim }} aria-hidden />

      {/* ヘッダー：左にサウンド、真ん中に旅のモード、右に旅のパスと設定（すべて 42px） */}
      <div className="screen-header relative [grid-template-columns:92px_minmax(0,1fr)_92px]">
        <Pressable onClick={onMusic} aria-label="サウンド" className={`btn-icon ${skin.chip} ${playing ? 'ring-2 ring-[#FF9F0A]/70' : ''}`}>
          <Music />
        </Pressable>
        {/* 旅のモード（登山 / 列車 / 航空） */}
        <div className="flex justify-center">
          <Pressable onClick={onMode} aria-label={`旅のモード：${mode?.mode.name}`} className={`flex h-[42px] items-center gap-1.5 rounded-full pl-3.5 pr-3 text-[14px] font-bold ${skin.chip}`}>
            {mode && <mode.Icon size={18} strokeWidth={2.1} />}
            {mode?.mode.name}
            <ChevronDown size={15} strokeWidth={2.6} className="opacity-70" />
          </Pressable>
        </div>
        <div className="flex justify-end gap-2">
          <Pressable onClick={onProfile} aria-label="旅のパス" className={`btn-icon ${skin.chip}`}>
            <IdCard />
          </Pressable>
          <Pressable onClick={onSettings} aria-label="設定" className={`btn-icon ${skin.chip}`}>
            <Settings2 />
          </Pressable>
        </div>
      </div>

      {/* 挨拶（1 行。ヘッダーの左端にそろえる） */}
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={springSoft} className={`relative mt-2.5 truncate px-5 text-[19px] font-bold leading-tight tracking-tight ${skin.greeting}`}>
        やあ！{settings.userName}、<span className="text-[15px] font-semibold opacity-90">前へ進む準備はいい？</span>
      </motion.h1>

      {/* サイドのツールタブ（窓の外・景色の端に） */}
      <motion.nav initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...springBouncy, delay: 0.15 }} className={`absolute right-3 top-[30%] flex flex-col gap-1 rounded-full p-1 ${skin.chip}`} aria-label="ツール">
        {TOOL_TABS.map(({ key, label, icon: Icon }) => (
          <Pressable key={key} onClick={() => onTool(key)} aria-label={label} className="btn-icon">
            <Icon strokeWidth={2.2} />
          </Pressable>
        ))}
      </motion.nav>

      {/* 下：タブバーのすぐ上。真ん中に「集中」、左右に今日の記録（シーンの主役＝テーブルの上の小物などに重ねない） */}
      <div className="absolute inset-x-0 bottom-[calc(var(--nav-space)+16px)] grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5">
        <span className={`tabular flex h-[32px] items-center gap-1.5 justify-self-start rounded-full px-3 text-[12px] font-bold ${skin.chip}`}>
          <Clock3 size={13} strokeWidth={2.4} />
          今日 {fmtDuration(sum.today, true)}
        </span>
        <FocusButton Skin={skin.Focus} bloom={skin.bloom} onClick={onFocus} />
        <span className={`tabular flex h-[32px] items-center gap-1.5 justify-self-end rounded-full px-3 text-[12px] font-bold ${skin.chip}`}>
          <Flame size={13} strokeWidth={2.4} />
          {st.current}日連続
        </span>
      </div>
    </div>
  );
}

/**
 * 「集中」ボタン：見た目はモードの着せ替え（skin.Focus。直径 80px）。
 * 押すとモードの色の光が画面いっぱいにふわっと広がり、その上へ予約の画面がせり上がる。
 */
function FocusButton({ Skin, bloom: color, onClick }: { Skin: HomeSkin['Focus']; bloom: string; onClick: () => void }) {
  const [bloom, setBloom] = useState<{ x: number; y: number; r: number; k: number } | null>(null);
  const press = (e: MouseEvent<HTMLButtonElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    setBloom({ x: b.left + b.width / 2, y: b.top + b.height / 2, r: b.width / 2, k: Date.now() });
    onClick();
  };
  return (
    <div className="relative">
      <Skin onClick={press} />
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
              background: `radial-gradient(circle, ${color} 0%, ${color.replace(/[\d.]+\)$/, '0.45)')} 45%, transparent 72%)`,
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
