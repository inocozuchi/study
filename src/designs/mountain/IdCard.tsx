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

/** 登山者 ID カード：生成りのキャンバス地にクレヨン。ニックネーム・累計の登山時間・現在の標高 */
export function IdCard({ info }: ProfileCardProps) {
  const { name, totalMinutes, since, settings } = info;
  const altitude = totalMinutes * METERS_PER_MINUTE;
  return (
    <div className="mt-paper relative aspect-[1.586] w-full overflow-hidden rounded-[22px] font-maru text-ink shadow-[0_14px_30px_-14px_rgba(60,40,20,0.55)]" aria-label="登山者IDカード">
      {/* 別のモードのときはシーンが置いていないので、フィルタをここにも置く */}
      <CrayonDefs />
      {/* 帯 */}
      <div className="flex items-center justify-between px-4 pb-2 pt-3" style={{ background: 'linear-gradient(180deg, #8FBFAE, #7FB09F)' }}>
        <div className="leading-none text-[#FBF6EA]">
          <p className="text-[16px] font-bold tracking-wide">登山者IDカード</p>
          <p className="mt-1 text-[9px] font-bold tracking-[0.3em] opacity-80">MOUNTAINEER ID</p>
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
            <dd className="truncate text-[21px] font-bold leading-tight">{name}</dd>
          </div>
          <div className="flex gap-4">
            <div>
              <dt className="text-[9.5px] font-bold tracking-[0.12em] text-ink-soft">累計登山時間</dt>
              <dd className="tabular font-digits text-[16px] font-bold">{fmtDuration(totalMinutes)}</dd>
            </div>
            <div>
              <dt className="text-[9.5px] font-bold tracking-[0.12em] text-ink-soft">現在の標高</dt>
              <dd className="tabular font-digits text-[16px] font-bold text-[#B96F55]">{fmtMeters(altitude)}</dd>
            </div>
          </div>
        </dl>
      </div>

      <div className="absolute inset-x-4 bottom-3 flex items-end justify-between">
        <div className="text-[10px] font-bold leading-snug text-ink-soft">
          <p className="tabular tracking-[0.14em]">No. {idNumber(name + (since ?? ''))}</p>
          <p>入山 {since ? day(since) : '— — —'} · テント {TENTS[settings.tentStyle]?.name ?? TENTS[0].name}</p>
        </div>
        {/* 認定のはんこ */}
        <span className="relative grid h-[46px] w-[46px] rotate-[-14deg] place-items-center rounded-full text-[11px] font-bold leading-none text-[#C9604A]" style={{ boxShadow: 'inset 0 0 0 2px rgba(201,96,74,0.75)' }}>
          <span className="text-center">
            山歩
            <br />
            認定
          </span>
        </span>
      </div>
    </div>
  );
}
