import { useApp } from '@/store/AppStore';
import { airportByCode, flightNo } from './airports';
import { PassCard } from './PassCard';
import { Barcode2D } from './parts';
import type { ProfileCardProps } from '../types';

/**
 * 航空の旅のパス：予約の画面と同じ「ダーク × Liquid Glass」の搭乗券（ドットの世界地図の透かし・アンバーの差し色）。
 * 出発空港 → DESTINATION。行き先の空港コードは、いまの予約か最後に飛んだ便の到着空港。まだ飛んでいなければ「GOAL」。
 * 行き先の名前はユーザーの目標（なければ空港の名前）。距離はログブックの合計、時間は累計の集中。
 */
export function BoardingPass({ info }: ProfileCardProps) {
  const { name, goal, totalMinutes, sessions, settings } = info;
  const { logs } = useApp();
  const flights = logs.filter((l) => l.mode === 'flight').sort((a, b) => b.endedAt - a.endedAt);
  const home = airportByCode(settings.flightFrom || 'HND');
  const last = flights[0] ? airportByCode(flights[0].to) : null;
  const miles = Math.round(flights.reduce((sum, l) => sum + l.km, 0));
  const dest = goal.trim() || last?.name || '目標';
  const seat = `${(sessions % 38) + 1}${'ACDF'[sessions % 4]}`;
  return (
    <div className="fl-root relative overflow-hidden rounded-[30px] bg-[#050608] p-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)]" aria-label={`搭乗券 ${name} ${home.code}から${dest}`}>
      {/* ガラスが透けて見えるよう、うしろに色の光をにじませる */}
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_35%_at_20%_30%,rgba(255,159,10,0.3),transparent),radial-gradient(50%_40%_at_85%_70%,rgba(10,132,255,0.28),transparent)]" />
      <div className="relative">
        <PassCard
          compact
          data={{
            from: { code: home.code, name: home.name },
            to: { code: last?.code ?? 'GOAL', name: dest },
            minutes: totalMinutes,
            km: miles,
            seat,
            task: name,
            icon: 'target',
            date: new Date(),
            board: `${flights.length} 便`,
            flight: flightNo(`${name}${home.code}${dest}`),
          }}
          stub={
            <div className="fl-glass relative overflow-hidden rounded-b-[26px] px-5 pb-4 pt-3">
              <Barcode2D seed={name + dest} className="h-[52px] w-full" />
              <p className="fl-num mt-1.5 flex justify-between text-[11px] font-semibold tracking-[0.12em] text-white/55">
                <span>PASSENGER · {name}</span>
                <span>MILEAGE {miles.toLocaleString()} km</span>
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
