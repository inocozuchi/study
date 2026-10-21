import { METERS_PER_MINUTE, fmtMeters } from '@/lib/altitude';
import { fmtDuration, pad } from '@/lib/time';
import { CrayonDefs, CrayonOutline } from './CrayonDefs';
import { HikerPreview } from './HikerPreview';
import { TENTS } from './scene/tents';
import type { ProfileCardProps } from '../types';

/** 名前から決まる ID 番号（同じ名前なら同じ番号） */
function idNumber(seed: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  const n = String((h >>> 0) % 100000000).padStart(8, '0');
  return `FT-${n.slice(0, 4)}-${n.slice(4)}`;
}

const day = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
};

/**
 * 山岳登頂認定パスポート（登山の旅のパス）：木の札に載せた生成りの麻布のカード。帯は水彩のにじみ、
 * 右下は刺繍のワッペン。ニックネーム・累計の登山時間・現在の標高
 */
export function IdCard({ info }: ProfileCardProps) {
  const { name, totalMinutes, since, settings } = info;
  const altitude = totalMinutes * METERS_PER_MINUTE;
  return (
    <div className="mt-wood rounded-[26px] p-2.5">
    <div className="mt-paper relative aspect-[1.586] w-full overflow-hidden rounded-[18px] font-maru text-ink shadow-[0_8px_16px_-8px_rgba(40,22,10,0.6)]" aria-label="山岳登頂認定パスポート">
      {/* 別のモードのときはシーンが置いていないので、フィルタをここにも置く */}
      <CrayonDefs />
      {/* 帯 */}
      <div className="mt-wash flex items-center justify-between px-4 pb-2 pt-3">
        <div className="leading-none text-[#FBF6EA] [text-shadow:0_1px_0_rgba(60,90,80,0.35)]">
          <p className="text-[14px] font-bold tracking-wide">山岳登頂認定パスポート</p>
          <p className="mt-1 text-[9px] font-bold tracking-[0.3em] opacity-85">SUMMIT PASSPORT</p>
        </div>
        <svg viewBox="0 0 40 28" className="h-7 w-10" aria-hidden>
          <g filter="url(#crayon-soft)">
            <circle cx="29" cy="8" r="5" fill="#F3DE9A" />
            <path d="M2 26 L15 7 L22 16 L26 11 L38 26 Z" fill="#FBF6EA" />
            <path d="M15 7 L11 13 L14 12 L16 14 L19 12 Z" fill="#E3EEF0" />
          </g>
        </svg>
      </div>

      <div className="flex gap-3 px-4 pt-3">
        {/* 顔写真 */}
        <div className="relative h-[92px] w-[78px] shrink-0 overflow-hidden rounded-xl" style={{ background: 'linear-gradient(180deg, #CFE5F2, #F3E7C9)' }}>
          <HikerPreview look={settings.hikerLook} crop="bust" className="absolute inset-x-0 bottom-0 h-full w-full" />
          <CrayonOutline radius={12} color="rgba(74,58,52,0.45)" width={1.4} />
        </div>
        <dl className="min-w-0 flex-1 space-y-1.5">
          <div>
            <dt className="text-[9.5px] font-bold tracking-[0.18em] text-ink-soft">なまえ / NAME</dt>
            <dd className="truncate text-[19px] font-bold leading-tight">{name}</dd>
          </div>
          <div className="flex gap-4">
            <div>
              <dt className="text-[9.5px] font-bold tracking-[0.12em] text-ink-soft">累計登山時間</dt>
              <dd className="tabular font-digits text-[15px] font-bold">{fmtDuration(totalMinutes)}</dd>
            </div>
            <div>
              <dt className="text-[9.5px] font-bold tracking-[0.12em] text-ink-soft">現在の標高</dt>
              <dd className="tabular font-digits text-[15px] font-bold text-[#B96F55]">{fmtMeters(altitude)}</dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="absolute inset-x-4 bottom-3 flex items-end justify-between">
        <div className="text-[10px] font-bold leading-snug text-ink-soft">
          <p className="tabular tracking-[0.14em]">No. {idNumber(name + (since ?? ''))}</p>
          <p>入山 {since ? day(since) : '— — —'} · テント {TENTS[settings.tentStyle]?.name ?? TENTS[0].name}</p>
        </div>
        {/* 認定の刺繍ワッペン（テラコッタの布に山と「認定」） */}
        <span className="mt-patch relative grid h-[54px] w-[54px] rotate-[-10deg] place-items-center rounded-full bg-[#C9704F] text-[#FBF6EA]">
          <span className="flex flex-col items-center leading-none">
            <svg viewBox="0 0 24 14" className="h-[13px] w-[22px]" aria-hidden>
              <path d="M1 13 L9 3 L13 8 L16 5 L23 13 Z" fill="#FBF6EA" />
            </svg>
            <span className="mt-0.5 text-[10px] font-bold tracking-[0.1em]">認定</span>
          </span>
        </span>
      </div>
    </div>
    </div>
  );
}
