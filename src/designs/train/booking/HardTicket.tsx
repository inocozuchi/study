import { SUBJECT_ICONS } from '@/lib/subjects';
import type { SubjectIconKey } from '@/types';

export interface HardTicketData {
  from: string;
  to: string;
  km: number;
  minutes: number;
  seat: string;
  task: string;
  icon: SubjectIconKey;
  express: boolean;
  fare: string;
  date: Date;
  serial: string;
}

const spaced = (s: string) => Array.from(s).join(' ');
/** 日付印の日付（令和の年.月.日） */
const stampDate = (d: Date) => `${d.getFullYear() - 2018}.${d.getMonth() + 1}.${d.getDate()}`;

/** 汽車のシルエット（乗車記念の丸いスタンプの中） */
function Loco({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 22" className="h-auto w-full" aria-hidden>
      <path
        fill={color}
        d="M3 15h2V9h3V5h4v4h3V3h-1V1h6v2h-1v6h9l3 3v3h2v2h-2.4a3.3 3.3 0 0 1-6.2 0h-4.8a3.3 3.3 0 0 1-6.2 0h-2.8a3.3 3.3 0 0 1-6.2 0H3Zm5.6 3.6a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Zm9 0a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Zm11 0a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z"
      />
    </svg>
  );
}

/**
 * 昭和の硬券（B 型・57.5 × 30.5 mm の比）。厚紙の生成りにうすい地紋、明朝の印字、
 * 日付印（紫）と丸い乗車記念スタンプ（朱）。punched なら上の縁に改札鋏の切り欠き（入鋏痕）、stamp があれば到着印（「到着 熱海」など）。
 */
export function HardTicket({ data, punched = false, stamp }: { data: HardTicketData; punched?: boolean; stamp?: string }) {
  const Icon = SUBJECT_ICONS[data.icon]?.icon ?? SUBJECT_ICONS.book.icon;
  // 入鋏痕：上の縁の台形の切り欠き
  const notch = 'polygon(0 0, 70% 0, 71.6% 9%, 75.4% 9%, 77% 0, 100% 0, 100% 100%, 0 100%)';
  return (
    <div className="relative w-full" style={{ containerType: 'inline-size' }}>
      <div
        className={`tr-ground tr-mincho relative aspect-[1.885] w-full overflow-hidden rounded-[3px] ${data.express ? 'tr-ground-express' : ''}`}
        style={{ clipPath: punched ? notch : undefined, boxShadow: '0 1px 0 #d9c8a1, 0 2px 0 #c9b68c, 0 3px 0 #b9a57b, 0 18px 30px -12px rgba(0,0,0,0.75)' }}
        aria-label={`硬券 ${data.from}から${data.to}ゆき`}
      >
        <div className="absolute inset-0 flex flex-col" style={{ padding: '3.4cqw 4.6cqw 3cqw', color: '#2D241C' }}>
          <div className="flex items-baseline justify-between" style={{ fontSize: '3.3cqw' }}>
            <span className="font-bold tracking-[0.2em]">東海道本線</span>
            <span className="font-bold" style={{ fontSize: '4.6cqw', letterSpacing: '0.5em' }}>
              {data.express ? '特急券' : '乗車券'}
            </span>
            <span className="font-sans font-bold tabular-nums tracking-[0.15em]" style={{ fontSize: '4.6cqw' }}>
              {data.serial}
            </span>
          </div>
          <div className="mt-[1.2cqw] h-px bg-[#2D241C]/50" />

          <div className="flex flex-1 items-center justify-center" style={{ gap: '4cqw' }}>
            <div className="text-center">
              <p className="font-bold leading-none" style={{ fontSize: '10.5cqw' }}>
                {spaced(data.from)}
              </p>
              <p className="mt-[0.6cqw] font-bold" style={{ fontSize: '3.4cqw' }}>
                から
              </p>
            </div>
            <svg viewBox="0 0 30 16" style={{ width: '7cqw' }} aria-hidden>
              <path d="M1 8h22M17 2l8 6-8 6" fill="none" stroke="#2D241C" strokeWidth="2.6" />
            </svg>
            <div className="text-center">
              <p className="font-bold leading-none text-[#7A2830]" style={{ fontSize: '10.5cqw' }}>
                {spaced(data.to)}
              </p>
              <p className="mt-[0.6cqw] font-bold" style={{ fontSize: '3.4cqw' }}>
                ゆき
              </p>
            </div>
          </div>

          {/* 下の段は左に寄せ、右はスタンプの場所に空けておく */}
          <div className="w-[60%] space-y-[0.4cqw]" style={{ fontSize: '3.3cqw' }}>
            <p className="font-bold" style={{ fontSize: '3.5cqw' }}>
              {data.express ? '一等 · 特急展望車' : '三等 · 普通列車'}
            </p>
            <p className="flex items-center gap-[1cqw] font-bold">
              {data.seat}
              <span className="opacity-50">·</span>
              <Icon style={{ width: '3.4cqw', height: '3.4cqw' }} strokeWidth={2.4} />
              <span className="truncate">{data.task}</span>
            </p>
            <p>
              營業キロ {data.km} 粁 · 運賃 <span className="font-bold">{data.fare}</span>
            </p>
            <p className="opacity-75" style={{ fontSize: '2.7cqw' }}>
              下車前途無效 · 發賣當日限リ有效
            </p>
          </div>
        </div>

        {/* 日付印（紫） */}
        <div className="tr-ink absolute grid place-items-center rounded-full text-center font-bold text-[#5B3A82]" style={{ width: '18cqw', height: '18cqw', right: '4cqw', bottom: '4.5cqw', border: '0.55cqw solid #5B3A82', transform: 'rotate(-14deg)', opacity: 0.8 }}>
          <span style={{ fontSize: '2.6cqw', lineHeight: 1.1 }}>
            {data.from}驛
            <span className="my-[0.4cqw] block border-y border-[#5B3A82] px-[1cqw] font-sans tabular-nums" style={{ fontSize: '3.2cqw' }}>
              {stampDate(data.date)}
            </span>
            發行
          </span>
        </div>

        {/* 乗車記念（朱の丸いスタンプ）。到着印を押すときは、その場所を譲る */}
        {!stamp && (
          <div className="tr-ink absolute grid place-items-center rounded-full text-center font-bold text-[#C0392B]" style={{ width: '15cqw', height: '15cqw', right: '21cqw', bottom: '3cqw', border: '0.5cqw solid #C0392B', transform: 'rotate(10deg)', opacity: 0.72 }}>
            <span className="block" style={{ width: '10cqw' }}>
              <span className="block" style={{ fontSize: '2.4cqw', letterSpacing: '0.2em' }}>
                乗車記念
              </span>
              <Loco color="#C0392B" />
            </span>
          </div>
        )}

        {stamp && (
          <div className="tr-ink absolute grid place-items-center rounded-[1cqw] text-center font-bold text-[#C0392B]" style={{ right: '22cqw', bottom: '6cqw', padding: '0.8cqw 1.6cqw', border: '0.55cqw solid #C0392B', transform: 'rotate(-10deg)', opacity: 0.85, fontSize: '3.2cqw', letterSpacing: '0.2em' }}>
            {stamp}
          </div>
        )}
      </div>
    </div>
  );
}
