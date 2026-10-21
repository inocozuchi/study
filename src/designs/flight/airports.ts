import meta from './map.json';

/**
 * 航空モードの空港と航路（内蔵データ）。
 * 羽田（HND）からの所要時間は決めた表、それ以外の出発地は距離から計算する（短い便ほど離着陸の時間が効く）。
 * 地図は scripts/build-maps.py が作ったメルカトル図（public/flight/map-*.svg）。位置は map.json の値で計算する。
 */
export interface Airport {
  code: string;
  name: string;
  lat: number;
  lon: number;
}

export const AIRPORTS: Airport[] = [
  { code: 'HND', name: '東京', lat: 35.5494, lon: 139.7798 },
  { code: 'NRT', name: '成田', lat: 35.772, lon: 140.3929 },
  { code: 'OIM', name: '大島', lat: 34.782, lon: 139.3603 },
  { code: 'MYE', name: '三宅島', lat: 34.0736, lon: 139.5603 },
  { code: 'NGO', name: '名古屋', lat: 34.8584, lon: 136.8054 },
  { code: 'TJH', name: '但馬', lat: 35.5128, lon: 134.7869 },
  { code: 'KIX', name: '大阪関西', lat: 34.4347, lon: 135.244 },
  { code: 'UKB', name: '神戸', lat: 34.6328, lon: 135.2239 },
  { code: 'SHM', name: '南紀白浜', lat: 33.6622, lon: 135.3644 },
  { code: 'KIJ', name: '新潟', lat: 37.9559, lon: 139.1207 },
  { code: 'TAK', name: '高松', lat: 34.2142, lon: 134.0156 },
  { code: 'HIJ', name: '広島', lat: 34.4361, lon: 132.9194 },
  { code: 'HKD', name: '函館', lat: 41.77, lon: 140.8219 },
  { code: 'UEO', name: '久米島', lat: 26.3635, lon: 126.7139 },
  { code: 'FUK', name: '福岡', lat: 33.5859, lon: 130.451 },
  { code: 'CTS', name: '新千歳', lat: 42.7752, lon: 141.6923 },
  { code: 'SHA', name: '上海', lat: 31.1979, lon: 121.3363 },
  { code: 'OKA', name: '那覇', lat: 26.1958, lon: 127.6459 },
  { code: 'ICN', name: 'ソウル', lat: 37.4602, lon: 126.4407 },
  { code: 'TPE', name: '台北', lat: 25.0777, lon: 121.2328 },
  { code: 'HKG', name: '香港', lat: 22.308, lon: 113.9185 },
];

/** 出発地に選べる空港 */
export const ORIGINS = ['HND', 'NRT', 'KIX', 'FUK', 'CTS', 'OKA'];

/** 羽田からの所要時間（分） */
const FROM_HND: Record<string, number> = {
  OIM: 25, NRT: 25, MYE: 30, NGO: 45, TJH: 49, KIX: 50, UKB: 50, SHM: 50, KIJ: 55, TAK: 60, HIJ: 65,
  HKD: 75, UEO: 81, FUK: 82, CTS: 90, SHA: 105, OKA: 115, ICN: 120, TPE: 165, HKG: 210,
};

