import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { AppProvider, useApp } from '@/store/AppStore';
import { TimerProvider, useTimer, type JourneyResult } from '@/store/TimerStore';
import { TabBar, TABS, type TabKey } from '@/components/nav/TabBar';
import { IslandPlayer } from '@/components/nav/IslandPlayer';
import { StrayModal } from '@/components/trail/StrayModal';
import { SummitModal } from '@/components/routes/SummitModal';
import { HomeScreen } from '@/screens/HomeScreen';
// ホーム以外の画面は起動時に読み込まない（起動を軽くする）。起動後、手が空いたときに先読みする
const loadTimeline = () => import('@/screens/TimelineScreen');
const loadRoutes = () => import('@/screens/RoutesScreen');
const loadInsights = () => import('@/screens/InsightsScreen');
const TimelineScreen = lazy(() => loadTimeline().then((m) => ({ default: m.TimelineScreen })));
const RoutesScreen = lazy(() => loadRoutes().then((m) => ({ default: m.RoutesScreen })));
const InsightsScreen = lazy(() => loadInsights().then((m) => ({ default: m.InsightsScreen })));
import { ambient } from '@/audio/ambient';
import { bgm } from '@/audio/bgm';
import { loadLibrary } from '@/audio/bgmLibrary';
import { ambientFiles } from '@/audio/ambientFiles';
import { loadAmbientLibrary } from '@/audio/ambientLibrary';
import { hourFor } from '@/lib/scene';
import { getDesign } from '@/designs';
import { hideBoot } from '@/lib/boot';
import { applyFont } from '@/lib/fonts';
import { useNow } from '@/hooks/useNow';
import { springSoft } from '@/lib/motion';

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
  const { settings } = useApp();
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

  // BGM ライブラリ（public/bgm/tracks.json）と、ほかの画面の先読み
  useEffect(() => {
    void loadLibrary();
    void loadAmbientLibrary();
    const id = setTimeout(() => {
      void loadTimeline();
      void loadRoutes();
      void loadInsights();
    }, 2500);
    return () => clearTimeout(id);
  }, []);

  // 音の同期（環境音・BGM）
  useEffect(() => ambient.setMix(settings.ambient), [settings.ambient]);
  useEffect(() => ambient.setPlaying(settings.ambientPlaying), [settings.ambientPlaying]);
  useEffect(() => ambientFiles.set(settings.ambientFiles, settings.ambientPlaying), [settings.ambientFiles, settings.ambientPlaying]);
  useEffect(() => bgm.setVolume(settings.bgmVolume), [settings.bgmVolume]);
  useEffect(() => bgm.setTrack(settings.bgmTrackId), [settings.bgmTrackId]);
  useEffect(() => bgm.setPlaying(settings.bgmPlaying), [settings.bgmPlaying]);

  const journeying = timer.phase !== 'idle' || !!timer.journeyStartedAt;
  const onHome = tab === 'trail';
  const immersive = onHome && (journeying || !!result);
  // 上までスクロールしているときはステータスバーの下をぼかさない
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => setScrolled(false), [tab]);

  return (
    <div className="app-frame overflow-hidden bg-night-950">
      <SceneLayer ended={!!result} paused={!onHome} />
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
            // 画面全体に filter（blur）をかけると重く、ガラスのぼかしも効かなくなるので、位置と透明度だけで切り替える
            enter: (d: number) => ({ opacity: 0, x: d * 36 }),
            center: { opacity: 1, x: 0 },
            exit: (d: number) => ({ opacity: 0, x: d * -36 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={springSoft}
          onScroll={(e) => {
            const v = e.currentTarget.scrollTop > 4;
            if (v !== scrolled) setScrolled(v);
          }}
          className={`absolute inset-0 ${onHome ? 'overflow-hidden' : 'no-scrollbar overflow-y-auto overscroll-contain'}`}
        >
          {tab === 'trail' && <HomeScreen result={result} setResult={setResult} />}
          <Suspense fallback={null}>
            {tab === 'timeline' && <TimelineScreen onStartFocus={() => setTab('trail')} />}
            {tab === 'routes' && <RoutesScreen />}
            {tab === 'insights' && <InsightsScreen />}
          </Suspense>
        </motion.main>
      </AnimatePresence>

      {/* ステータスバーの下：スクロールして中身が下に潜ったときだけぼかす */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[env(safe-area-inset-top)] border-b border-white/[0.06] bg-night-950/55 backdrop-blur-xl transition-opacity duration-200"
        style={{ opacity: scrolled && !onHome ? 1 : 0 }}
      />

      <AnimatePresence>
        {!immersive && (
          <motion.div
            className="absolute inset-x-0 bottom-0 z-40"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springSoft}
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-center">
              <div className="pointer-events-auto">
                <IslandPlayer visible={!onHome} onOpen={() => setTab('trail')} />
              </div>
            </div>
            <TabBar tab={tab} onChange={setTab} />
          </motion.div>
        )}
      </AnimatePresence>

      <StrayModal />
      <SummitModal />
    </div>
  );
}

/** 背景シーン：選択中のタイマーデザインに描画を任せる */
function SceneLayer({ ended, paused }: { ended: boolean; paused: boolean }) {
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
      <Scene hour={hour} ended={ended} paused={paused} />
    </div>
  );
}
