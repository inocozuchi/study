import { useApp } from '@/store/AppStore';
import { fmtDuration } from '@/lib/time';
import { goalName, originName } from './stations';
import { HardTicket } from './booking/HardTicket';
import { classOf, fare, lineById } from './booking/line';
import type { ProfileCardProps } from '../types';

function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * 列車の旅のパス：予約の画面と同じ「大正・昭和レトロの生成りの硬券」。
 * 出発駅（departure）→ 行き先（＝目標）。〇〇様・累計の乗車時間・乗った営業キロ（ログブックの合計）・選んでいる路線と種別。
 * 長い駅名・目標も省略せずに収める（HardTicket が字の大きさと行を合わせる）。
 */
export function Ticket({ info }: ProfileCardProps) {
  const { name, totalMinutes, settings } = info;
  const { logs } = useApp();
  const from = originName(settings);
  const to = goalName(settings);
  const cls = classOf(settings.trainClass);
  const km = Math.round(logs.filter((l) => l.mode === 'train').reduce((sum, l) => sum + l.km, 0) * 10) / 10;
  return (
    <div className="tr-wood rounded-[12px] p-3.5 shadow-[0_14px_30px_-16px_rgba(40,20,8,0.7)]">
      <div className="-rotate-[0.8deg]">
        <HardTicket
          data={{
            from,
            to,
            km,
            minutes: totalMinutes,
            seat: `${name} 様`,
            task: `累計 ${fmtDuration(totalMinutes)}`,
            icon: 'target',
            line: lineById(settings.trainLine).name,
            cls,
            fare: fare(km, cls),
            date: new Date(),
            serial: String(hash(name + from + to) % 10000).padStart(4, '0'),
          }}
        />
      </div>
    </div>
  );
}
