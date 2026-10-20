import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Share } from 'lucide-react';
import type { DesignResultProps } from '../types';
import { useApp } from '@/store/AppStore';
import { METERS_PER_MINUTE, fmtMeters } from '@/lib/altitude';
import { MIN, pad } from '@/lib/time';
import { springBouncy, springSoft } from '@/lib/motion';

function fmtSpent(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}秒`;
  const m = Math.round(s / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}時間${m % 60 ? `${m % 60}分` : ''}` : `${m}分`;
}

/** 登山デザイン：旅の終わり。キャンプの夜景に、今日の記録を日記のように書く */
export function MountainResult({ result, onContinue }: DesignResultProps) {
  const { subjectById } = useApp();
  const subject = subjectById(result.subjectId);
  const d = new Date(result.endedAt);
  const date = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
  const spent = fmtSpent(result.focusMs);
  const name = subject?.name ?? '集中';
  const closing = result.focusMs >= 25 * MIN ? '今日も一歩、たしかに前へ進めたね。' : '次はもっと前に進めますように。';
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = `${date}、${spent} を ${name} に費やしました。${closing} #FocusTrail`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* 共有をキャンセル */
    }
  };

  const lines: { node: ReactNode; delay: number }[] = [
    { node: <>{date}、</>, delay: 0.3 },
    {
      node: (
        <>
          <span className="text-crayon-yellow">{spent}</span> を使って <span className="text-crayon-yellow">{name}</span> に
        </>
      ),
      delay: 0.7,
    },
    { node: <>費やしました。</>, delay: 1.1 },
    { node: <>{closing}</>, delay: 1.5 },
  ];

  return (
    <div className="absolute inset-0 flex flex-col px-7 pt-safe">
      <div className="mt-[14vh]">
        {lines.map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ ...springSoft, delay: l.delay, filter: { duration: 0.5, delay: l.delay } }} className="relative py-2 font-maru text-[24px] font-bold leading-snug text-paper [text-shadow:0_2px_0_rgba(23,37,61,0.5)]">
            {l.node}
            {/* 罫線（クレヨンで引いた線） */}
            <motion.svg className="absolute -bottom-0.5 left-0 h-2 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 4" initial={{ pathLength: 0 }}>
              <motion.path d="M0 2 Q25 1.4 50 2.2 T100 1.8" stroke="rgba(255,248,234,0.6)" strokeWidth="0.6" fill="none" vectorEffect="non-scaling-stroke" style={{ filter: 'url(#crayon-soft)', strokeWidth: 1.6 }} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: l.delay + 0.2 }} />
            </motion.svg>
          </motion.div>
        ))}

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} transition={{ delay: 2 }} className="mt-3 font-maru text-[13px] text-paper">
          獲得標高 +{fmtMeters((result.focusMs / MIN) * METERS_PER_MINUTE)}
          {result.cycles > 0 ? ` · ${result.cycles} 回の登り` : ''}
          {subject ? ` · ${subject.mountainName}へ` : ''}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springBouncy, delay: 2.1 }} className="mt-5 flex justify-end gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={share} aria-label="共有" className="mt-paper grid h-12 w-16 place-items-center rounded-full text-crayon-blue shadow-float">
            <Share size={20} />
          </motion.button>
          <motion.button whileTap={{ scale: 0.94 }} onClick={onContinue} className="mt-paper rounded-full px-8 font-maru text-[17px] font-bold text-crayon-blue shadow-float">
            続ける
          </motion.button>
        </motion.div>
        {copied && <p className="mt-2 text-right text-[12px] text-paper/80">クリップボードにコピーしました</p>}
      </div>
    </div>
  );
}
