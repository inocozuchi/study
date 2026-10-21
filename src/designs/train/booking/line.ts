import meta from './map.json';

/**
 * 列車の予約の路線：東海道本線（東京〜大阪）。駅の位置・営業キロは実際の値、所要時間は集中の時間に合わせた目安
 * （東京から 25 分＝小田原、50 分＝熱海、90 分＝静岡 …）。東京発・大阪発のどちらでも引ける。
 * 地図は scripts/build-maps.py の古地図ふうの東海道（public/train/map/tokaido.svg）。
 */
export interface Station {
  name: string;
  kana: string;
  roman: string;
  lat: number;
  lon: number;
  /** 東京からの営業キロ */
  km: number;
  /** 東京からの所要（分）。途中の点（駅でない）は undefined */
  min?: number;
}

/** 駅と、線路の形を作る途中の点（min のないもの） */
const LINE: Station[] = [
  { name: '東京', kana: 'とうきょう', roman: 'Tōkyō', lat: 35.681, lon: 139.767, km: 0, min: 0 },
  { name: '品川', kana: 'しながわ', roman: 'Shinagawa', lat: 35.628, lon: 139.739, km: 6.8, min: 5 },
  { name: '横濱', kana: 'よこはま', roman: 'Yokohama', lat: 35.466, lon: 139.622, km: 28.8, min: 15 },
  { name: '大船', kana: 'おおふな', roman: 'Ōfuna', lat: 35.354, lon: 139.531, km: 46.5, min: 20 },
  { name: '', kana: '', roman: '', lat: 35.31, lon: 139.35, km: 66 },
  { name: '小田原', kana: 'おだわら', roman: 'Odawara', lat: 35.256, lon: 139.155, km: 83.9, min: 25 },
  { name: '熱海', kana: 'あたみ', roman: 'Atami', lat: 35.104, lon: 139.078, km: 104.6, min: 50 },
  { name: '', kana: '', roman: '', lat: 35.075, lon: 138.955, km: 114 },
  { name: '沼津', kana: 'ぬまづ', roman: 'Numazu', lat: 35.102, lon: 138.86, km: 126.2, min: 60 },
  { name: '富士', kana: 'ふじ', roman: 'Fuji', lat: 35.162, lon: 138.676, km: 146.2, min: 75 },
  { name: '', kana: '', roman: '', lat: 35.06, lon: 138.52, km: 165 },
  { name: '靜岡', kana: 'しずおか', roman: 'Shizuoka', lat: 34.972, lon: 138.389, km: 180.2, min: 90 },
  { name: '', kana: '', roman: '', lat: 34.866, lon: 138.318, km: 193.7 },
  { name: '', kana: '', roman: '', lat: 34.838, lon: 138.176, km: 207.9 },
  { name: '掛川', kana: 'かけがわ', roman: 'Kakegawa', lat: 34.769, lon: 138.015, km: 229.3, min: 100 },
  { name: '濱松', kana: 'はままつ', roman: 'Hamamatsu', lat: 34.704, lon: 137.735, km: 257.1, min: 110 },
  { name: '', kana: '', roman: '', lat: 34.712, lon: 137.53, km: 276 },
  { name: '豐橋', kana: 'とよはし', roman: 'Toyohashi', lat: 34.763, lon: 137.382, km: 293.6, min: 125 },
  { name: '岡崎', kana: 'おかざき', roman: 'Okazaki', lat: 34.926, lon: 137.177, km: 325.9, min: 140 },
  { name: '名古屋', kana: 'なごや', roman: 'Nagoya', lat: 35.171, lon: 136.882, km: 366.0, min: 150 },
  { name: '岐阜', kana: 'ぎふ', roman: 'Gifu', lat: 35.41, lon: 136.757, km: 396.3, min: 165 },
  { name: '大垣', kana: 'おおがき', roman: 'Ōgaki', lat: 35.367, lon: 136.618, km: 410.0, min: 175 },
  { name: '', kana: '', roman: '', lat: 35.36, lon: 136.47, km: 428 },
  { name: '米原', kana: 'まいばら', roman: 'Maibara', lat: 35.315, lon: 136.29, km: 445.9, min: 190 },
  { name: '彦根', kana: 'ひこね', roman: 'Hikone', lat: 35.276, lon: 136.261, km: 451.9, min: 200 },
  { name: '', kana: '', roman: '', lat: 35.128, lon: 136.098, km: 476 },
  { name: '草津', kana: 'くさつ', roman: 'Kusatsu', lat: 35.022, lon: 135.96, km: 491.0, min: 215 },
  { name: '京都', kana: 'きょうと', roman: 'Kyōto', lat: 34.985, lon: 135.758, km: 513.6, min: 225 },
  { name: '', kana: '', roman: '', lat: 34.85, lon: 135.62, km: 537 },
  { name: '大阪', kana: 'おおさか', roman: 'Ōsaka', lat: 34.702, lon: 135.496, km: 556.4, min: 250 },
];

