import { Plane } from 'lucide-react';

/** 地図の上の空港のピル [✈ HND]。selected＝アンバーの塗り、near＝ダイヤルの時間に近い候補（イエローの縁） */
export function AirportPill({ code, state = 'idle', onClick }: { code: string; state?: 'selected' | 'near' | 'idle' | 'origin' | 'endpoint'; onClick?: () => void }) {
  const styles: Record<string, string> = {
    selected: 'bg-[#FF9F0A] text-[#1A1206] shadow-[0_0_0_3px_rgba(255,159,10,0.28),0_6px_16px_-4px_rgba(255,159,10,0.55)]',
    endpoint: 'bg-[#FFD60A] text-[#1A1606] shadow-[0_0_0_3px_rgba(255,214,10,0.22)]',
    near: 'fl-tint text-[#FFD60A] !border-[#FFD60A]/55',
    origin: 'bg-white text-[#050608]',
    idle: 'fl-tint text-white/65',
  };
  const Comp = onClick ? 'button' : 'span';
  return (
    <Comp
      onClick={onClick}
      className={`fl-num pointer-events-auto flex items-center gap-[3px] whitespace-nowrap rounded-[7px] px-[6px] py-[2.5px] text-[10.5px] font-bold leading-none tracking-wide ${styles[state]} ${state === 'idle' ? 'scale-90 opacity-80' : ''}`}
    >
      <Plane size={10} strokeWidth={2.6} className="-rotate-45" />
      {code}
    </Comp>
  );
}

/** 出発地：白い二重丸 */
export function OriginMarker({ ping = false }: { ping?: boolean }) {
  return (
    <span className="relative grid h-5 w-5 place-items-center">
      {ping && <span className="fl-ping absolute inset-0 rounded-full border border-white/70" />}
      <span className="absolute inset-0 rounded-full border-2 border-white" />
      <span className="h-2 w-2 rounded-full bg-white" />
    </span>
  );
}

/** 上から見た旅客機のシルエット（白）。機首は右（0 度）向き */
export function PlaneGlyph({ size = 30, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
      <path
        fill={color}
        d="M46 24c0-1.6-1.6-2.4-3.4-2.4H31.2L21.6 6.4c-.4-.6-1-.9-1.7-.9h-2.3l4.6 16.1H11.8L8.6 17c-.3-.4-.8-.7-1.3-.7H5.5l2.3 7.7-2.3 7.7h1.8c.5 0 1-.3 1.3-.7l3.2-4.6h10.4l-4.6 16.1h2.3c.7 0 1.3-.3 1.7-.9l9.6-15.2h11.4C44.4 26.4 46 25.6 46 24Z"
      />
    </svg>
  );
}

function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * PDF417 ふうの 2 次元バーコード：何段もの行に、開始の模様・データの棒・終了の模様が並ぶ。
 * 中身は予約から決まる飾り（読み取れるコードではない）。
 */
export function Barcode2D({ seed, rows = 9, className = '', color = '#F5F6F8' }: { seed: string; rows?: number; className?: string; color?: string }) {
  const MODULES = 150;
  let h = hash(seed) || 7;
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const START = [8, 1, 1, 1, 1, 1, 1, 3];
  const STOP = [7, 1, 1, 3, 1, 1, 1, 2, 1];
  const rects: string[] = [];
  for (let r = 0; r < rows; r++) {
    let x = 0;
    const put = (widths: number[], startBar = true) => {
      widths.forEach((w, i) => {
        if ((i % 2 === 0) === startBar) rects.push(`M${x} ${r}h${w}v1h-${w}z`);
        x += w;
      });
    };
    put(START);
    // データ：17 モジュールずつの語（棒 4 本 + すき間 4 つ）
    const dataEnd = MODULES - 18;
    while (x + 17 <= dataEnd) {
      const ws: number[] = [];
      let left = 17;
      for (let k = 0; k < 7; k++) {
        const w = Math.max(1, Math.min(6, Math.round(1 + rand() * 3.2), left - (7 - k)));
        ws.push(w);
        left -= w;
      }
      ws.push(Math.max(1, left));
      put(ws);
    }
    x = dataEnd;
    put(STOP);
  }
  return (
    <svg viewBox={`0 0 ${MODULES} ${rows}`} preserveAspectRatio="none" className={className} aria-label="搭乗券のバーコード" role="img">
      <path d={rects.join('')} fill={color} shapeRendering="crispEdges" />
    </svg>
  );
}

/** 窓のピクトグラム（楕円の窓とシェード） */
export function WindowIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="6" y="2.5" width="12" height="19" rx="6" />
      <path d="M6.6 9h10.8" />
      <path d="M9.5 14.5c1.2-1 3.8-1 5 0" strokeLinecap="round" />
    </svg>
  );
}

/** 2 文字の時間表記（1h 22m / 45m） */
export function hm(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}
