import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { AppProvider, useApp } from '@/store/AppStore';
import { TimerProvider, useTimer, type JourneyResult } from '@/store/TimerStore';
import { TabBar, TABS, type TabKey } from '@/components/nav/TabBar';
import { IslandPlayer } from '@/components/nav/IslandPlayer';
import { StrayModal } from '@/components/trail/StrayModal';
import { SummitModal } from '@/components/routes/SummitModal';
import { HomeScreen } from '@/screens/HomeScreen';
import { TimelineScreen } from '@/screens/TimelineScreen';
import { RoutesScreen } from '@/screens/RoutesScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';
import { ambient } from '@/audio/ambient';
import { bgm } from '@/audio/bgm';
import { loadLibrary } from '@/audio/bgmLibrary';
import { useMultiRoom } from '@/hooks/useMultiRoom';
import { hourFor } from '@/lib/scene';
import { getDesign } from '@/designs';
import { hideBoot } from '@/lib/boot';
import { applyFont } from '@/lib/fonts';
import { useNow } from '@/hooks/useNow';
import { springBouncy, springSoft } from '@/lib/motion';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <Gate />
      </AppProvider>
    </MotionConfig>
  );
}

function Gate() {
  const { ready, settings, epoch } = useApp();
  useEffect(() => {
    if (ready) hideBoot();
  }, [ready]);
  const font = ready ? settings.font : undefined;
  useEffect(() => {
    if (font) applyFont(font);
  }, [font]);
  if (!ready) return <Splash />;
  return (
    <TimerProvider key={epoch}>
      <Shell />
    </TimerProvider>
  );
}

/** データの読み込み中。見た目は index.html の起動画面（#boot）が担うので、ここは同じ背景だけ */
function Splash() {
  return <div className="h-full bg-night-950" />;
}

const TAB_KEY = 'focus-trail:tab';

function Shell() {
  const { settings, subjectById } = useApp();
  const { timer } = useTimer();
  const [tab, setTabState] = useState<TabKey>(() => {
    try {
      return (sessionStorage.getItem(TAB_KEY) as TabKey) || 'trail';
    } catch {
      return 'trail';
    }
  });
  const [result, setResult] = useState<JourneyResult | null>(null);
  const prevIndex = useRef(TABS.findIndex((t) => t.key === tab));
  const index = TABS.findIndex((t) => t.key === tab);
  const direction = index >= prevIndex.current ? 1 : -1;

  const setTab = (t: TabKey) => {
    prevIndex.current = TABS.findIndex((x) => x.key === tab);
    setTabState(t);
    try {
      sessionStorage.setItem(TAB_KEY, t);
    } catch {
      /* noop */
    }
  };

  // BGM ライブラリ（public/bgm/tracks.json）
  useEffect(() => {
    void loadLibrary();
  }, []);

  // 音の同期（環境音・BGM）
  useEffect(() => ambient.setMix(settings.ambient), [settings.ambient]);
  useEffect(() => ambient.setPlaying(settings.ambientPlaying), [settings.ambientPlaying]);
  useEffect(() => bgm.setVolume(settings.bgmVolume), [settings.bgmVolume]);
  useEffect(() => bgm.setTrack(settings.bgmTrack), [settings.bgmTrack]);
  useEffect(() => bgm.setPlaying(settings.bgmPlaying), [settings.bgmPlaying]);

  // マルチ：同じ部屋の仲間
  const journeying = timer.phase !== 'idle' || !!timer.journeyStartedAt;
  const { peers } = useMultiRoom(settings.style === 'multi', settings.roomCode, {
    name: settings.userName,
    status: timer.phase,
    subject: subjectById(timer.subjectId)?.name,
    since: timer.sessionStartedAt ?? timer.journeyStartedAt ?? 0,
  });

  const onHome = tab === 'trail';
  const immersive = onHome && (journeying || !!result);

  return (
    <div className="fixed inset-0 overflow-hidden bg-night-950">
      <SceneLayer ended={!!result} companions={journeying && settings.style === 'multi' ? Math.min(2, peers.length) : 0} paused={!onHome} />
      {/* タイマー以外の画面ではシーンを暗く沈める */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(7,11,23,0.82) 0%, rgba(7,11,23,0.9) 45%, rgba(7,11,23,0.95) 100%)' }}
        animate={{ opacity: onHome ? 0 : 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />

      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.main
          key={tab}
          custom={direction}
          variants={{
            enter: (d: number) => ({ opacity: 0, x: d * 36, scale: 0.985, filter: 'blur(6px)' }),
            // 終わったら filter を外す（残っているとガラスの backdrop-filter が効かなくなる）
            center: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
            exit: (d: number) => ({ opacity: 0, x: d * -36, scale: 0.985, filter: 'blur(6px)' }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ ...springSoft, filter: { duration: 0.28, ease: 'easeOut' } }}
          className={`absolute inset-0 ${onHome ? 'overflow-hidden' : 'no-scrollbar overflow-y-auto overscroll-contain'}`}
        >
          {tab === 'trail' && <HomeScreen result={result} setResult={setResult} peers={peers} />}
          {tab === 'timeline' && <TimelineScreen onStartFocus={() => setTab('trail')} />}
          {tab === 'routes' && <RoutesScreen />}
          {tab === 'insights' && <InsightsScreen />}
        </motion.main>
      </AnimatePresence>

      <AnimatePresence>
        {!immersive && (
          <motion.div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-safe"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={springBouncy}
          >
            <div className="pointer-events-auto">
              <IslandPlayer visible={!onHome} onOpen={() => setTab('trail')} />
              <TabBar tab={tab} onChange={setTab} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <StrayModal />
      <SummitModal />
    </div>
  );
}

/** 背景シーン：選択中のタイマーデザインに描画を任せる */
function SceneLayer({ ended, companions, paused }: { ended: boolean; companions: number; paused: boolean }) {
  const { settings } = useApp();
  const { timer, elapsedMs } = useTimer();
  const now = useNow(60_000);
  const { Scene } = getDesign(settings.timerDesign);
  const hour = hourFor(settings.sky, new Date(now), {
    phase: timer.phase,
    elapsedMs,
    targetMs: timer.targetMs,
    freeSpanMs: settings.pomodoroFocus * 60_000,
  });
  return (
    <div className="absolute inset-0">
      <Scene hour={hour} ended={ended} companions={companions} paused={paused} />
    </div>
  );
}
