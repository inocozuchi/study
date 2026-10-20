import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Music, RefreshCw, Settings2, Users } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { useTimer, type JourneyResult } from '@/store/TimerStore';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { CrayonOutline } from '@/components/ui/CrayonDefs';
import { SetupSheet } from '@/components/home/SetupSheet';
import { BreathOverlay } from '@/components/focus/BreathOverlay';
import { FocusHUD } from '@/components/focus/FocusHUD';
import { ResultView } from '@/components/focus/ResultView';
import { CassettePlayer } from '@/components/audio/CassettePlayer';
import { TOOL_TABS, ToolsPanel, type ToolTab } from '@/components/tools/ToolsPanel';
import { SettingsScreen } from './SettingsScreen';
import { SEASONS } from '@/components/scene/stage/palette';
import { multiSupported, randomRoomCode, type Peer } from '@/hooks/useMultiRoom';
import { streaks, summary } from '@/lib/stats';
import { fmtDuration } from '@/lib/time';
import { springBouncy, springSoft } from '@/lib/motion';
import type { StudyStyle } from '@/types';

interface Props {
  result: JourneyResult | null;
  setResult: (r: JourneyResult | null) => void;
  peers: Peer[];
}

export function HomeScreen({ result, setResult, peers }: Props) {
  const { settings, updateSettings } = useApp();
  const t = useTimer();
  const { timer } = t;
  const [setup, setSetup] = useState(false);
  const [breath, setBreath] = useState(false);
  const [music, setMusic] = useState(false);
  const [tool, setTool] = useState<ToolTab | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [room, setRoom] = useState(false);

  const journeying = timer.phase !== 'idle' || !!timer.journeyStartedAt;

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
            <ResultView result={result} onContinue={() => setResult(null)} />
          </motion.div>
        ) : journeying ? (
          <motion.div key="hud" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <FocusHUD onMusic={() => setMusic(true)} onEnd={end} companions={peers.map((p) => p.name)} />
          </motion.div>
        ) : (
          <motion.div key="home" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
            <HomeIdle
              onFocus={() => setSetup(true)}
              onMusic={() => setMusic(true)}
              onSettings={() => setSettingsOpen(true)}
              onTool={setTool}
              onRoom={() => setRoom(true)}
              peers={peers}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <BreathOverlay open={breath && journeying && !result} onDone={endBreath} />
      <SetupSheet open={setup} onClose={() => setSetup(false)} onStarted={onStarted} />
      <CassettePlayer open={music} onClose={() => setMusic(false)} />
      <ToolsPanel tab={tool} onTab={setTool} onClose={() => setTool(null)} />
      <SettingsScreen open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <RoomSheet open={room} onClose={() => setRoom(false)} peers={peers} />
    </div>
  );
}

function HomeIdle({ onFocus, onMusic, onSettings, onTool, onRoom, peers }: { onFocus: () => void; onMusic: () => void; onSettings: () => void; onTool: (t: ToolTab) => void; onRoom: () => void; peers: Peer[] }) {
  const { settings, updateSettings, sessions } = useApp();
  const sum = useMemo(() => summary(sessions), [sessions]);
  const st = useMemo(() => streaks(sessions), [sessions]);
  const look = SEASONS[settings.season];

  const setStyle = (s: StudyStyle) => {
    updateSettings(s === 'multi' && !settings.roomCode ? { style: s, roomCode: randomRoomCode() } : { style: s });
  };

  return (
    <div className="relative mx-auto h-full max-w-xl">
      {/* 上部 */}
      <div className="flex items-center justify-between px-5 pt-safe">
        <motion.button whileTap={{ scale: 0.88 }} transition={springBouncy} onClick={onMusic} aria-label="集中音楽" className={`ink-btn relative mt-1 grid h-11 w-11 place-items-center ${settings.bgmPlaying ? 'text-crayon-yellow' : ''}`}>
          <Music size={19} />
          <CrayonOutline shape="circle" color="rgba(255,248,234,0.4)" width={1.4} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.88 }} transition={springBouncy} onClick={onSettings} aria-label="設定" className="ink-btn relative mt-1 grid h-11 w-11 place-items-center">
          <Settings2 size={19} />
          <CrayonOutline shape="circle" color="rgba(255,248,234,0.4)" width={1.4} />
        </motion.button>
      </div>

      {/* 挨拶 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springSoft} className="px-6 pt-5">
        <h1 className="font-maru text-[30px] font-black leading-tight text-paper [text-shadow:0_2px_0_rgba(46,34,28,0.45),0_0_24px_rgba(0,0,0,0.2)]">
          やあ！{settings.userName}、
          <br />
          <span className="text-[22px] font-bold">前へ進む準備はいい？</span>
        </h1>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[`今日 ${fmtDuration(sum.today, true)}`, `🔥 ${st.current}日連続`, `${look.emoji} ${look.label}の山`].map((c) => (
            <span key={c} className="rounded-full bg-ink/35 px-2.5 py-1 font-maru text-[12px] font-bold text-paper backdrop-blur-sm">
              {c}
            </span>
          ))}
        </div>
      </motion.div>

      {/* サイドのツールタブ */}
      <motion.nav initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...springBouncy, delay: 0.15 }} className="tex-denim absolute right-3 top-[30%] flex flex-col gap-1 rounded-full p-1.5 shadow-float" aria-label="ツール">
        {TOOL_TABS.map(({ key, label, icon: Icon, color }) => (
          <motion.button key={key} whileTap={{ scale: 0.85 }} transition={springBouncy} onClick={() => onTool(key)} aria-label={label} className="group relative grid h-11 w-11 place-items-center rounded-full bg-paper/90 text-ink">
            <Icon size={19} color={color} strokeWidth={2.3} />
            <span className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-bold text-paper opacity-0 transition group-hover:opacity-100">{label}</span>
          </motion.button>
        ))}
      </motion.nav>

      {/* 下部：ソロ/マルチ + 集中ボタン */}
      <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+100px)] flex flex-col items-center gap-3.5 px-6">
        <div className="flex w-full max-w-[260px] flex-col items-center gap-2">
          <Segmented<StudyStyle>
            value={settings.style}
            onChange={setStyle}
            className="w-full !bg-[rgba(46,34,28,0.42)] shadow-float"
            size="sm"
            options={[
              { value: 'solo', label: 'ソロ' },
              { value: 'multi', label: 'マルチ' },
            ]}
          />
          <AnimatePresence>
            {settings.style === 'multi' && (
              <motion.button initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} onClick={onRoom} className="flex items-center gap-1.5 rounded-full bg-ink/40 px-3 py-1 font-maru text-[12px] font-bold text-paper backdrop-blur-sm">
                <Users size={13} /> 部屋 {settings.roomCode} · {peers.length + 1}人
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <FocusButton onClick={onFocus} />
      </div>
    </div>
  );
}

