import { memo, type ReactElement } from 'react';
import { seeded } from '@/lib/id';
import { TILE } from './layout';

/**
 * 窓の外の絵（L1〜L4）。どれも横に繰り返すタイルで、窓の座標（高さ h、地平線 hz）に描く。
 * 動かすのはタイルを並べた div の transform だけ（絵は一度描いたら変えない）。
 * 時間帯の色はタイルを描き直さず、上に重ねる半透明（TrainStage）で変える。
 */

type Art = { h: number; hz: number };

/** n 枚並べる */
function Repeat({ n, tile, h, children }: { n: number; tile: number; h: number; children: ReactElement }) {
  return (
    <svg width={tile * n} height={h} viewBox={`0 0 ${tile * n} ${h}`} className="block overflow-visible" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <g key={i} transform={`translate(${i * tile} 0)`}>
          {children}
        </g>
      ))}
    </svg>
  );
}

// ───────────── L1：雲 ─────────────

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-60 0 Q-62 -16 -44 -18 Q-40 -38 -16 -36 Q-4 -54 18 -42 Q38 -50 44 -30 Q64 -30 62 -10 Q66 2 50 2 L-50 2 Q-62 2 -60 0 Z" fill="#FFFFFF" opacity="0.92" />
      <path d="M-56 -2 Q-20 -10 20 -6 Q44 -10 58 -4 L56 2 L-52 2 Z" fill="#DCE6F2" opacity="0.9" />
    </g>
  );
}

export const CloudTiles = memo(function CloudTiles({ h, n }: Art & { n: number }) {
  const T = TILE.clouds;
  return (
    <Repeat n={n} tile={T} h={h}>
      <g>
        <Cloud x={160} y={h * 0.2} s={0.9} />
        <Cloud x={520} y={h * 0.12} s={0.6} />
        <Cloud x={840} y={h * 0.27} s={1.15} />
        <Cloud x={1210} y={h * 0.16} s={0.75} />
      </g>
    </Repeat>
  );
});

// ───────────── L2：遠くの山 ─────────────

function ridge(T: number, base: number, peaks: [number, number][]) {
  let d = `M0 ${base}`;
  let px = 0;
  let py = base;
  for (const [x, y] of peaks) {
    const cx = (px + x) / 2;
    d += ` C${cx} ${py} ${cx} ${y} ${x} ${y}`;
    px = x;
    py = y;
  }
  const cx = (px + T) / 2;
  d += ` C${cx} ${py} ${cx} ${base} ${T} ${base} L${T} ${base + 200} L0 ${base + 200} Z`;
  return d;
}

/** 遠くの連峰（とがった稜線。高い峰には雪） */
const FAR_PEAKS: [number, number][] = [
  [0, 0.12], [60, 0.17], [118, 0.29], [150, 0.26], [192, 0.33], [255, 0.2], [318, 0.24], [400, 0.14], [468, 0.27],
  [522, 0.37], [562, 0.31], [612, 0.22], [700, 0.17], [778, 0.27], [812, 0.24], [850, 0.19], [930, 0.15], [1000, 0.12],
];

function farRange(h: number, hz: number) {
  const pts = FAR_PEAKS.map(([x, y]) => [x, hz - h * y] as const);
  const d = `M${pts.map(([x, y]) => `${x} ${y}`).join(' L')} L1000 ${hz + 200} L0 ${hz + 200} Z`;
  const snow: string[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    if (FAR_PEAKS[i][1] < 0.29) continue;
    const [lx, ly] = pts[i - 1];
    const [rx, ry] = pts[i + 1];
    const a = 0.32;
    const L = [x + (lx - x) * a, y + (ly - y) * a];
    const R = [x + (rx - x) * a, y + (ry - y) * a];
    snow.push(`M${L[0]} ${L[1]} L${x} ${y} L${R[0]} ${R[1]} L${(x + R[0]) / 2} ${R[1] - 3} L${x + 1} ${(y + R[1]) / 2 + 4} L${(x + L[0]) / 2} ${L[1] - 2} Z`);
  }
  return { d, snow: snow.join(' ') };
}

