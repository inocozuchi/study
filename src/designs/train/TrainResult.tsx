import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { MIN, pad } from '@/lib/time';
import { springBouncy, springSoft } from '@/lib/motion';
import { goalName, originName } from './stations';
import type { DesignResultProps } from '../types';

function fmtSpent(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}秒`;
  const m = Math.round(s / 60);
  const h = Math.floor(m / 60);
  return h ? `${h}時間${m % 60 ? `${m % 60}分` : ''}` : `${m}分`;
}

/** 列車デザイン：終着駅。硬券の「乗車記念」きっぷに今日の記録を刷る */
export function TrainResult({ result, onContinue }: DesignResultProps) {
  const { settings, subjectById } = useApp();
  const subject = subjectById(result.subjectId);
  const d = new Date(result.endedAt);
  const date = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  const spent = fmtSpent(result.focusMs);
  const name = subject?.name ?? '集中';
  const from = originName(settings);
  const to = goalName(settings);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = `${date}、${from}から${to}へ。${name}に${spent}乗車しました。 #FocusTrail`;
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

  return (
    <div className="absolute inset-0 flex flex-col items-center px-6 pt-safe">
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springSoft, delay: 0.2 }} className="mt-6 text-[13px] font-bold tracking-[0.3em] text-[#F6ECD2]/80">
        終着 · {to}
      </motion.p>

      {/* 硬券 */}
      <motion.div
        initial={{ opacity: 0, y: 30, rotate: -4 }}
        animate={{ opacity: 1, y: 0, rotate: -1.5 }}
        transition={{ ...springBouncy, delay: 0.5 }}
        className="tr-hard relative mt-[20vh] w-full max-w-[340px] rounded-[6px] px-5 pb-4 pt-3 shadow-[0_20px_40px_-14px_rgba(0,0,0,0.7)]"
      >
        {/* 記念のパンチ穴 */}
        <span className="absolute right-4 top-3.5 h-2.5 w-2.5 rounded-full bg-[#3E2B20] shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)]" />
        <div className="flex items-baseline justify-between">
          <p className="text-[13px] font-extrabold tracking-[0.4em]">乗車記念</p>
          <p className="tabular mr-5 text-[11px] font-bold opacity-70">{date}</p>
        </div>
        <div className="mt-2 flex items-center justify-center gap-3">
          <p className="truncate text-[24px] font-extrabold tracking-[0.1em]">{from}</p>
          <span className="text-[18px] font-bold opacity-70">→</span>
          <p className="truncate text-[24px] font-extrabold tracking-[0.1em] text-[#B0382C]">{to}</p>
        </div>
        <div className="mt-2 border-t border-dashed border-[#B9A57E] pt-2 text-center text-[15px] font-bold leading-relaxed">
          <span className="text-[#B0382C]">{name}</span> に <span className="text-[#B0382C]">{spent}</span> 乗車
          <p className="text-[12px] opacity-70">
            {settings.trainClass === 'express' ? '特急' : '普通'}
            {result.cycles > 0 ? ` · 途中 ${result.cycles} 駅に停車` : ''}
            {result.focusMs >= 25 * MIN ? ' · 今日も前へ進めたね' : ''}
          </p>
        </div>
        <p className="tabular mt-2 text-right text-[10px] font-bold opacity-60">
          No.{pad(d.getHours())}{pad(d.getMinutes())}-{String(Math.round(result.focusMs / MIN)).padStart(4, '0')}
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springBouncy, delay: 1.1 }} className="mt-6 flex gap-3">
        <motion.button whileTap={{ scale: 0.9 }} onClick={share} aria-label="共有" className="tr-btn grid h-12 w-16 place-items-center">
          <Share size={20} />
        </motion.button>
        <motion.button whileTap={{ scale: 0.94 }} onClick={onContinue} className="tr-btn px-8 text-[17px]">
          改札を出る
        </motion.button>
      </motion.div>
      {copied && <p className="mt-2 text-[12px] text-[#F6ECD2]/80">クリップボードにコピーしました</p>}
    </div>
  );
}
