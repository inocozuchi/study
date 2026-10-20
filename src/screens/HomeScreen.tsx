import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Music, RefreshCw, Settings2, Users } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { useTimer, type JourneyResult } from '@/store/TimerStore';
import { Segmented } from '@/components/ui/Segmented';
import { Pressable } from '@/components/ui/Pressable';
import { Sheet } from '@/components/ui/Sheet';
import { SetupSheet } from '@/components/home/SetupSheet';
import { BreathOverlay } from '@/components/focus/BreathOverlay';
import { CassettePlayer } from '@/components/audio/CassettePlayer';
import { TOOL_TABS, ToolsPanel, type ToolTab } from '@/components/tools/ToolsPanel';
import { SettingsScreen } from './SettingsScreen';
import { getDesign } from '@/designs';
import { multiSupported, randomRoomCode, type Peer } from '@/hooks/useMultiRoom';
import { streaks, summary } from '@/lib/stats';
import { dateKey, fmtDuration } from '@/lib/time';
import { useNow } from '@/hooks/useNow';
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
  const design = getDesign(settings.timerDesign);

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
            <design.Result result={result} onContinue={() => setResult(null)} />
          </motion.div>
        ) : journeying ? (
          <motion.div key="hud" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <design.Session onMusic={() => setMusic(true)} onEnd={end} companions={peers.map((p) => p.name)} />
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
  // 日付が変わったら「今日」と連続日数を数え直す
  const today = dateKey(useNow(60_000));
  const sum = useMemo(() => summary(sessions), [sessions, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = useMemo(() => streaks(sessions), [sessions, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStyle = (s: StudyStyle) => {
    updateSettings(s === 'multi' && !settings.roomCode ? { style: s, roomCode: randomRoomCode() } : { style: s });
  };

  return (
    <div className="relative mx-auto h-full max-w-xl">
      {/* 上部 */}
      <div className="flex items-center justify-between px-5 pt-safe">
        <Pressable onClick={onMusic} aria-label="集中音楽" className={`glass-scene mt-1 grid h-10 w-10 place-items-center rounded-full ${settings.bgmPlaying ? 'text-ember' : 'text-white/85'}`}>
          <Music size={18} />
        </Pressable>
        <Pressable onClick={onSettings} aria-label="設定" className="glass-scene mt-1 grid h-10 w-10 place-items-center rounded-full text-white">
          <Settings2 size={18} />
        </Pressable>
      </div>

      {/* 挨拶 */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springSoft} className="px-6 pt-5">
        <h1 className="text-[30px] font-bold leading-tight tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
          やあ！{settings.userName}、
          <br />
          <span className="text-[21px] font-semibold text-white/90">前へ進む準備はいい？</span>
        </h1>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[`今日 ${fmtDuration(sum.today, true)}`, `🔥 ${st.current}日連続`].map((c) => (
            <span key={c} className="tabular rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur-md">
              {c}
            </span>
          ))}
        </div>
      </motion.div>

      {/* サイドのツールタブ */}
      <motion.nav initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ ...springBouncy, delay: 0.15 }} className="glass-scene absolute right-3 top-[30%] flex flex-col gap-1 rounded-full p-1.5" aria-label="ツール">
        {TOOL_TABS.map(({ key, label, icon: Icon, color }) => (
          <Pressable key={key} scale={0.85} onClick={() => onTool(key)} aria-label={label} className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.08]">
            <Icon size={19} color={color} strokeWidth={2.2} />
          </Pressable>
        ))}
      </motion.nav>

      {/* 下部：ソロ/マルチ + 集中ボタン */}
      <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+100px)] flex flex-col items-center gap-3.5 px-6">
        <div className="flex w-full max-w-[260px] flex-col items-center gap-2">
          <Segmented<StudyStyle>
            value={settings.style}
            onChange={setStyle}
            className="w-full !bg-black/35 shadow-glass"
            size="sm"
            options={[
              { value: 'solo', label: 'ソロ' },
              { value: 'multi', label: 'マルチ' },
            ]}
          />
          <AnimatePresence>
            {settings.style === 'multi' && (
              <motion.button initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} onClick={onRoom} className="glass-scene flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold text-white/85">
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

/** 大きな「集中」ボタン：白いグラデーションの円と、ゆっくり広がる光の輪 */
function FocusButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative grid h-[124px] w-[124px] place-items-center">
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full border border-white/40"
          animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 1.6, ease: 'easeOut' }}
        />
      ))}
      <motion.button
        whileTap={{ scale: 0.92 }}
        transition={springBouncy}
        onClick={onClick}
        aria-label="集中する"
        className="relative grid h-full w-full place-items-center rounded-full text-night-950"
        style={{ background: 'linear-gradient(160deg, #ffffff, #dfe9f7)', boxShadow: '0 18px 44px -12px rgba(142,197,255,0.65), inset 0 1px 0 rgba(255,255,255,0.9)' }}
      >
        <span className="text-[26px] font-bold tracking-[0.12em]">集中</span>
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
  const statusLabel = { idle: '準備中', focus: '集中中', break: '休憩中' } as const;

  return (
    <Sheet open={open} onClose={onClose} title="マルチ" subtitle="同じ部屋コードで一緒に集中しよう">
      <div className="space-y-4 pb-5">
        <div className="glass-thin rounded-2xl p-4">
          <p className="section-label">部屋コード</p>
          <div className="mt-2 flex gap-2">
            <input
              className="field tabular text-center text-[22px] font-semibold uppercase tracking-[0.3em]"
              value={code}
              maxLength={8}
              onChange={(e) => {
                const c = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                setCode(c);
                // 閉じ方によっては blur が来ないので、入力のたびに保存する
                if (c.trim()) updateSettings({ roomCode: c.trim() });
              }}
              aria-label="部屋コード"
            />
            <Pressable aria-label="新しいコード" onClick={() => { const c = randomRoomCode(); setCode(c); updateSettings({ roomCode: c }); }} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10">
              <RefreshCw size={18} />
            </Pressable>
            <Pressable
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
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10"
            >
              <Copy size={18} />
            </Pressable>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-white/45">
            {copied ? 'コピーしました ✓ ' : ''}
            {multiSupported ? 'この端末の別のタブやウィンドウで同じコードを開くと、一緒に集中できます。' : 'このブラウザはマルチに対応していません。'}
          </p>
        </div>
        <div className="glass-thin divide-y divide-white/[0.06] overflow-hidden rounded-2xl">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ember/20 text-[15px]">🧭</span>
            <span className="flex-1 text-[15px] font-semibold">{settings.userName}（あなた）</span>
          </div>
          {peers.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-summit/20 text-[15px]">🎒</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{p.name}</span>
                <span className="block text-[12px] text-white/45">{statusLabel[p.status]}{p.subject ? ` · ${p.subject}` : ''}</span>
              </span>
              <span className={`h-2.5 w-2.5 rounded-full ${p.status === 'focus' ? 'bg-moss' : p.status === 'break' ? 'bg-sun' : 'bg-white/30'}`} />
            </div>
          ))}
          {peers.length === 0 && <p className="px-4 py-4 text-center text-[13px] text-white/40">まだ誰もいません</p>}
        </div>
      </div>
    </Sheet>
  );
}