/** 大きな「集中」ボタン。ゆっくり呼吸する光の輪 */
function FocusButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative grid h-[136px] w-[136px] place-items-center">
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border-2 border-paper/50"
          style={{ filter: 'url(#crayon-soft)' }}
          animate={{ scale: [1, 1.28], opacity: [0.7, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 1.6, ease: 'easeOut' }}
        />
      ))}
      <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.03 }} transition={springBouncy} onClick={onClick} className="ink-btn relative grid h-full w-full place-items-center" aria-label="集中する">
        <span className="font-maru text-[30px] font-black tracking-widest">集中</span>
        <CrayonOutline shape="circle" color="rgba(255,248,234,0.6)" width={2.4} />
      </motion.button>
    </div>
  );
}

function RoomSheet({ open, onClose, peers }: { open: boolean; onClose: () => void; peers: Peer[] }) {
  const { settings, updateSettings } = useApp();
  const [code, setCode] = useState(settings.roomCode);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (open) setCode(settings.roomCode);
  }, [open, settings.roomCode]);
  const statusLabel = { idle: '準備中', focus: '登山中', break: '休憩中' } as const;

  return (
    <Sheet open={open} onClose={onClose} title="旅の仲間" subtitle="同じ部屋コードで一緒に登ろう" tone="paper">
      <div className="space-y-4 pb-5">
        <div className="paper-card p-4">
          <p className="text-[12px] font-bold text-ink-soft">部屋コード</p>
          <div className="mt-2 flex gap-2">
            <input
              className="field-paper text-center font-digits text-[22px] font-semibold uppercase tracking-[0.3em]"
              value={code}
              maxLength={8}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onBlur={() => code && updateSettings({ roomCode: code })}
              aria-label="部屋コード"
            />
            <button aria-label="新しいコード" onClick={() => { const c = randomRoomCode(); setCode(c); updateSettings({ roomCode: c }); }} className="ink-btn grid h-12 w-12 shrink-0 place-items-center">
              <RefreshCw size={18} />
            </button>
            <button
              aria-label="コピー"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  /* noop */
                }
              }}
              className="ink-btn grid h-12 w-12 shrink-0 place-items-center"
            >
              <Copy size={18} />
            </button>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
            {copied ? 'コピーしました ✓ ' : ''}
            {multiSupported
              ? 'この端末の別のタブやウィンドウで同じコードを開くと、仲間として一緒に山を登ります。'
              : 'このブラウザはマルチに対応していません。'}
          </p>
        </div>
        <div className="paper-card divide-y divide-ink/[0.08] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-crayon-red text-[15px] text-paper">🧭</span>
            <span className="flex-1 font-maru text-[15px] font-bold">{settings.userName}（あなた）</span>
          </div>
          {peers.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-crayon-blue text-[15px] text-paper">🎒</span>
              <span className="min-w-0 flex-1">
                <span className="block font-maru text-[15px] font-bold">{p.name}</span>
                <span className="block text-[12px] text-ink-soft">{statusLabel[p.status]}{p.subject ? ` · ${p.subject}` : ''}</span>
              </span>
              <span className={`h-2.5 w-2.5 rounded-full ${p.status === 'focus' ? 'bg-crayon-green' : p.status === 'break' ? 'bg-crayon-yellow' : 'bg-ink-faint'}`} />
            </div>
          ))}
          {peers.length === 0 && <p className="px-4 py-4 text-center text-[13px] text-ink-faint">まだ仲間はいません</p>}
        </div>
      </div>
    </Sheet>
  );
}
