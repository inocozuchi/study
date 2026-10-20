import { fmtDuration, pad } from '@/lib/time';
import { goalName, originName } from './stations';
import type { ProfileCardProps } from '../types';


function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** マルス券の地紋：小さな輪の模様をすき間なく敷く（うすい緑の紙に、さらに淡い緑で刷る） */
const GROUND = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='19' viewBox='0 0 22 19'><g fill='none' stroke='#a9d6c5' stroke-width='0.55' opacity='0.55'><circle cx='11' cy='9.5' r='7.6'/><circle cx='11' cy='9.5' r='5.2'/><path d='M8 7.4 Q11 5.6 14 7.4 M8 11.6 Q11 13.4 14 11.6'/><circle cx='0' cy='0' r='3'/><circle cx='22' cy='0' r='3'/><circle cx='0' cy='19' r='3'/><circle cx='22' cy='19' r='3'/></g></svg>`,
)}")`;

/** 文字の間をあけて刷る（「乗　車　券」「南　千　歳」のように） */
const spaced = (s: string) => Array.from(s).join('　');
/** 数字を全角に（券面の数字は幅がそろっている） */
const wide = (s: string) => s.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0));

/**
 * 列車のきっぷ：JR のマルス端末で発券した「乗車券・特急券」の見た目。
 * うすい緑の地紋の紙、ドットのように詰まった印字、下の段の水色の帯。〇〇様・出発駅 → 行き先（＝目標）
 */
