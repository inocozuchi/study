import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const WIN_W = 248;
const WIN_H = 360;
const LIP = 26;

/** 星の位置（決まった並び。毎回変わらない） */
const STARS = Array.from({ length: 34 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12543.1234;
  return { x: (a - Math.floor(a)) * 100, y: (b - Math.floor(b)) * 52, r: i % 7 === 0 ? 1.6 : 1 };
});

/**
 * 窓の外（機内の楕円の窓）。夜の雲海がゆっくり流れ、主翼の先の灯りが点滅する。
 * 窓のシェードは指で上下に開け閉めできる。
 */
export function WindowView({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 z-[35] grid place-items-center bg-[radial-gradient(90%_70%_at_50%_45%,#2A2D33,#121418_70%)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <button onClick={onClose} aria-label="窓を閉じる（地図に戻る）" className="fl-glass absolute left-1/2 top-[calc(env(safe-area-inset-top)+10px)] flex h-10 -translate-x-1/2 items-center gap-1.5 rounded-full pl-3 pr-4 text-[14px] font-semibold active:scale-95">
        <X size={16} /> 地図に戻る
      </button>

      {/* 窓枠（内装のパネル） */}
      <div className="relative grid place-items-center rounded-[150px] p-[22px] shadow-[inset_0_2px_0_rgba(255,255,255,0.12),0_30px_60px_-20px_rgba(0,0,0,0.8)]" style={{ background: 'linear-gradient(160deg,#E4E1DA,#B9B5AC 60%,#9F9B93)' }}>
        <div className="relative overflow-hidden rounded-[124px] shadow-[inset_0_0_0_6px_#8C887F,inset_0_8px_18px_rgba(0,0,0,0.5)]" style={{ width: WIN_W, height: WIN_H }}>
          {/* 夜空 */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#050A1C 0%,#0D1838 45%,#24305A 70%,#4B3A5E 100%)' }} />
          {STARS.map((s, i) => (
            <span key={i} className="absolute rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r * 2, height: s.r * 2, opacity: 0.5 + (i % 3) * 0.2 }} />
          ))}
          <span className="absolute right-[22%] top-[12%] h-7 w-7 rounded-full bg-[#F4EFDF] shadow-[0_0_24px_6px_rgba(244,239,223,0.35)]" />
          {/* 雲海（2 枚つなぎを流す） */}
          <div className="fl-clouds absolute bottom-0 left-0 h-[46%] w-[200%]">
            {[0, 1].map((k) => (
              <div
                key={k}
                className="absolute bottom-0 h-full w-1/2"
                style={{
                  left: `${k * 50}%`,
                  background:
                    'radial-gradient(40% 50% at 15% 80%,rgba(150,160,200,0.75),transparent 70%),radial-gradient(35% 45% at 45% 70%,rgba(120,130,175,0.7),transparent 70%),radial-gradient(45% 55% at 78% 85%,rgba(160,165,205,0.75),transparent 70%),radial-gradient(60% 40% at 50% 100%,rgba(110,118,160,0.9),transparent 75%)',
                }}
              />
            ))}
          </div>
          {/* 主翼の先と灯り */}
          <svg className="absolute bottom-[18%] left-0 w-[70%]" viewBox="0 0 170 60" aria-hidden>
            <path d="M0 40 L150 22 L158 26 L0 60 Z" fill="#1B1E25" />
            <path d="M0 40 L150 22" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          </svg>
          <span className="fl-blink absolute bottom-[calc(18%+30px)] left-[calc(70%-12px)] h-2.5 w-2.5 rounded-full bg-[#FF453A] shadow-[0_0_14px_5px_rgba(255,69,58,0.7)]" />
          {/* 窓ガラスの映り込み */}
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgba(255,255,255,0.12),transparent_35%)]" />

          {/* シェード（下へ引くと閉まる） */}
          <motion.div
            drag="y"
            dragConstraints={{ top: -(WIN_H - LIP), bottom: 0 }}
            dragElastic={0.04}
            dragMomentum={false}
            initial={{ y: -(WIN_H - LIP) }}
            className="absolute inset-x-0 top-0 cursor-grab touch-none"
            style={{ height: WIN_H }}
            aria-label="窓のシェード（上下にドラッグ）"
          >
            <div className="h-full w-full" style={{ background: 'repeating-linear-gradient(180deg,#DAD6CD 0 3px,#CFCBC1 3px 4px)' }} />
            <span className="absolute bottom-[8px] left-1/2 h-[6px] w-14 -translate-x-1/2 rounded-full bg-[#9F9B93] shadow-[inset_0_1px_1px_rgba(0,0,0,0.25)]" />
          </motion.div>
        </div>
      </div>
      <p className="absolute top-[calc(env(safe-area-inset-top)+62px)] text-[12px] text-white/45">シェードは上下にドラッグして開け閉めできます</p>
    </motion.div>
  );
}
