import { fullLine, lineById, trackToKm, project } from './booking/line';
import type { DesignRoutes, RouteArtProps } from '../types';

/** 路線図の路線：東海道・山陽本線（東京 → 下関） */
const LINE = lineById('tokaido');
const FULL_LINE = fullLine(LINE);
const STATIONS = LINE.stations;
const TOTAL_KM = LINE.totalKm;
const MAP = LINE.map;
/** 路線図に名前を出す駅 */
const MAJOR = LINE.major;
const toPts = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/** 路線の全体が収まる地図の範囲（カードの横長に合わせる。はみ出しは slice で切る） */
const VIEW = (() => {
  const xs = FULL_LINE.map((p) => p.x);
  const ys = FULL_LINE.map((p) => p.y);
  const pad = 70;
  const x0 = Math.min(...xs) - pad;
  const x1 = Math.max(...xs) + pad;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const w = x1 - x0;
  const h = w / 2.4;
  return `${x0} ${cy - h / 2 + 40} ${w} ${h}`;
})();

/** 列車：古地図の東海道・山陽本線に、科目の累計だけ線路が伸びた路線図 */
function TrainRouteArt({ subject, progress, summited, className = '' }: RouteArtProps) {
  const km = TOTAL_KM * (summited ? 1 : Math.min(1, progress));
  const done = trackToKm(LINE, km);
  const head = done[done.length - 1];
  const here = [...STATIONS].reverse().find((s) => s.km <= km + 0.01) ?? STATIONS[0];
  return (
    <svg viewBox={VIEW} preserveAspectRatio="xMidYMid slice" className={className} aria-label={`${LINE.name} ${here.name}まで`}>
      <rect x="-2000" y="-2000" width="6000" height="6000" fill="#F4EEDD" />
      <image href={LINE.mapUrl} x="0" y="0" width={MAP.width} height={MAP.height} />
      {/* 鉄道の記号（黒と白の旗竿） */}
      <polyline points={toPts(FULL_LINE)} fill="none" stroke="#2D241C" strokeWidth="9" strokeLinejoin="round" />
      <polyline points={toPts(FULL_LINE)} fill="none" stroke="#F4EEDD" strokeWidth="5" strokeDasharray="14 14" strokeLinejoin="round" />
      {/* 進んだところ（科目の色） */}
      <polyline points={toPts(done)} fill="none" stroke={subject.color} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      {STATIONS.filter((s) => MAJOR.includes(s.name)).map((s) => {
        const p = project(LINE, s.lon, s.lat);
        const reached = s.km <= km + 0.01;
        return (
          <g key={s.name}>
            <circle cx={p.x} cy={p.y} r="10" fill={reached ? subject.color : '#F4EEDD'} stroke="#2D241C" strokeWidth="4" />
            {(s.name === STATIONS[0].name || s.name === STATIONS[STATIONS.length - 1].name || s.name === here.name) && (
              <text x={p.x} y={p.y - 24} textAnchor="middle" fontSize="44" fontWeight="700" fill="#2D241C" fontFamily="'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif" paintOrder="stroke" stroke="#F4EEDD" strokeWidth="10">
                {s.name}
              </text>
            )}
          </g>
        );
      })}
      <circle cx={head.x} cy={head.y} r="17" fill={subject.color} stroke="#F4EEDD" strokeWidth="6" />
    </svg>
  );
}

export const trainRoutes: DesignRoutes = {
  title: '路線図',
  unit: '路線',
  doneWord: '全線完乗',
  tabs: ['乗車中の路線', '乗車の記録'],
  lineName: `${LINE.name} · ${STATIONS[0].name} → ${STATIONS[STATIONS.length - 1].name}`,
  Art: TrainRouteArt,
  stops: STATIONS.filter((s) => MAJOR.includes(s.name)).map((s) => ({ name: s.name, at: s.km / TOTAL_KM })),
  distance: (p) => `${(TOTAL_KM * Math.min(1, p)).toFixed(1)} / ${TOTAL_KM} km`,
  logMode: 'train',
  chooseLabel: 'この路線を次の旅に選ぶ',
};