export function Ticket({ info }: ProfileCardProps) {
  const { name, totalMinutes, sessions, settings } = info;
  const now = new Date();
  const express = settings.trainClass === 'express';
  const from = originName(settings);
  const to = goalName(settings);
  const h = hash(name + from + to);
  const dep = new Date(Math.ceil(now.getTime() / (5 * 60_000)) * 5 * 60_000);
  const arr = new Date(dep.getTime() + (settings.pomodoroFocus + settings.pomodoroShortBreak) * 4 * 60_000);
  const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const no = (settings.pomodoroFocus % 30) + 1;
  const car = (h % 8) + 1;
  const row = (sessions % 15) + 1;
  const seat = 'ABCD'[(h >>> 4) % 4];
  const base = 140 + Math.round((totalMinutes * 2) / 10) * 10;
  const ltd = express ? 1290 + Math.round(totalMinutes / 60) * 10 : 0;
  const ymd = `${now.getFullYear()}.-${now.getMonth() + 1}.${pad(now.getDate())}`;
  const serial = String(h % 100000).padStart(5, '0');
  const ink = '#2B2523';

  return (
    <div
      className="relative aspect-[1.48] w-full overflow-hidden rounded-[6px] shadow-[0_14px_30px_-16px_rgba(20,50,30,0.55)]"
      style={{ containerType: 'inline-size', backgroundColor: '#DDF0E7', backgroundImage: `${GROUND}, linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0))`, color: ink, fontFamily: 'var(--font-text)' }}
      aria-label={`きっぷ ${from}から${to}`}
    >

      <div className="absolute inset-0 flex flex-col leading-[1.15] [&>*]:shrink-0" style={{ padding: '3.6cqw 5.2cqw 3cqw', fontSize: '3.6cqw', fontWeight: 600 }}>
        <p className="truncate" style={{ fontSize: '3.5cqw' }}>【集中旅行トクだ値（{name} 様専用）】</p>
        <div className="flex items-end gap-[1.5cqw]" style={{ fontSize: '5cqw' }}>
          <span className="rounded-[0.4cqw] px-[0.6cqw] leading-none" style={{ border: `0.35cqw solid ${ink}`, fontSize: '4.3cqw' }}>
            C制
          </span>
          <span className="whitespace-nowrap tracking-[0.05em]">{express ? `${spaced('乗車券')}・${spaced('特急券')}` : `${spaced('乗車券')}・${spaced('普通列車')}`}</span>
          <span className="whitespace-nowrap" style={{ fontSize: '3.4cqw' }}>＊＊＊＊＊</span>
        </div>
        <div className="flex items-start justify-between" style={{ fontSize: '3.4cqw' }}>
          <span>
            （企）{String(200 + (h % 99))}
            <span className="ml-[2cqw] inline-block align-middle" style={{ width: '33cqw', height: '0.45cqw', background: ink }} />
          </span>
          <span className="tracking-[0.08em]">乗車券当日限り有効</span>
        </div>

        {/* 区間 */}
        <div className="mt-[1cqw] flex items-center gap-[2.4cqw] whitespace-nowrap" style={{ fontSize: '7.8cqw', fontWeight: 800, lineHeight: 1 }}>
          <span className="min-w-0 truncate tracking-[0.18em]">{spaced(from)}</span>
          <svg viewBox="0 0 24 16" style={{ width: '6.4cqw', height: '4.4cqw' }} aria-hidden>
            <path d="M1 8 H17 M12 2.5 L19.5 8 L12 13.5" fill="none" stroke={ink} strokeWidth="3.2" strokeLinejoin="miter" />
          </svg>
          <span className="min-w-0 truncate tracking-[0.18em]" style={{ color: '#3A2420' }}>{spaced(to)}</span>
        </div>

        <div className="mt-[0.8cqw] flex justify-between whitespace-nowrap" style={{ fontSize: '4.2cqw' }}>
          <span>
            {wide(String(now.getMonth() + 1))}月{wide(String(now.getDate()))}日（{wide(hm(dep))}発）（{hm(arr)}着）
          </span>
          <span>C{wide(String(10 + (h % 89)))}</span>
        </div>
        <div className="flex items-center justify-between whitespace-nowrap" style={{ fontSize: '4.4cqw' }}>
          <span>{express ? `しゅうちゅう ${wide(String(no))}号` : '普通列車'}</span>
          <span className="flex items-center gap-[1.2cqw]">
            {express ? (
              <>
                {wide(String(car))}号車 {wide(String(row))}番{seat}席
              </>
            ) : (
              '自由席'
            )}
            {/* 禁煙の印 */}
            <svg viewBox="0 0 20 20" style={{ width: '4.6cqw', height: '4.6cqw' }} aria-label="禁煙">
              <circle cx="10" cy="10" r="8.4" fill="none" stroke={ink} strokeWidth="1.6" />
              <rect x="4.5" y="9" width="9" height="2.4" fill="none" stroke={ink} strokeWidth="1" />
              <path d="M4.2 4.2 L15.8 15.8" stroke={ink} strokeWidth="1.6" />
            </svg>
          </span>
        </div>
        <div className="flex items-baseline gap-[3cqw] whitespace-nowrap">
          <span style={{ fontSize: '5.6cqw', fontWeight: 800 }}>¥{(base + ltd).toLocaleString()}</span>
          <span style={{ fontSize: '3.4cqw' }}>{express ? `内訳：乗${base.toLocaleString()}・特${ltd.toLocaleString()}` : `累計乗車 ${fmtDuration(totalMinutes)}`}</span>
        </div>

        {/* 水色の帯（券面の下の段との境目） */}
        <div className="shrink-0" style={{ margin: '1cqw -5.2cqw 0.6cqw', height: '4.2cqw', background: 'rgba(132, 214, 205, 0.5)' }} />
        <div className="flex justify-between whitespace-nowrap" style={{ fontSize: '3.6cqw' }}>
          <span>
            <span style={{ fontSize: '4.4cqw', fontWeight: 800 }}>{name}</span> 様
          </span>
          <span>{express ? `累計 ${fmtDuration(totalMinutes)}` : '途中下車できます'}</span>
        </div>
        <div className="flex justify-between whitespace-nowrap" style={{ fontSize: '3.4cqw' }}>
          <span>下車前途無効</span>
          <span>R{String((h >>> 8) % 1000).padStart(3, '0')}</span>
        </div>
        <div className="flex justify-between whitespace-nowrap" style={{ fontSize: '3.4cqw' }}>
          <span>
            {ymd}フォーカス{(sessions % 20) + 1}（2-タ）
          </span>
          <span>{serial}-01</span>
        </div>
        <div className="flex justify-between whitespace-nowrap" style={{ fontSize: '3.4cqw' }}>
          <span className="min-w-0 truncate">
            Focus Trail 発券 {ymd}
            {from}駅ＶＦ２
          </span>
          <span className="ml-[2cqw]">{String((h >>> 12) % 100000).padStart(5, '0')}-01</span>
        </div>
      </div>
    </div>
  );
}