export const MountainTiles = memo(function MountainTiles({ h, hz, n }: Art & { n: number }) {
  const T = TILE.mountains;
  const far = farRange(h, hz);
  const near = ridge(T, hz + 2, [
    [90, hz - h * 0.09],
    [260, hz - h * 0.04],
    [420, hz - h * 0.12],
    [610, hz - h * 0.05],
    [760, hz - h * 0.1],
    [900, hz - h * 0.05],
  ]);
  return (
    <Repeat n={n} tile={T} h={h}>
      <g>
        <path d={far.d} fill="#A9BCD5" />
        <path d={far.snow} fill="#F1F5FA" opacity="0.92" />
        <path d={near} fill="#8EA6BF" />
        <path d={ridge(T, hz + 2, [[180, hz - h * 0.035], [520, hz - h * 0.05], [840, hz - h * 0.03]])} fill="#7F9C8C" />
      </g>
    </Repeat>
  );
});

// ───────────── L3：田園・麦畑・集落・ビニールハウス・小川 ─────────────

type Field = { x: number; w: number; kind: number };

function fields(seed: number, T: number) {
  const r = seeded(seed);
  const out: Field[] = [];
  let x = 0;
  while (x < T) {
    const w = Math.min(T - x, 90 + r() * 170);
    out.push({ x, w, kind: Math.floor(r() * 4) });
    x += w;
  }
  return out;
}

const FIELD_FILL = ['#A9CF7F', '#E4C66F', '#B7D68C', '#C7A57B'];
const FIELD_LINE = ['#93BC69', '#CBA955', '#9FC274', '#AD8A62'];

function House({ x, y, w, roof, wall = '#F2ECDD' }: { x: number; y: number; w: number; roof: string; wall?: string }) {
  const hgt = w * 0.42;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2} y={-hgt} width={w} height={hgt} fill={wall} />
      <rect x={-w / 2} y={-hgt} width={w} height={hgt * 0.18} fill="#000" opacity="0.08" />
      <path d={`M${-w / 2 - 4} ${-hgt} L${-w / 2 + w * 0.18} ${-hgt - w * 0.3} L${w / 2 - w * 0.18} ${-hgt - w * 0.3} L${w / 2 + 4} ${-hgt} Z`} fill={roof} />
      <rect x={-w * 0.3} y={-hgt * 0.62} width={w * 0.14} height={hgt * 0.32} fill="#5B6670" />
      <rect x={w * 0.1} y={-hgt * 0.62} width={w * 0.2} height={hgt * 0.32} fill="#5B6670" />
    </g>
  );
}

function Tree({ x, y, s, c = '#6E9C5C' }: { x: number; y: number; s: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-1.2" y="-8" width="2.4" height="8" fill="#6B5444" />
      <circle cx="0" cy="-14" r="9" fill={c} />
      <circle cx="-5" cy="-10" r="6" fill={c} />
      <circle cx="5" cy="-11" r="6.5" fill={c} />
      <circle cx="2" cy="-17" r="5" fill="#fff" opacity="0.12" />
    </g>
  );
}

