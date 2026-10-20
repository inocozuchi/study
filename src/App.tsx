import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { AppProvider, useApp } from '@/store/AppStore';
import { TimerProvider, useTimer, type JourneyResult } from '@/store/TimerStore';
import { TabBar, TABS, type TabKey } from '@/components/nav/TabBar';
import { IslandPlayer } from '@/components/nav/IslandPlayer';
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
import { applyAppearance, setEdgeColors } from '@/lib/theme';
import { useSceneHeld } from '@/lib/sceneHold';
import { useNow } from '@/hooks/useNow';
import { springSoft } from '@/lib/motion';
import { chromeFor } from '@/lib/chrome';
import { LayoutProbe } from '@/components/debug/LayoutProbe';

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
  const appearance = ready ? settings.appearance : undefined;
  useEffect(() => {
    if (appearance) applyAppearance(appearance);
  }, [appearance]);
  if (!ready) return <Splash />;
  return (
    <TimerProvider key={epoch}>
      <Shell />
    </TimerProvider>
  );
}

/** データの読み込み中。見た目は index.html の起動画面（#boot）が担うので、ここは同じ背景だけ */
function Splash() {
  return <div className="h-full bg-page" />;
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
  const sceneHeld = useSceneHeld();
  const immersive = onHome && (journeying || !!result);
  // 画面ごとの枠（全画面のシーン・時刻の帯の下・タブバー）は lib/chrome.ts の表で決める
  const chrome = chromeFor({ home: onHome, immersive });
  const sceneShown = chrome.fullscreen && !sceneHeld;

  return (
    <div className="app-frame overflow-hidden bg-page" data-probe="root">
      {/* 背景の層：全画面の画面でだけシーンを見せる。ほかの画面では止めて隠す（地の色の上にカードを並べる） */}
      <div className="absolute inset-0" style={{ visibility: sceneShown ? 'visible' : 'hidden' }} data-probe={sceneShown ? 'scene' : undefined}>
        <SceneLayer ended={!!result} paused={!sceneShown} />
      </div>

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
          layoutScroll
          className={`absolute inset-0 ${chrome.fullscreen ? 'overflow-hidden' : 'no-scrollbar overflow-y-auto overscroll-contain'}`}
        >
          {tab === 'trail' && <HomeScreen result={result} setResult={setResult} />}
          <Suspense fallback={null}>
            {tab === 'timeline' && <TimelineScreen onStartFocus={() => setTab('trail')} />}
            {tab === 'routes' && <RoutesScreen />}
            {tab === 'insights' && <InsightsScreen />}
          </Suspense>
        </motion.main>
      </AnimatePresence>

      {/* タブバー：画面の最下部に固定。集中中は画面の外へ隠し、シーンを一番下まで見せる */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-[transform,opacity] duration-300 ease-out ${chrome.bottomNav ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'}`}
        aria-hidden={!chrome.bottomNav}
        data-probe="nav"
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-center pb-2">
          <div className="pointer-events-auto">
            <IslandPlayer visible={!onHome && !immersive} onOpen={() => setTab('trail')} />
          </div>
        </div>
        <TabBar tab={tab} onChange={setTab} />
      </div>

      {/* 時刻の帯の下に敷くもの（全画面のシーンでは何も敷かない） */}
      <div className="status-band z-[80]" data-area={chrome.statusArea} data-probe="status" aria-hidden />

      <SummitModal />
      <LayoutProbe />
    </div>
  );
}

/** 背景シーン：選択中のタイマーデザインに描画を任せる */
function SceneLayer({ ended, paused }: { ended: boolean; paused: boolean }) {
  const { settings } = useApp();
  const { timer, elapsedMs } = useTimer();
  const now = useNow(60_000);
  const design = getDesign(settings.timerDesign);
  const { Scene } = design;
  const hour = hourFor(settings.sky, new Date(now), {
    phase: timer.phase,
    elapsedMs,
    targetMs: timer.targetMs,
    freeSpanMs: settings.pomodoroFocus * 60_000,
  });
  // ホームでは画面の外側の帯（上下）をシーンの空と地面の色で塗る。ほかの画面では地の色に戻す
  const sceneHour = ended ? 21.6 : hour;
  useEffect(() => {
    setEdgeColors(!paused && design.edgeColors ? design.edgeColors(sceneHour, settings) : null);
  }, [paused, sceneHour, settings.season, design]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setEdgeColors(null), []);
  return (
    <div className="absolute inset-0">
      <Scene hour={hour} ended={ended} paused={paused} />
    </div>
  );
}
