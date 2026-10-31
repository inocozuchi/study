import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Clock3, Flame, IdCard, Music, Play, Waypoints } from 'lucide-react';
import { MemoMap } from '@/components/memo/MemoMap';
import { useApp } from '@/store/AppStore';
import { useTimer, type JourneyResult } from '@/store/TimerStore';
import { Pressable } from '@/components/ui/Pressable';
import { SetupSheet } from '@/components/home/SetupSheet';
import { BreathOverlay } from '@/components/focus/BreathOverlay';
import { CassettePlayer } from '@/components/audio/CassettePlayer';
import { TOOL_TABS, ToolsPanel, type ToolTab } from '@/components/tools/ToolsPanel';
import { getDesign, TRAVEL_MODES, type BookingPlan } from '@/designs';
import type { HomeSkin } from '@/designs/types';
import { ModeSheet } from '@/components/profile/ModeSheet';
import { ProfileSheet } from '@/components/profile/ProfileSheet';
import { streaks, summary } from '@/lib/stats';
import { dateKey, fmtClock, fmtDuration } from '@/lib/time';
import { useNow } from '@/hooks/useNow';
import { easeIOS, springBouncy, springSoft } from '@/lib/motion';

interface Props {
  result: JourneyResult | null;
  setResult: (r: JourneyResult | null) => void;
  /** インサイトのタブへ（今日の記録のバッジ） */
  onInsights?: () => void;
}

export function HomeScreen({ result, setResult, onInsights }: Props) {
  const { settings, updateSettings, ensureSubject } = useApp();
  const t = useTimer();
  const { timer } = t;
  const [setup, setSetup] = useState(false);
  const [breath, setBreath] = useState(false);
  const [music, setMusic] = useState(false);
  const [tool, setTool] = useState<ToolTab | null>(null);
  const [modeOpen, setModeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

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
              onTool={setTool}
              onMap={() => setMapOpen(true)}
              onMode={() => setModeOpen(true)}
              onProfile={() => setProfileOpen(true)}
              onInsights={onInsights}
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
      <ModeSheet open={modeOpen} onClose={() => setModeOpen(false)} />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <MemoMap open={mapOpen} onClose={() => setMapOpen(false)} />
    </div>
  );
}