function Greenhouse({ x, y, w }: { x: number; y: number; w: number }) {
  const hh = w * 0.32;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M${-w / 2} 0 L${-w / 2} ${-hh * 0.45} Q${-w / 2} ${-hh} 0 ${-hh} Q${w / 2} ${-hh} ${w / 2} ${-hh * 0.45} L${w / 2} 0 Z`} fill="#EEF3F0" opacity="0.92" />
      {Array.from({ length: 6 }, (_, i) => {
        const xx = -w / 2 + (w / 5) * i;
        return <path key={i} d={`M${xx} 0 L${xx} ${-hh * 0.6}`} stroke="#C9D3CE" strokeWidth="1" />;
      })}
      <path d={`M${-w / 2} ${-hh * 0.45} Q${-w / 2} ${-hh} 0 ${-hh} Q${w / 2} ${-hh} ${w / 2} ${-hh * 0.45}`} stroke="#C9D3CE" strokeWidth="1.2" fill="none" />
      <path d={`M${-w * 0.3} ${-hh * 0.8} Q0 ${-hh * 0.98} ${w * 0.25} ${-hh * 0.85}`} stroke="#fff" strokeWidth="2" fill="none" opacity="0.8" />
    </g>
  );
}

/** 家の窓の明かり（夜だけ。タイルとは別の層で opacity を変える） */
export const HOUSES: { x: number; band: number; w: number; roof: string }[] = [
  { x: 90, band: 0, w: 34, roof: '#4D5866' },
  { x: 128, band: 0, w: 22, roof: '#B65A43' },
  { x: 330, band: 1, w: 40, roof: '#4D5866' },
  { x: 560, band: 0, w: 28, roof: '#4F8A8B' },
  { x: 860, band: 1, w: 36, roof: '#B65A43' },
  { x: 905, band: 1, w: 24, roof: '#4D5866' },
  { x: 1090, band: 0, w: 30, roof: '#4D5866' },
];

export function countryBands(hz: number) {
  return [hz + 14, hz + 40];
}

export const CountryTiles = memo(function CountryTiles({ h, hz, n }: Art & { n: number }) {
  const T = TILE.country;
  const [b0, b1] = countryBands(hz);
  const rows = [
    { y0: hz + 4, y1: b0, f: fields(11, T) },
    { y0: b0, y1: b1, f: fields(23, T) },
    { y0: b1, y1: h, f: fields(37, T) },
  ];
  const r = seeded(91);
  const treeLine: string[] = [];
  for (let x = 0; x <= T; x += 14) treeLine.push(`${x} ${hz + 2 - (4 + r() * 8)}`);
  return (
    <Repeat n={n} tile={T} h={h}>
      <g>
        <rect x="0" y={hz} width={T} height={h - hz} fill="#9DC57A" />
        {/* 遠くの林 */}
        <path d={`M0 ${hz + 6} L${treeLine.join(' L')} L${T} ${hz + 6} Z`} fill="#6F9A66" />
        {/* 田んぼ・麦畑・畑（あぜ道で区切る） */}
        {rows.map((row, ri) =>
          row.f.map((f, i) => (
            <g key={`${ri}-${i}`}>
              <rect x={f.x + 1} y={row.y0 + 1} width={f.w - 2} height={row.y1 - row.y0 - 2} fill={FIELD_FILL[f.kind]} />
              {Array.from({ length: Math.floor((row.y1 - row.y0) / (3 + ri * 2)) }, (_, k) => (
                <path key={k} d={`M${f.x + 2} ${row.y0 + 3 + k * (3 + ri * 2)} L${f.x + f.w - 2} ${row.y0 + 3 + k * (3 + ri * 2)}`} stroke={FIELD_LINE[f.kind]} strokeWidth={0.8 + ri * 0.4} opacity="0.7" />
              ))}
              {f.kind === 1 && ri === 2 && <path d={`M${f.x + 4} ${row.y0 + 6} l4 -4 m6 4 l4 -4 m6 4 l4 -4 m6 4 l4 -4`} stroke="#F2DC92" strokeWidth="1.2" />}
            </g>
          )),
        )}
        {/* 小川と小さな橋 */}
        <path d={`M640 ${hz + 4} C700 ${hz + 20} 660 ${b1} 760 ${b1 + 14} S880 ${h - 20} 960 ${h}`} stroke="#9FD0E6" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d={`M640 ${hz + 4} C700 ${hz + 20} 660 ${b1} 760 ${b1 + 14} S880 ${h - 20} 960 ${h}`} stroke="#E4F4FA" strokeWidth="2" fill="none" strokeDasharray="10 14" />
        <path d={`M736 ${b1 + 6} L780 ${b1 + 6} L780 ${b1 + 10} L736 ${b1 + 10} Z`} fill="#A0785A" />
        {/* 鎮守の森と鳥居 */}
        <path d={`M440 ${b0} Q446 ${b0 - 34} 480 ${b0 - 36} Q514 ${b0 - 34} 520 ${b0} Z`} fill="#4F7A52" />
        <g transform={`translate(468 ${b0})`} fill="#D2553E">
          <rect x="-9" y="-13" width="2" height="13" />
          <rect x="7" y="-13" width="2" height="13" />
          <rect x="-12" y="-15" width="24" height="2.4" />
          <rect x="-10" y="-11" width="20" height="1.4" />
        </g>
        {/* ビニールハウス */}
        <Greenhouse x={230} y={b1 - 2} w={46} />
        <Greenhouse x={282} y={b1 - 2} w={46} />
        <Greenhouse x={1010} y={b0 + 12} w={34} />
        {/* 集落 */}
        {HOUSES.map((o, i) => (
          <House key={i} x={o.x} y={o.band === 0 ? b0 : b1 - 6} w={o.w} roof={o.roof} />
        ))}
        {/* 木（柿の木には実） */}
        <Tree x={60} y={b0} s={0.8} />
        <Tree x={160} y={b0 + 2} s={1} c="#7EAA60" />
        <Tree x={380} y={b1 - 4} s={1.3} />
        <Tree x={600} y={b0} s={0.9} c="#7EAA60" />
        <g>
          <Tree x={950} y={b1 - 4} s={1.2} c="#83A65A" />
          {[[-6, -16], [4, -20], [7, -12], [-2, -10]].map(([dx, dy], i) => (
            <circle key={i} cx={950 + dx * 1.2} cy={b1 - 4 + dy * 1.2} r="1.6" fill="#EE8A3C" />
          ))}
        </g>
        <Tree x={1150} y={b0} s={1.1} />
      </g>
    </Repeat>
  );
});

/** 家の窓の明かり（夜） */
export const CountryLights = memo(function CountryLights({ h, hz, n }: Art & { n: number }) {
  const T = TILE.country;
  const [b0, b1] = countryBands(hz);
  return (
    <Repeat n={n} tile={T} h={h}>
      <g>
        {HOUSES.map((o, i) => {
          const y = o.band === 0 ? b0 : b1 - 6;
          const hgt = o.w * 0.42;
          return (
            <g key={i}>
              <rect x={o.x - o.w * 0.3} y={y - hgt * 0.62} width={o.w * 0.14} height={hgt * 0.32} fill="#FFD27A" />
              <rect x={o.x + o.w * 0.1} y={y - hgt * 0.62} width={o.w * 0.2} height={hgt * 0.32} fill="#FFD27A" />
            </g>
          );
        })}
      </g>
    </Repeat>
  );
});

// ───────────── L4：線路ぎわ（電柱・架線・草・バラスト） ─────────────

export const TrackTiles = memo(function TrackTiles({ h, n }: Art & { n: number }) {
  const T = TILE.track;
  const g = h * 0.84;
  const px = 40;
  // 架線はロールカーテンの下から見える高さに
  const wy = h * 0.21;
  const r = seeded(5);
  const tufts = Array.from({ length: 9 }, () => ({ x: r() * T, s: 0.7 + r() * 0.8 }));
  return (
    <Repeat n={n} tile={T} h={h}>
      <g>
        {/* 土手の草とバラスト */}
        <path d={`M0 ${g} Q${T * 0.25} ${g - 5} ${T * 0.5} ${g} T${T} ${g} L${T} ${h} L0 ${h} Z`} fill="#6E9D53" />
        <rect x="0" y={h - h * 0.05} width={T} height={h * 0.05} fill="#8C8577" />
        {Array.from({ length: 14 }, (_, i) => (
          <circle key={i} cx={(i * T) / 14 + 6} cy={h - h * 0.025 + ((i * 7) % 5) - 2} r={2 + (i % 3)} fill={i % 2 ? '#A39C8E' : '#76705F'} />
        ))}
        {tufts.map((t, i) => (
          <path key={i} d={`M${t.x} ${g + 6} l${-3 * t.s} ${-12 * t.s} M${t.x + 2} ${g + 6} l${1 * t.s} ${-15 * t.s} M${t.x + 4} ${g + 6} l${5 * t.s} ${-11 * t.s}`} stroke="#5C8A45" strokeWidth="1.6" strokeLinecap="round" />
        ))}
        {/* 架線（次の電柱までたるむ） */}
        {[0, 7, 14].map((dy, i) => (
          <path key={i} d={`M${px - 26 + i * 26} ${wy + dy * 0.3} Q${px + T / 2} ${wy + dy * 0.3 + 18} ${px + T - 26 + i * 26} ${wy + dy * 0.3}`} stroke="#3A3F44" strokeWidth="1.1" fill="none" />
        ))}
        {/* 電柱 */}
        <rect x={px - 5} y={-20} width={10} height={g + 26} fill="#8E949A" />
        <rect x={px - 5} y={-20} width={3.5} height={g + 26} fill="#A9AFB4" />
        <rect x={px - 36} y={wy - 6} width={72} height={5} fill="#6D7378" />
        {[-26, 0, 26].map((dx) => (
          <rect key={dx} x={px + dx - 2.5} y={wy - 11} width={5} height={6} rx="1.5" fill="#E8E4D8" />
        ))}
        <rect x={px - 6} y={h * 0.45} width={12} height={16} fill="#E2D9BF" />
      </g>
    </Repeat>
  );
});

// ───────────── L4 のときどき現れるもの：踏切・駅・信号場 ─────────────

export const CROSSING_W = 170;

/** 踏切（遮断機は下りている。警報灯は交互に点滅） */
export function Crossing({ h }: { h: number }) {
  const g = h * 0.84;
  return (
    <svg width={CROSSING_W} height={h} viewBox={`0 0 ${CROSSING_W} ${h}`} className="block overflow-visible" aria-hidden>
      <rect x="20" y={g - 2} width="130" height={h - g + 2} fill="#6A6C70" />
      <path d={`M30 ${g + 8} L140 ${g + 8}`} stroke="#E9E6DC" strokeWidth="2" strokeDasharray="12 8" />
      {/* 遮断機 */}
      <rect x="14" y={g - h * 0.2} width="132" height="6" fill="#F2C230" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={20 + i * 18} y={g - h * 0.2} width="9" height="6" fill="#2A2A2A" />
      ))}
      {/* 警報機 */}
      <rect x="148" y={g - h * 0.5} width="7" height={h * 0.5 + 4} fill="#F2C230" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x="148" y={g - h * 0.48 + i * 16} width="7" height="8" fill="#2A2A2A" />
      ))}
      <g transform={`translate(151.5 ${g - h * 0.56})`}>
        <path d="M-18 -10 L18 10 M-18 10 L18 -10" stroke="#F2C230" strokeWidth="7" />
        <path d="M-18 -10 L18 10 M-18 10 L18 -10" stroke="#2A2A2A" strokeWidth="7" strokeDasharray="5 5" />
      </g>
      <rect x="132" y={g - h * 0.44} width="39" height="10" rx="5" fill="#2A2A2A" />
      <circle className="tr-blink" cx="138" cy={g - h * 0.44 + 5} r="4.4" fill="#FF4A3A" />
      <circle className="tr-blink tr-blink-b" cx="165" cy={g - h * 0.44 + 5} r="4.4" fill="#FF4A3A" />
    </svg>
  );
}

export const STATION_W = 1100;

/** 駅のホーム（屋根・柱・駅名標・ベンチ・時計）。name はひらがなの駅名、roman は下の小さな字 */
export function Station({ h, name, roman, prev, next, terminal }: { h: number; name: string; roman: string; prev: string; next: string; terminal?: boolean }) {
  const W = STATION_W;
  const floor = h * 0.72;
  const roof = h * 0.19;
  const font = { fontFamily: 'var(--font-text)' };
  const cx = W / 2;
  const bw = Math.min(230, Math.max(170, name.length * 30 + 60));
  return (
    <svg width={W} height={h} viewBox={`0 0 ${W} ${h}`} className="block overflow-visible" aria-hidden>
      {/* 向こう側の柵と植え込み */}
      <rect x="0" y={floor - h * 0.1} width={W} height={h * 0.1} fill="#E6DCC6" />
      {Array.from({ length: 28 }, (_, i) => (
        <rect key={i} x={i * 40 + 4} y={floor - h * 0.1} width="3" height={h * 0.1} fill="#C9BDA3" />
      ))}
      <path d={`M0 ${floor - h * 0.1} ${Array.from({ length: 23 }, (_, i) => `Q${i * 50 + 25} ${floor - h * 0.15} ${i * 50 + 50} ${floor - h * 0.1}`).join(' ')}`} fill="#7FAE6A" />
      {/* ホームの床（手前ほど明るい）・点字ブロック・白線 */}
      <rect x="0" y={floor} width={W} height={h - floor} fill="#C9C3B6" />
      <rect x="0" y={floor} width={W} height={(h - floor) * 0.35} fill="#B8B2A5" />
      <rect x="0" y={h - h * 0.085} width={W} height={h * 0.03} fill="#F0C53A" />
      <rect x="0" y={h - h * 0.03} width={W} height={h * 0.03} fill="#EDEAE2" />
      {/* 屋根と柱（屋根の縁はロールカーテンの下に見える） */}
      <rect x="0" y={-10} width={W} height={roof + 10} fill="#5E646B" />
      {Array.from({ length: 28 }, (_, i) => (
        <rect key={i} x={i * 40} y={roof - 16} width="2" height="12" fill="#4F555B" />
      ))}
      <rect x="0" y={roof - 4} width={W} height="5" fill="#D9D5CB" />
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i}>
          <rect x={110 + i * 220} y={roof} width="12" height={floor - roof} fill="#7A8088" />
          <rect x={110 + i * 220} y={roof} width="4" height={floor - roof} fill="#9AA0A7" />
        </g>
      ))}
      {/* 時計 */}
      <g transform={`translate(${cx + 260} ${roof})`}>
        <rect x="-1" y="0" width="2" height="12" fill="#5E646B" />
        <circle cx="0" cy="24" r="12" fill="#FBFAF6" stroke="#5E646B" strokeWidth="2.5" />
        <path d="M0 24 L0 16 M0 24 L6 27" stroke="#2A2A2A" strokeWidth="1.6" strokeLinecap="round" />
      </g>
      {/* ベンチ */}
      <g transform={`translate(${cx - 270} ${floor + 4})`}>
        <rect x="-44" y="-26" width="88" height="6" rx="2" fill="#B07A4C" />
        <rect x="-44" y="-17" width="88" height="6" rx="2" fill="#9A673F" />
        <rect x="-38" y="-11" width="4" height="13" fill="#5E646B" />
        <rect x="34" y="-11" width="4" height="13" fill="#5E646B" />
      </g>
      {/* 駅名標 */}
      <g transform={`translate(${cx} ${h * 0.24})`} style={font}>
        <rect x={-bw / 2 + 12} y={h * 0.2} width="5" height={floor - h * 0.24 - h * 0.2} fill="#7A8088" />
        <rect x={bw / 2 - 17} y={h * 0.2} width="5" height={floor - h * 0.24 - h * 0.2} fill="#7A8088" />
        <rect x={-bw / 2} y="0" width={bw} height={h * 0.21} rx="3" fill="#FCFBF7" stroke="#C8C4BA" strokeWidth="1.5" />
        {terminal && (
          <text x={-bw / 2 + 10} y={h * 0.05} fontSize="10" fontWeight="700" fill="#D2553E">
            終着
          </text>
        )}
        <text x="0" y={h * 0.095} textAnchor="middle" fontSize={Math.min(30, h * 0.075)} fontWeight="700" fill="#1F2328" letterSpacing="2">
          {name}
        </text>
        <text x="0" y={h * 0.125} textAnchor="middle" fontSize="9" fontWeight="600" fill="#6B7076" letterSpacing="1.5">
          {roman}
        </text>
        <rect x={-bw / 2} y={h * 0.145} width={bw} height={h * 0.065} fill="#2F7D5B" />
        <text x={-bw / 2 + 8} y={h * 0.188} fontSize="10" fontWeight="700" fill="#fff">
          {prev ? `◀ ${prev}` : ''}
        </text>
        <text x={bw / 2 - 8} y={h * 0.188} textAnchor="end" fontSize="10" fontWeight="700" fill="#fff">
          {next ? `${next} ▶` : ''}
        </text>
      </g>
    </svg>
  );
}

export const SIGNAL_W = 140;

/** 信号場（一時停止中）：赤を出している信号機と小屋 */
export function SignalStop({ h }: { h: number }) {
  const g = h * 0.84;
  return (
    <svg width={SIGNAL_W} height={h} viewBox={`0 0 ${SIGNAL_W} ${h}`} className="block overflow-visible" aria-hidden>
      <rect x="6" y={g - h * 0.16} width="46" height={h * 0.16} fill="#C9BFA6" />
      <path d={`M2 ${g - h * 0.16} L29 ${g - h * 0.24} L56 ${g - h * 0.16} Z`} fill="#6D747B" />
      <rect x="22" y={g - h * 0.1} width="12" height={h * 0.1} fill="#7A6A58" />
      <rect x="98" y={g - h * 0.62} width="6" height={h * 0.62 + 4} fill="#8E949A" />
      <rect x="86" y={g - h * 0.74} width="30" height={h * 0.14} rx="5" fill="#26292D" />
      <circle cx="101" cy={g - h * 0.7} r="5.5" fill="#3A3E43" />
      <circle cx="101" cy={g - h * 0.645} r="5.5" fill="#FF3B30" />
      <circle cx="101" cy={g - h * 0.645} r="11" fill="#FF3B30" opacity="0.25" />
      <rect x="84" y={g - h * 0.36} width="34" height="16" rx="2" fill="#FCFBF7" />
      <text x="101" y={g - h * 0.36 + 11.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#1F2328" style={{ fontFamily: 'var(--font-text)' }}>
        信号場
      </text>
    </svg>
  );
}
