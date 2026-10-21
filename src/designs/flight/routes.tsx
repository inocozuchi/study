import { MAP, airportByCode, arc, distanceKm } from './airports';
import type { DesignRoutes, RouteArtProps } from '../types';

/** 航路図の道のり：羽田を出て東アジアを回り、羽田へ帰る周遊便（実際の大圏距離） */
const TOUR = ['HND', 'FUK', 'OKA', 'TPE', 'HKG', 'SHA', 'ICN', 'CTS', 'HND'].map(airportByCode);
const LEGS = TOUR.slice(1).map((b, i) => ({ path: arc(TOUR[i], b), km: distanceKm(TOUR[i], b) }));
const TOTAL = LEGS.reduce((s, l) => s + l.km, 0);
const CUM = LEGS.reduce<number[]>((acc, l) => [...acc, (acc[acc.length - 1] ?? 0) + l.km], []);

const VIEW = (() => {
  const pts = LEGS.flatMap((l) => [l.path.p0, l.path.p1, l.path.p2]);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs) - 120;
  const x1 = Math.max(...xs) + 120;
  const y0 = Math.min(...ys) - 80;
  const y1 = Math.max(...ys) + 80;
  // 横長のカードに合わせ、縦が収まるように横を広げる
  const h = y1 - y0;
  const w = Math.max(x1 - x0, h * 2.4);
  const cx = (x0 + x1) / 2;
  return `${cx - w / 2} ${y0} ${w} ${h}`;
})();

/** 航空：夜の地図に周遊便の航路。科目の累計だけ機体が進む */
function FlightRouteArt({ subject, progress, summited, className = '' }: RouteArtProps) {
  const km = TOTAL * (summited ? 1 : Math.min(1, progress));
  const leg = Math.min(LEGS.length - 1, CUM.findIndex((c) => c >= km - 0.01));
  const start = leg > 0 ? CUM[leg - 1] : 0;
  const t = Math.min(1, Math.max(0, (km - start) / LEGS[leg].km));
  const plane = LEGS[leg].path.at(t);
  return (
    <svg viewBox={VIEW} preserveAspectRatio="xMidYMid slice" className={className} aria-label={`周遊便 ${Math.round(km)} km`}>
      <rect x="-3000" y="-3000" width="9000" height="9000" fill="#050608" />
      <image href="./flight/map-dark.svg" x="0" y="0" width={MAP.width} height={MAP.height} />
      {LEGS.map((l, i) => (
        <path key={i} d={l.path.d} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="6" strokeDasharray="16 18" strokeLinecap="round" />
      ))}
      {LEGS.map((l, i) =>
        i < leg ? (
          <path key={`d${i}`} d={l.path.d} fill="none" stroke={subject.color} strokeWidth="10" strokeLinecap="round" />
        ) : i === leg ? (
          <path key={`d${i}`} d={l.path.d} fill="none" stroke={subject.color} strokeWidth="10" strokeLinecap="round" pathLength={1} strokeDasharray={`${t} 1`} />
        ) : null,
      )}
      {TOUR.slice(0, -1).map((a, i) => {
        const p = LEGS[i].path.p0;
        return (
          <g key={a.code}>
            <rect x={p.x - 13} y={p.y - 13} width="26" height="26" rx="7" fill={i <= leg ? '#FFD60A' : '#3A3E46'} />
            <text x={p.x} y={p.y - 26} textAnchor="middle" fontSize="40" fontWeight="700" fill="#FFFFFF" fillOpacity="0.85" fontFamily="-apple-system,system-ui,sans-serif">
              {a.code}
            </text>
          </g>
        );
      })}
      {/* 機体（機首は進む向き） */}
      <g transform={`translate(${plane.x} ${plane.y}) rotate(${plane.angle}) scale(2.6) translate(-24 -24)`}>
        <path fill="#FFFFFF" d="M46 24c0-1.6-1.6-2.4-3.4-2.4H31.2L21.6 6.4c-.4-.6-1-.9-1.7-.9h-2.3l4.6 16.1H11.8L8.6 17c-.3-.4-.8-.7-1.3-.7H5.5l2.3 7.7-2.3 7.7h1.8c.5 0 1-.3 1.3-.7l3.2-4.6h10.4l-4.6 16.1h2.3c.7 0 1.3-.3 1.7-.9l9.6-15.2h11.4C44.4 26.4 46 25.6 46 24Z" />
      </g>
    </svg>
  );
}

export const flightRoutes: DesignRoutes = {
  title: '航路図',
  unit: '航路',
  doneWord: '到着',
  tabs: ['飛行中の航路', 'ログブック'],
  lineName: '東アジア周遊便 · HND → HND',
  Art: FlightRouteArt,
  stops: TOUR.map((a, i) => ({ name: `${a.code} ${a.name}`, at: i === 0 ? 0 : CUM[i - 1] / TOTAL })),
  distance: (p) => `${Math.round(TOTAL * Math.min(1, p)).toLocaleString()} / ${TOTAL.toLocaleString()} km`,
  logMode: 'flight',
  chooseLabel: 'この航路を次のフライトに選ぶ',
};
