import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from '@/store/AppStore';
import { TimerProvider, useTimer } from '@/store/TimerStore';
import { TrailStage, type TravelerMood } from '@/components/scene/stage/TrailStage';
import { TabBar, TABS, type TabKey } from '@/components/nav/TabBar';
import { IslandPlayer } from '@/components/nav/IslandPlayer';
import { StrayModal } from '@/components/trail/StrayModal';
import { SummitModal } from '@/components/routes/SummitModal';
import { TrailScreen } from '@/screens/TrailScreen';
import { TimelineScreen } from '@/screens/TimelineScreen';
import { RoutesScreen } from '@/screens/RoutesScreen';
import { InsightsScreen } from '@/screens/InsightsScreen';
import { ambient } from '@/audio/ambient';
import { routeProgress, stageFor } from '@/lib/altitude';
import { hourFor } from '@/lib/scene';
import { MIN } from '@/lib/time';
import { useNow } from '@/hooks/useNow';
import { springSoft } from '@/lib/motion';

export default function App() {
  return (
    <AppProvider>
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
    <div className="grid h-full place-items-center bg-night-950">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div className="text-[40px]">⛰️</div>
        <p className="mt-2 text-[13px] font-semibold tracking-[0.2em] text-white/50">FOCUS TRAIL</p>
      </motion.div>
    </div>
  );
}

const TAB_KEY = 'focus-trail:tab';

function Shell() {
  const { settings } = useApp();
  const [tab, setTabState] = useState<TabKey>(() => {
    try {
      return (sessionStorage.getItem(TAB_KEY) as TabKey) || 'trail';
    } catch {
      return 'trail';
    }
  });
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

  // 環境音エンジンと設定の同期
  useEffect(() => {
    ambient.setMix(settings.ambient);
  }, [settings.ambient]);
  useEffect(() => {
    ambient.setPlaying(settings.ambientPlaying);
  }, [settings.ambientPlaying]);

  const onTrail = tab === 'trail';

  return (
    <div className="fixed inset-0 overflow-hidden bg-night-950">
      <SceneLayer />
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(7,11,23,0.72) 0%, rgba(7,11,23,0.82) 45%, rgba(7,11,23,0.9) 100%)' }}
        animate={{ opacity: onTrail ? 0 : 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
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
          className={`absolute inset-0 ${onTrail ? 'overflow-hidden' : 'no-scrollbar overflow-y-auto overscroll-contain'}`}
        >
          {tab === 'trail' && <TrailScreen />}
          {tab === 'timeline' && <TimelineScreen onStartFocus={() => setTab('trail')} />}
          {tab === 'routes' && <RoutesScreen />}
          {tab === 'insights' && <InsightsScreen />}
        </motion.main>
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-safe">
        <div className="pointer-events-auto">
          <IslandPlayer visible={!onTrail} onOpen={() => setTab('trail')} />
          <TabBar tab={tab} onChange={setTab} />
        </div>
      </div>

      <StrayModal />
      <SummitModal />
    </div>
  );
}

/** 背景シーン：選択中ルートの進捗・タイマー状態・時刻から描画パラメータを決める */
function SceneLayer() {
  const { settings, subjectById, minutesBySubject } = useApp();
  const { timer, elapsedMs, stray } = useTimer();
  const now = useNow(60_000);
  const subject = subjectById(timer.subjectId ?? settings.selectedSubjectId);
  const live = (subject ? minutesBySubject[subject.id] ?? 0 : 0) + (timer.phase === 'focus' ? elapsedMs / MIN : 0);
  const stage = subject ? (subject.summitedAt ? 4 : stageFor(routeProgress(subject, live)).index) : 0;
  const mood: TravelerMood = stray ? 'alert' : timer.phase === 'break' ? 'rest' : timer.phase === 'focus' && timer.running ? 'walk' : 'stand';
  return (
    <div className="absolute inset-0">
      <TrailStage hour={hourFor(settings.sky, new Date(now))} stage={stage} mood={mood} />
    </div>
  );
}
