import { memo } from 'react';
import type { TrainLayout } from './layout';

/**
 * L5：国鉄の客車の車内（固定の前景）。窓の形に穴をあけた壁・木の窓枠・ロールカーテン・
 * 窓辺の小さなテーブル（コーヒーと参考書）・青いモケットの座席の背。
 * 一度描いたら変えない（走行中の揺れは外側の div の transform だけで出す）。
 */
export const WALL_TOP = '#3E2B20';
export const WALL_BOTTOM = '#25332F';

export const Interior = memo(function Interior({ L }: { L: TrainLayout }) {
  const { W, H, win } = L;
  const r = 18;
  const { x, y, w, h } = win;
  const hole = `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
  const sill = y + h + 10;
  const cx = W / 2;
  const tw = Math.min(250, w * 0.62);
  const curtain = Math.round(h * 0.13);
  const seatY = H * 0.86;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 block" aria-hidden>
      <defs>
        <linearGradient id="tr-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#35251C" />
          <stop offset="1" stopColor="#4D3628" />
        </linearGradient>
        <linearGradient id="tr-lower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2F403B" />
          <stop offset="1" stopColor="#1F2B28" />
        </linearGradient>
        <linearGradient id="tr-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8A5F3E" />
          <stop offset="1" stopColor="#6A472E" />
        </linearGradient>
        <linearGradient id="tr-table" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B07D52" />
          <stop offset="1" stopColor="#946440" />
        </linearGradient>
        <linearGradient id="tr-curtain" x1="0" y1="0" x2="1" y2="0">
          {Array.from({ length: 13 }, (_, i) => (
            <stop key={i} offset={i / 12} stopColor={i % 2 ? '#DCCDAA' : '#E9DDC0'} />
          ))}
        </linearGradient>
        <linearGradient id="tr-seat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B5C94" />
          <stop offset="1" stopColor="#2A4372" />
        </linearGradient>
      </defs>

      {/* 壁：窓より上は木目、下は化粧板 */}
      <path d={`M0 0 H${W} V${sill} H0 Z ${hole}`} fill="url(#tr-wood)" fillRule="evenodd" />
      {Array.from({ length: Math.ceil(y / 9) }, (_, i) => (
        <path key={i} d={`M0 ${i * 9 + 4} Q${W * 0.3} ${i * 9 + 2 + (i % 3)} ${W * 0.6} ${i * 9 + 5} T${W} ${i * 9 + 3}`} stroke="#5A4031" strokeWidth="1" fill="none" opacity="0.5" />
      ))}
      <rect x="0" y={sill} width={W} height={H - sill} fill="url(#tr-lower)" />
      {Array.from({ length: Math.ceil(W / 120) + 1 }, (_, i) => (
        <rect key={i} x={i * 120 - 1} y={sill + 30} width="1.5" height={H - sill - 30} fill="#000" opacity="0.18" />
      ))}

      {/* 網棚（荷物棚） */}
      <g opacity="0.85">
        <rect x="0" y={y * 0.16} width={W} height="3" fill="#B9B3A3" />
        <rect x="0" y={y * 0.16 + 14} width={W} height="2" fill="#8E897C" />
        {Array.from({ length: Math.ceil(W / 8) }, (_, i) => (
          <path key={i} d={`M${i * 8} ${y * 0.16 + 3} L${i * 8 + 8} ${y * 0.16 + 14}`} stroke="#8E897C" strokeWidth="0.7" />
        ))}
      </g>

      {/* ロールカーテン（少し下ろしてある） */}
      <rect x={x + 4} y={y} width={w - 8} height={curtain} fill="url(#tr-curtain)" />
      <rect x={x + 4} y={y + curtain - 2} width={w - 8} height="4" fill="#000" opacity="0.08" />
      <rect x={x + 2} y={y + curtain} width={w - 4} height="7" rx="3" fill="#6A472E" />
      <circle cx={x + w / 2} cy={y + curtain + 13} r="5" fill="none" stroke="#C9A86A" strokeWidth="2.2" />
      <rect x={x + w / 2 - 1} y={y + curtain + 6} width="2" height="3" fill="#C9A86A" />

      {/* 木の窓枠 */}
      <path d={hole} fill="none" stroke="url(#tr-frame)" strokeWidth="14" />
      <path d={hole} fill="none" stroke="#2A1C14" strokeWidth="2" opacity="0.7" />
      <path d={hole} fill="none" stroke="#C9A86A" strokeWidth="1" opacity="0.5" transform={`translate(0 -0.5)`} />

      {/* 窓台とテーブル */}
      <rect x={x - 10} y={y + h + 4} width={w + 20} height="12" rx="3" fill="#8A5F3E" />
      <rect x={x - 10} y={y + h + 4} width={w + 20} height="3" rx="1.5" fill="#B08560" />
      <path d={`M${cx - tw / 2} ${sill + 4} H${cx + tw / 2} L${cx + tw / 2 + 16} ${sill + 34} H${cx - tw / 2 - 16} Z`} fill="url(#tr-table)" />
      <path d={`M${cx - tw / 2 - 16} ${sill + 34} H${cx + tw / 2 + 16} V${sill + 42} H${cx - tw / 2 - 16} Z`} fill="#6E4A30" />
      {/* 壁に留めた折りたたみの金具 */}
      {[-1, 1].map((s) => (
        <path key={s} d={`M${cx + s * (tw / 2 - 18)} ${sill + 42} L${cx + s * (tw / 2 - 18)} ${sill + 64} L${cx + s * (tw / 2 - 48)} ${sill + 42}`} stroke="#8E929A" strokeWidth="3.2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      ))}

      {/* 座席の下の暖房（スリットの入ったカバー） */}
      <rect x="0" y={H * 0.8} width={W} height="22" fill="#1B2422" />
      {Array.from({ length: Math.ceil(W / 7) }, (_, i) => (
        <rect key={i} x={i * 7 + 2} y={H * 0.8 + 4} width="3" height="14" rx="1" fill="#2E3B37" />
      ))}

      {/* 参考書（閉じて置いてある）と鉛筆 */}
      <g transform={`translate(${cx - tw * 0.22} ${sill + 22})`}>
        <path d="M-40 -6 L26 -6 L34 8 L-32 8 Z" fill="#F1EADB" />
        <path d="M-40 -6 L26 -6 L34 8 L-32 8 Z" fill="none" stroke="#D6CCB6" strokeWidth="0.6" />
        {[0, 2, 4].map((d) => (
          <path key={d} d={`M-33 ${5 + d * 0.4} L33 ${5 + d * 0.4}`} stroke="#CFC4AC" strokeWidth="0.5" />
        ))}
        <path d="M-42 -14 L24 -14 L32 0 L-34 0 Z" fill="#3E6FA6" />
        <path d="M-42 -14 L-34 0 L-34 4 L-42 -10 Z" fill="#2F5684" />
        <path d="M-26 -10 L10 -10 L14 -4 L-22 -4 Z" fill="#F2DC92" />
        <path d="M18 -14 L19 -22 L22 -14" fill="#D2553E" />
        <path d="M-24 12 L22 4" stroke="#F2C230" strokeWidth="3" strokeLinecap="round" />
        <path d="M22 4 L26 3.3" stroke="#3A2E28" strokeWidth="1.6" strokeLinecap="round" />
      </g>

      {/* コーヒー */}
      <g transform={`translate(${cx + tw * 0.24} ${sill + 24})`}>
        <ellipse cx="0" cy="6" rx="20" ry="5" fill="#F4F1EA" />
        <ellipse cx="0" cy="5" rx="14" ry="3" fill="#DCD6C8" />
        <path d="M-11 -14 L-9 4 Q0 8 9 4 L11 -14 Z" fill="#F7F4EC" />
        <path d="M11 -10 Q20 -9 18 -2 Q16 2 9.5 1" stroke="#F7F4EC" strokeWidth="3" fill="none" />
        <ellipse cx="0" cy="-14" rx="11" ry="3" fill="#5A3A22" />
        <ellipse cx="-3" cy="-14.6" rx="4" ry="1" fill="#8A6040" opacity="0.7" />
        <path d="M-7 -8 Q-8 -2 -6 2" stroke="#fff" strokeWidth="1.4" opacity="0.6" fill="none" />
      </g>

      {/* 座席の背（青いモケットに白い枕カバー） */}
      {[
        { x: -40, w: Math.min(150, W * 0.36) },
        { x: W - Math.min(150, W * 0.36) + 40, w: Math.min(150, W * 0.36) },
      ].map((s, i) => (
        <g key={i}>
          <rect x={s.x} y={seatY} width={s.w} height={H - seatY + 20} rx="22" fill="url(#tr-seat)" />
          <rect x={s.x + 16} y={seatY + 6} width={s.w - 32} height="26" rx="6" fill="#F3F1EA" />
          <path d={`M${s.x + 20} ${seatY + 18} H${s.x + s.w - 20}`} stroke="#DAD6CB" strokeWidth="1" />
        </g>
      ))}
    </svg>
  );
});
