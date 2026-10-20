import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from '@/store/AppStore';
import { TimerProvider, useTimer, type JourneyResult } from '@/store/TimerStore';
import { TrailStage, type TravelerMood } from '@/components/scene/stage/TrailStage';
import { TabBar, TABS, type TabKey } from '@/components/nav/TabBar';
import { IslandPlayer } from '@/components/nav/IslandPlayer';
import { StrayModal } from '@/components/trail/StrayModal';
import { SummitModal } from '@/components/routes/SummitModal';
import { CrayonDefs } from '@/components/ui/CrayonDefs';
import { HomeScreen } from '@/screens/HomeScreen';
import { TimelineScreen } from '@/screens/TimelineScreen';
import { RoutesScreen } from '@/screens/RoutesScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';
import { ambient } from '@/audio/ambient';
import { bgm } from '@/audio/bgm';
import { loadLibrary } from '@/audio/bgmLibrary';
import { useMultiRoom } from '@/hooks/useMultiRoom';
import { routeProgress, stageFor } from '@/lib/altitude';
import { hourFor } from '@/lib/scene';
import { MIN } from '@/lib/time';
import { useNow } from '@/hooks/useNow';
import { springBouncy, springSoft } from '@/lib/motion';

export default function App() {
  return (
    <AppProvider>
      <CrayonDefs />
      <Gate />
    </AppProvider>
  );
}

function Gate() {
  const { ready } = useApp();
  if (!ready) return <Splash />;
  return (
    <TimerProvider>
      <Shell />
    </TimerProvider>
  );
}

function Splash() {
  return (
    <div className="tex-denim grid h-full place-items-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div className="text-[40px]">⛺</div>
        <p className="mt-2 font-maru text-[13px] font-bold tracking-[0.2em] text-paper/60">FOCUS TRAIL</p>
      </motion.div>
    </div>
  );
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
    <div className="tex-denim fixed inset-0 overflow-hidden">
      <SceneLayer sleeping={!!result} companions={journeying && settings.style === 'multi' ? Math.min(2, peers.length) : 0} paused={!onHome} />
      {/* 他の画面ではデニムの布で覆う */}
      <motion.div
        className="tex-denim pointer-events-none absolute inset-0"
        animate={{ opacity: onHome ? 0 : 0.97 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      />

      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.main
          key={tab}
          custom={direction}
          variants={{
            enter: (d: number) => ({ opacity: 0, x: d * 36, scale: 0.985, filter: 'blur(6px)' }),
            center: { opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' },
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

/** 背景シーン：タイマー状態・時刻・季節から描画パラメータを決める */
function SceneLayer({ sleeping, companions, paused }: { sleeping: boolean; companions: number; paused: boolean }) {
  const { settings, subjectById, minutesBySubject } = useApp();
  const { timer, elapsedMs, stray } = useTimer();
  const now = useNow(60_000);
  const subject = subjectById(timer.subjectId ?? settings.selectedSubjectId);
  const live = (subject ? minutesBySubject[subject.id] ?? 0 : 0) + (timer.phase === 'focus' ? elapsedMs / MIN : 0);
  const stage = subject ? (subject.summitedAt ? 4 : stageFor(routeProgress(subject, live)).index) : 0;
  const mood: TravelerMood = sleeping ? 'sleep' : stray ? 'alert' : timer.phase === 'break' ? 'rest' : timer.phase === 'focus' && timer.running ? 'walk' : 'stand';
  const hour = sleeping ? 21.6 : hourFor(settings.sky, new Date(now));
  return (
    <div className="absolute inset-0">
      <TrailStage hour={hour} stage={stage} mood={mood} season={settings.season} companions={companions} paused={paused} />
    </div>
  );
}