/** 地図に出す都市（フライト中のラベル） */
export const CITIES: { name: string; lat: number; lon: number }[] = [
  { name: '東京', lat: 35.68, lon: 139.69 },
  { name: '名古屋市', lat: 35.18, lon: 136.91 },
  { name: '大阪市', lat: 34.69, lon: 135.5 },
  { name: '広島市', lat: 34.39, lon: 132.46 },
  { name: '福岡市', lat: 33.59, lon: 130.4 },
  { name: '札幌市', lat: 43.06, lon: 141.35 },
  { name: '仙台市', lat: 38.27, lon: 140.87 },
  { name: '新潟市', lat: 37.92, lon: 139.04 },
  { name: '金沢市', lat: 36.56, lon: 136.66 },
  { name: '鹿児島市', lat: 31.6, lon: 130.56 },
  { name: '那覇市', lat: 26.21, lon: 127.68 },
  { name: '釜山', lat: 35.18, lon: 129.08 },
  { name: 'ソウル', lat: 37.57, lon: 126.98 },
  { name: '平壌', lat: 39.03, lon: 125.75 },
  { name: 'ウラジオストク', lat: 43.12, lon: 131.89 },
  { name: '北京', lat: 39.9, lon: 116.4 },
  { name: '大連', lat: 38.91, lon: 121.6 },
  { name: '上海', lat: 31.23, lon: 121.47 },
  { name: '台北', lat: 25.03, lon: 121.56 },
  { name: '香港', lat: 22.32, lon: 114.17 },
];

export const MAP = meta;

const merc = (lat: number) => (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;

/** 経度・緯度 → 地図の座標（map-*.svg の viewBox と同じ単位） */
export function project(lon: number, lat: number) {
  return { x: (lon - meta.lonMin) * meta.scale, y: (meta.yMax - merc(lat)) * meta.scale };
}

/** その緯度で 1 km が地図の何単位か（レーダーの円の半径に使う） */
export function unitsPerKm(lat: number) {
  return meta.scale / (111.32 * Math.cos((lat * Math.PI) / 180));
}

export const airportByCode = (code: string) => AIRPORTS.find((a) => a.code === code) ?? AIRPORTS[0];

/** 大圏距離（km） */
export function distanceKm(a: Airport, b: Airport) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

/** 所要時間（分）：羽田発着は表、ほかは 28 分 + 16.5 km/分（巡航およそ 650〜1000 km/h に離着陸の分を足した目安） */
export function flightMinutes(a: Airport, b: Airport) {
  if (a.code === 'HND' && FROM_HND[b.code]) return FROM_HND[b.code];
  if (b.code === 'HND' && FROM_HND[a.code]) return FROM_HND[a.code];
  return Math.max(25, Math.round(28 + distanceKm(a, b) / 16.5));
}

export interface Route {
  airport: Airport;
  minutes: number;
  km: number;
}

/** 出発地からの航路（所要時間の短い順） */
export function routesFrom(code: string): Route[] {
  const from = airportByCode(code);
  return AIRPORTS.filter((a) => a.code !== from.code)
    .map((airport) => ({ airport, minutes: flightMinutes(from, airport), km: distanceKm(from, airport) }))
    .sort((a, b) => a.minutes - b.minutes || a.km - b.km);
}

/** ダイヤルの時間にいちばん近い航路 */
export function nearestRoute(routes: Route[], minutes: number) {
  let best = routes[0];
  for (const r of routes) if (Math.abs(r.minutes - minutes) < Math.abs(best.minutes - minutes)) best = r;
  return best;
}

/** 航路の線：地図の上でゆるく北へふくらむ弧（大圏航路のように見せる）。t（0..1）の位置と向き */
export function arc(a: Airport, b: Airport) {
  const p0 = project(a.lon, a.lat);
  const p2 = project(b.lon, b.lat);
  const dx = p2.x - p0.x;
  const dy = p2.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  // 進む向きの左右のうち、北（画面の上）側へふくらませる
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const bend = len * 0.12;
  const p1 = { x: (p0.x + p2.x) / 2 + nx * bend, y: (p0.y + p2.y) / 2 + ny * bend };
  const at = (t: number) => {
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
      angle: (Math.atan2(2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y), 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x)) * 180) / Math.PI,
    };
  };
  return { d: `M${p0.x} ${p0.y}Q${p1.x} ${p1.y} ${p2.x} ${p2.y}`, p0, p1, p2, at };
}

/** 便名（予約ごとに決まる 4 桁） */
export function flightNo(seed: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193);
  return `FT ${String((h >>> 0) % 9000 + 1000)}`;
}