export const STATIONS = LINE.filter((s) => s.min != null) as (Station & { min: number })[];
export const ORIGINS = ['東京', '大阪'];
export const TOTAL_MIN = 250;
export const MAP = meta;

const merc = (lat: number) => (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
export function project(lon: number, lat: number) {
  return { x: (lon - meta.lonMin) * meta.scale, y: (meta.yMax - merc(lat)) * meta.scale };
}

export const stationByName = (name: string) => STATIONS.find((s) => s.name === name) ?? STATIONS[0];

/** 出発駅から見た駅（進む向きの順）：所要（分）と営業キロ */
export interface Stop {
  station: Station & { min: number };
  minutes: number;
  km: number;
}

export function stopsFrom(origin: string): Stop[] {
  const o = stationByName(origin);
  const west = o.min < TOTAL_MIN / 2;
  return STATIONS.filter((s) => (west ? s.min > o.min : s.min < o.min))
    .map((s) => ({ station: s, minutes: Math.abs(s.min - o.min), km: Math.round(Math.abs(s.km - o.km) * 10) / 10 }))
    .sort((a, b) => a.minutes - b.minutes);
}

/** ダイヤルの時間にいちばん近い駅 */
export function nearestStop(stops: Stop[], minutes: number) {
  let best = stops[0];
  for (const s of stops) if (Math.abs(s.minutes - minutes) < Math.abs(best.minutes - minutes)) best = s;
  return best;
}

/** 集中した分までに通り過ぎた最後の駅（なければ null） */
export function lastPassed(stops: Stop[], minutes: number) {
  let hit: Stop | null = null;
  for (const s of stops) if (s.minutes <= minutes + 0.01) hit = s;
  return hit;
}

/** 出発駅から「分」だけ進んだところまでの線路（地図の単位の点の列）。分 → 東京からの分 → キロ → 線路の上の位置 */
export function trackTo(origin: string, minutes: number) {
  const o = stationByName(origin);
  const west = o.min < TOTAL_MIN / 2;
  const targetMin = Math.max(0, Math.min(TOTAL_MIN, west ? o.min + minutes : o.min - minutes));
  // 分 → 東京からのキロ（駅の間は比例）
  let km = 0;
  for (let i = 1; i < STATIONS.length; i++) {
    const a = STATIONS[i - 1];
    const b = STATIONS[i];
    if (targetMin <= b.min) {
      km = a.km + ((b.km - a.km) * (targetMin - a.min)) / Math.max(1, b.min - a.min);
      break;
    }
    km = b.km;
  }
  const from = Math.min(o.km, km);
  const to = Math.max(o.km, km);
  const pts: { x: number; y: number }[] = [];
  const at = (k: number) => {
    for (let i = 1; i < LINE.length; i++) {
      const a = LINE[i - 1];
      const b = LINE[i];
      if (k <= b.km) {
        const t = (k - a.km) / Math.max(0.001, b.km - a.km);
        return project(a.lon + (b.lon - a.lon) * t, a.lat + (b.lat - a.lat) * t);
      }
    }
    const e = LINE[LINE.length - 1];
    return project(e.lon, e.lat);
  };
  pts.push(at(from));
  for (const p of LINE) if (p.km > from && p.km < to) pts.push(project(p.lon, p.lat));
  pts.push(at(to));
  if (!west) pts.reverse();
  return pts;
}

/** 線路の全体（地図に敷く） */
export const FULL_LINE = LINE.map((p) => project(p.lon, p.lat));

/** 硬券の運賃（昔の運賃表ふう：営業キロから。銭まで） */
export function fare(km: number, express: boolean) {
  const base = Math.max(10, Math.round(km * 1.5)) / 100;
  const total = base + (express ? 1.2 : 0);
  const yen = Math.floor(total);
  const sen = Math.round((total - yen) * 100);
  return sen ? `${yen}圓${sen}錢` : `${yen}圓`;
}