function HomeIdle({ onFocus, onMusic, onTool, onMap, onMode, onProfile, onInsights }: { onFocus: () => void; onMusic: () => void; onTool: (t: ToolTab) => void; onMap: () => void; onMode: () => void; onProfile: () => void; onInsights?: () => void }) {
  const { settings, sessions, plans, subjectById } = useApp();
  const { startPlanned } = useTimer();
  const mode = TRAVEL_MODES.find((m) => m.id === settings.timerDesign);
  const skin = getDesign(settings.timerDesign).home;
  // 日付が変わったら「今日」と連続日数を数え直す
  const nowMs = useNow(60_000);
  const today = dateKey(nowMs);
  const sum = useMemo(() => summary(sessions), [sessions, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = useMemo(() => streaks(sessions), [sessions, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const playing = settings.bgmPlaying || settings.ambientPlaying;
  // 今日の目標（分）に対する進み具合
  const goal = settings.dailyGoalMin;
  const ratio = goal > 0 ? Math.min(1, sum.today / goal) : 0;
  // 次の予定（今日、まだ終わっていないもののうち いちばん早いもの）。押すとその予定で出発
  const nowMin = new Date(nowMs).getHours() * 60 + new Date(nowMs).getMinutes();
  const next = useMemo(
    () => plans.filter((p) => p.date === today && p.endMin > nowMin && subjectById(p.subjectId)).sort((x, y) => x.startMin - y.startMin)[0],
    [plans, today, nowMin, subjectById],
  );
  const nextSubject = next ? subjectById(next.subjectId) : undefined;

  return (
    <div className="relative mx-auto h-full max-w-xl">

      {/* ヘッダー：左にサウンド、真ん中に旅のモード、右に旅のパス（すべて 42px）。設定はタブバーのいちばん右 */}
      <div className="screen-header relative">
        <Pressable onClick={onMusic} aria-label="サウンド" className={`btn-icon ${skin.chip} ${playing ? 'ring-2 ring-[#FF9F0A]/70' : ''}`}>
          <Music />
        </Pressable>
        {/* 旅のモード（登山 / 列車 / 航空） */}
        <div className="flex justify-center">
          <Pressable onClick={onMode} aria-label={`旅のモード：${mode?.mode.name}`} className={`flex h-[42px] items-center gap-1.5 rounded-full pl-3.5 pr-3 text-[13px] font-bold ${skin.chip}`}>
            {mode && <mode.Icon size={18} strokeWidth={2.1} />}
            {mode?.mode.name}
            <ChevronDown size={15} strokeWidth={2.6} className="opacity-70" />
          </Pressable>
        </div>
        <Pressable onClick={onProfile} aria-label="旅のパス" className={`btn-icon ${skin.chip}`}>
          <IdCard />
        </Pressable>
      </div>

      {/* 挨拶と次の予定：シーンの上でもくっきり読めるよう、着せ替えの面（不透明に近い塗り）に載せる。光彩・ぼかしの影は使わない */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={springSoft} className="relative mt-3 flex flex-col items-start gap-2 px-5">
        <h1 className={`max-w-full truncate rounded-full px-3.5 py-1.5 text-[14px] font-bold leading-tight ${skin.chip} ${skin.greeting}`}>
          やあ！{settings.userName}、<span className="font-semibold opacity-80">前へ進む準備はいい？</span>
        </h1>
        {next && nextSubject && (
          <Pressable
            onClick={() => startPlanned(nextSubject.id, next.endMin - next.startMin)}
            aria-label={`次の予定で出発：${fmtClock(next.startMin)} ${next.title || nextSubject.name}`}
            className={`flex max-w-full items-center gap-2 rounded-full py-1.5 pl-2 pr-3 text-[12.5px] font-bold ${skin.chip}`}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: nextSubject.color }} />
            <span className="tabular shrink-0">{next.startMin <= nowMin ? 'いま' : fmtClock(next.startMin)}</span>
            <span className="min-w-0 truncate">{next.title || nextSubject.name} · {fmtDuration(next.endMin - next.startMin)}</span>
            <Play size={12} fill="currentColor" className="shrink-0 opacity-80" />
          </Pressable>
        )}
      </motion.div>

      {/* サイドのツールタブ（窓の外・景色の端に） */}
      <motion.nav initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...springBouncy, delay: 0.15 }} className={`absolute right-3 top-[30%] flex flex-col gap-1 rounded-full p-1 ${skin.chip}`} aria-label="ツール">
        {/* 思考マップ（グラフのメモ。全画面で開く） */}
        <Pressable onClick={onMap} aria-label="思考マップ" className="btn-icon">
          <Waypoints strokeWidth={2.2} />
        </Pressable>
        {TOOL_TABS.map(({ key, label, icon: Icon }) => (
          <Pressable key={key} onClick={() => onTool(key)} aria-label={label} className="btn-icon">
            <Icon strokeWidth={2.2} />
          </Pressable>
        ))}
      </motion.nav>

      {/* 下：タブバーのすぐ上。真ん中に「集中」、左右に今日の記録（目標までの輪）と連続日数。押すとインサイトへ */}
      <div className="absolute inset-x-0 bottom-[calc(var(--nav-space)+16px)] grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5">
        <Pressable onClick={onInsights} aria-label={`今日の集中 ${fmtDuration(sum.today, true)}${goal > 0 ? `（目標 ${fmtDuration(goal, true)}）` : ''}`} className={`tabular flex h-[34px] items-center gap-1.5 justify-self-start whitespace-nowrap rounded-full pl-1.5 pr-3 text-[12px] font-bold ${skin.chip}`}>
          {goal > 0 ? <GoalRing ratio={ratio} /> : <Clock3 size={13} strokeWidth={2.4} className="ml-1" />}
          {goal > 0 ? (
            <span>
              {fmtDuration(sum.today, true)}
              <span className="font-semibold opacity-60">/{fmtDuration(goal, true)}</span>
            </span>
          ) : (
            <span>今日 {fmtDuration(sum.today, true)}</span>
          )}
        </Pressable>
        <FocusButton Skin={skin.Focus} bloom={skin.bloom} onClick={onFocus} />
        <Pressable onClick={onInsights} aria-label={`${st.current}日連続`} className={`tabular flex h-[34px] items-center gap-1.5 justify-self-end whitespace-nowrap rounded-full px-3 text-[12px] font-bold ${skin.chip}`}>
          <Flame size={13} strokeWidth={2.4} />
          {st.current}日連続
        </Pressable>
      </div>
    </div>
  );
}

/** 今日の目標までの小さな輪（バッジの中） */
function GoalRing({ ratio }: { ratio: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0 -rotate-90" aria-hidden>
      <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth="3" />
      <circle cx="12" cy="12" r={r} fill="none" stroke={ratio >= 1 ? '#34C759' : 'currentColor'} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${c * ratio} ${c}`} />
    </svg>
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
