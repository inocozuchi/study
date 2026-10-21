import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { AppProvider, useApp } from '@/store/AppStore';
import { TimerProvider, useTimer, type JourneyResult } from '@/store/TimerStore';
import { TabBar, type TabKey } from '@/components/nav/TabBar';
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
import { markBoot } from '@/lib/boot';
import { applyFont } from '@/lib/fonts';
import { applyAppearance, setEdgeColors } from '@/lib/theme';
import { useSceneHeld } from '@/lib/sceneHold';
import { useDepth } from '@/lib/depth';
import { useNow } from '@/hooks/useNow';
import { easeIOS, spring, springSheet } from '@/lib/motion';
import { chromeFor } from '@/lib/chrome';
import { LayoutProbe } from '@/components/debug/LayoutProbe';

export default function App() {
  return (
    // 動きの既定は iOS のバネ（transition を書いていない動きもすべて物理スプリングで動く）
    <MotionConfig reducedMotion="user" transition={spring}>
      <AppProvider>
        <Gate />
      </AppProvider>
    </MotionConfig>
  );
}

function Gate() {
  const { ready, settings, epoch } = useApp();
  useEffect(() => {
    if (ready) markBoot('data');
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
  const { timer, arrival, clearArrival } = useTimer();
  const [tab, setTabState] = useState<TabKey>(() => {
    try {
      return (sessionStorage.getItem(TAB_KEY) as TabKey) || 'trail';
    } catch {
      return 'trail';
    }
  });
  const [result, setResult] = useState<JourneyResult | null>(null);

  const setTab = (t: TabKey) => {
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

  const journeying = timer.phase !== 'idle' || !!timer.journeyStartedAt || !!arrival;
  const onHome = tab === 'trail';
  const sceneHeld = useSceneHeld();
  const depth = useDepth();

  // 予約した時間に届いて自動で旅が終わったら、リザルトを出す（ほかのタブにいてもホームに戻ったときに見える）
  useEffect(() => {
    if (!arrival) return;
    setResult(arrival);
    clearArrival();
  }, [arrival, clearArrival]);
  const immersive = onHome && (journeying || !!result);
  // 画面ごとの枠（全画面のシーン・時刻の帯の下・タブバー）は lib/chrome.ts の表で決める
  const chrome = chromeFor({ home: onHome, immersive });
  const sceneShown = chrome.fullscreen && !sceneHeld;

  return (
    <div className="app-frame overflow-hidden bg-black" data-probe="root">
      {/* アプリ全体（シーン・画面・タブバー）。シートが開いている間は少し奥へ引っ込む（iOS のシート表示） */}
      <motion.div
        className="absolute inset-0 overflow-hidden bg-page"
        initial={false}
        animate={depth ? { scale: 0.94, y: 8, borderRadius: 14 } : { scale: 1, y: 0, borderRadius: 0 }}
        transition={springSheet}
        style={{ transformOrigin: '50% 40%' }}
      >
      {/* 背景の層：全画面の画面でだけシーンを見せる。ほかの画面では止めて隠す（地の色の上にカードを並べる） */}
      <div
        className="absolute inset-0"
        // シーンはパッと消さずに 250ms で溶かしてから隠す（タブの切り替えと同じ速さ）
        style={{ opacity: sceneShown ? 1 : 0, visibility: sceneShown ? 'visible' : 'hidden', transition: sceneShown ? 'opacity 250ms cubic-bezier(0.22, 1, 0.36, 1)' : 'opacity 250ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 250ms' }}
        data-probe={sceneShown ? 'scene' : undefined}>
        <SceneLayer ended={!!result} paused={!sceneShown} shown={sceneShown} />
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.main
          key={tab}
          variants={{
            // タブの切り替え：250ms のクロスフェード + 下から 6px（filter は使わない。位置と透明度だけ）
            enter: { opacity: 0, y: 6 },
            center: { opacity: 1, y: 0 },
            exit: { opacity: 0 },
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: easeIOS }}
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
        {/* ホームにいる間は、タブバーも旅のモードの色に着せ替える */}
        <TabBar tab={tab} onChange={setTab} skin={onHome ? getDesign(settings.timerDesign).home.tabbar : undefined} />
      </div>
      {/* 奥へ引っ込んだときの暗がり（filter は使わない：iPhone で重い） */}
      <motion.div className="pointer-events-none absolute inset-0 z-[90] bg-black" initial={false} animate={{ opacity: depth ? 0.22 : 0 }} transition={{ duration: 0.35, ease: easeIOS }} />
      </motion.div>

      {/* 時刻の帯の下に敷くもの（全画面のシーンでは何も敷かない） */}
      <div className="status-band z-[80]" data-area={chrome.statusArea} data-probe="status" aria-hidden />

      <SummitModal />
      <LayoutProbe />
    </div>
  );
}

/** 背景シーン：選択中のタイマーデザインに描画を任せる */
function SceneLayer({ ended, paused, shown }: { ended: boolean; paused: boolean; shown: boolean }) {
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

  // シーンの画像がすべてデコードされるまで中身を見せない（地の色・駅名の文字だけが先に出る一瞬を作らない）。
  // モードを切り替えたら、新しいシーンの準備ができるまで落ち着いた暗い色で待ち、そろったらフェードイン
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const ready = readyFor === design.id;
  const onReady = useCallback(() => setReadyFor(design.id), [design.id]);
  useEffect(() => {
    if (ready) return;
    // 画像が読めないときも、いつまでも隠したままにしない
    const id = setTimeout(onReady, 3000);
    return () => clearTimeout(id);
  }, [ready, onReady]);
  // 起動画面：最初に見えるシーンの準備ができたら（シーンを見せない画面ならすぐ）閉じてよい
  useEffect(() => {
    if (ready || !shown) markBoot('scene');
  }, [ready, shown]);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: design.skeleton ?? '#16181D' }}>
      <div className="scene-fade absolute inset-0" style={{ opacity: ready ? 1 : 0 }}>
        <Scene key={design.id} hour={hour} ended={ended} paused={paused} onReady={onReady} />
      </div>
    </div>
  );
}
