import maps from './maps.json';
import type { TrainClass, TrainLine } from '@/types';

/**
 * 列車の予約の路線（全国）。駅の位置・営業キロは実際の値（おおよそ）、所要時間は種別ごとの速さ（km / 分）から出す目安。
 *   函館・宗谷本線 / 東北本線 / 東海道・山陽本線 / 鹿児島本線・指宿枕崎線 / 稚内〜枕崎 全線走破（ロング・トレイル）
 * どの駅からでも、上り・下りのどちらへも引ける。地図は scripts/build-maps.py の路線ごとの古地図（public/train/map/{路線}.svg）。
 */
export interface Station {
  name: string;
  kana: string;
  roman: string;
  lat: number;
  lon: number;
  /** 路線の起点からの営業キロ */
  km: number;
}

/** 線路の形を作る途中の点（駅ではない） */
type Pt = [lat: number, lon: number, km: number];
type Entry = Station | Pt;
const st = (name: string, kana: string, roman: string, lat: number, lon: number, km: number): Station => ({ name, kana, roman, lat, lon, km });

/** 種別：営業キロの進む速さ（集中 1 分あたり）・車窓の流れる速さ（普通 = 1）・走行音の速さ・特急料金（圓） */
export const CLASSES: Record<TrainClass, { label: string; kmPerMin: number; cruise: number; accel: number; rate: number; fee: number }> = {
  local: { label: '普通', kmPerMin: 2.2, cruise: 1, accel: 0.11, rate: 1.0, fee: 0 },
  rapid: { label: '快速', kmPerMin: 2.8, cruise: 1.2, accel: 0.12, rate: 1.12, fee: 0 },
  kyuko: { label: '急行', kmPerMin: 3.4, cruise: 1.42, accel: 0.13, rate: 1.25, fee: 0.6 },
  express: { label: '特急', kmPerMin: 4.4, cruise: 1.65, accel: 0.15, rate: 1.4, fee: 1.2 },
};
export const CLASS_ORDER: TrainClass[] = ['local', 'rapid', 'kyuko', 'express'];
/** 急行・特急は展望車（ソファ）、普通・快速は三等客車（木のボックス席） */
export const isObservation = (cls: TrainClass) => cls === 'kyuko' || cls === 'express';
export const classOf = (cls: string | undefined): TrainClass => (cls && cls in CLASSES ? (cls as TrainClass) : 'local');

const HOKKAIDO: Entry[] = [
  st('函館', 'はこだて', 'Hakodate', 41.773, 140.726, 0),
  st('大沼公園', 'おおぬまこうえん', 'Ōnuma-Kōen', 41.972, 140.669, 27.0),
  st('森', 'もり', 'Mori', 42.106, 140.578, 49.5),
  st('八雲', 'やくも', 'Yakumo', 42.255, 140.27, 81.1),
  st('長萬部', 'おしゃまんべ', 'Oshamambe', 42.513, 140.376, 112.3),
  [42.67, 140.31, 132],
  [42.81, 140.53, 160],
  st('倶知安', 'くっちゃん', 'Kutchan', 42.903, 140.758, 193.3),
  st('余市', 'よいち', 'Yoichi', 43.191, 140.784, 233.6),
  st('小樽', 'おたる', 'Otaru', 43.198, 140.994, 252.5),
  st('札幌', 'さっぽろ', 'Sapporo', 43.069, 141.351, 286.3),
  st('岩見澤', 'いわみざわ', 'Iwamizawa', 43.204, 141.759, 326.9),
  st('瀧川', 'たきかわ', 'Takikawa', 43.556, 141.904, 370.6),
  st('深川', 'ふかがわ', 'Fukagawa', 43.721, 142.043, 393.0),
  st('旭川', 'あさひかわ', 'Asahikawa', 43.763, 142.358, 423.1),
  st('士別', 'しべつ', 'Shibetsu', 44.178, 142.394, 477.0),
  st('名寄', 'なよろ', 'Nayoro', 44.356, 142.463, 499.3),
  st('音威子府', 'おといねっぷ', 'Otoineppu', 44.723, 142.264, 552.4),
  [44.81, 142.08, 575],
  st('幌延', 'ほろのべ', 'Horonobe', 45.02, 141.851, 622.5),
  st('豐富', 'とよとみ', 'Toyotomi', 45.103, 141.774, 637.4),
  st('稚内', 'わっかない', 'Wakkanai', 45.417, 141.677, 682.5),
];

const TOHOKU: Entry[] = [
  st('東京', 'とうきょう', 'Tōkyō', 35.681, 139.767, 0),
  st('上野', 'うえの', 'Ueno', 35.714, 139.777, 3.6),
  st('大宮', 'おおみや', 'Ōmiya', 35.906, 139.624, 30.3),
  st('小山', 'おやま', 'Oyama', 36.313, 139.806, 80.6),
  st('宇都宮', 'うつのみや', 'Utsunomiya', 36.559, 139.898, 109.5),
  st('黑磯', 'くろいそ', 'Kuroiso', 36.97, 140.059, 163.3),
  st('郡山', 'こおりやま', 'Kōriyama', 37.398, 140.388, 226.7),
  st('福島', 'ふくしま', 'Fukushima', 37.754, 140.459, 272.8),
  st('白石', 'しろいし', 'Shiroishi', 38.003, 140.62, 306.8),
  st('仙臺', 'せんだい', 'Sendai', 38.26, 140.882, 351.8),
  st('小牛田', 'こごた', 'Kogota', 38.58, 141.055, 395.0),
  st('一ノ關', 'いちのせき', 'Ichinoseki', 38.935, 141.128, 445.1),
  st('水澤', 'みずさわ', 'Mizusawa', 39.141, 141.14, 470.1),
  st('北上', 'きたかみ', 'Kitakami', 39.287, 141.118, 487.5),
  st('花卷', 'はなまき', 'Hanamaki', 39.393, 141.12, 500.0),
  st('盛岡', 'もりおか', 'Morioka', 39.701, 141.137, 535.3),
  st('沼宮內', 'ぬまくない', 'Numakunai', 39.958, 141.217, 566.5),
  st('一戸', 'いちのへ', 'Ichinohe', 40.209, 141.297, 598.1),
  st('八戸', 'はちのへ', 'Hachinohe', 40.509, 141.431, 631.9),
  st('三澤', 'みさわ', 'Misawa', 40.703, 141.369, 659.5),
  st('野邊地', 'のへじ', 'Noheji', 40.866, 141.123, 682.1),
  st('淺蟲', 'あさむし', 'Asamushi', 40.894, 140.865, 712.7),
  st('青森', 'あおもり', 'Aomori', 40.829, 140.734, 739.2),
];

const TOKAIDO: Entry[] = [
  st('東京', 'とうきょう', 'Tōkyō', 35.681, 139.767, 0),
  st('品川', 'しながわ', 'Shinagawa', 35.628, 139.739, 6.8),
  st('横濱', 'よこはま', 'Yokohama', 35.466, 139.622, 28.8),
  st('大船', 'おおふな', 'Ōfuna', 35.354, 139.531, 46.5),
  [35.31, 139.35, 66],
  st('小田原', 'おだわら', 'Odawara', 35.256, 139.155, 83.9),
  st('熱海', 'あたみ', 'Atami', 35.104, 139.078, 104.6),
  [35.075, 138.955, 114],
  st('沼津', 'ぬまづ', 'Numazu', 35.102, 138.86, 126.2),
  st('富士', 'ふじ', 'Fuji', 35.162, 138.676, 146.2),
  [35.06, 138.52, 165],
  st('靜岡', 'しずおか', 'Shizuoka', 34.972, 138.389, 180.2),
  [34.866, 138.318, 193.7],
  [34.838, 138.176, 207.9],
  st('掛川', 'かけがわ', 'Kakegawa', 34.769, 138.015, 229.3),
  st('濱松', 'はままつ', 'Hamamatsu', 34.704, 137.735, 257.1),
  [34.712, 137.53, 276],
  st('豐橋', 'とよはし', 'Toyohashi', 34.763, 137.382, 293.6),
  st('岡崎', 'おかざき', 'Okazaki', 34.926, 137.177, 325.9),
  st('名古屋', 'なごや', 'Nagoya', 35.171, 136.882, 366.0),
  st('岐阜', 'ぎふ', 'Gifu', 35.41, 136.757, 396.3),
  st('大垣', 'おおがき', 'Ōgaki', 35.367, 136.618, 410.0),
  [35.36, 136.47, 428],
  st('米原', 'まいばら', 'Maibara', 35.315, 136.29, 445.9),
  st('彦根', 'ひこね', 'Hikone', 35.276, 136.261, 451.9),
  [35.128, 136.098, 476],
  st('草津', 'くさつ', 'Kusatsu', 35.022, 135.96, 491.0),
  st('京都', 'きょうと', 'Kyōto', 34.985, 135.758, 513.6),
  [34.85, 135.62, 537],
  st('大阪', 'おおさか', 'Ōsaka', 34.702, 135.496, 556.4),
  st('神戸', 'こうべ', 'Kōbe', 34.679, 135.178, 589.5),
  st('明石', 'あかし', 'Akashi', 34.649, 134.993, 612.3),
  st('姫路', 'ひめじ', 'Himeji', 34.827, 134.691, 644.3),
  st('相生', 'あいおい', 'Aioi', 34.804, 134.468, 665.5),
  [34.87, 134.36, 678],
  [34.8, 134.15, 700],
  st('岡山', 'おかやま', 'Okayama', 34.666, 133.918, 732.9),
  st('倉敷', 'くらしき', 'Kurashiki', 34.601, 133.766, 748.8),
  st('福山', 'ふくやま', 'Fukuyama', 34.489, 133.362, 791.4),
  st('尾道', 'おのみち', 'Onomichi', 34.408, 133.2, 811.5),
  st('三原', 'みはら', 'Mihara', 34.4, 133.079, 822.9),
  [34.43, 132.74, 858],
  st('廣島', 'ひろしま', 'Hiroshima', 34.398, 132.475, 893.8),
  st('岩國', 'いわくに', 'Iwakuni', 34.172, 132.221, 935.2),
  [33.96, 132.1, 955],
  [33.96, 131.94, 970],
  st('德山', 'とくやま', 'Tokuyama', 34.05, 131.806, 987.3),
  st('防府', 'ほうふ', 'Hōfu', 34.05, 131.567, 1007.5),
  st('小郡', 'おごおり', 'Ogōri', 34.093, 131.396, 1026.2),
  [34.054, 131.164, 1056],
  [34.07, 130.98, 1090],
  st('下關', 'しものせき', 'Shimonoseki', 33.95, 130.922, 1117.6),
];

const KYUSHU: Entry[] = [
  st('門司港', 'もじこう', 'Mojikō', 33.945, 130.962, 0),
  st('門司', 'もじ', 'Moji', 33.906, 130.933, 5.5),
  st('小倉', 'こくら', 'Kokura', 33.887, 130.882, 11.0),
  st('折尾', 'おりお', 'Orio', 33.865, 130.703, 30.3),
  st('博多', 'はかた', 'Hakata', 33.59, 130.42, 78.2),
  st('鳥栖', 'とす', 'Tosu', 33.375, 130.518, 106.8),
  st('久留米', 'くるめ', 'Kurume', 33.32, 130.5, 114.4),
  st('大牟田', 'おおむた', 'Ōmuta', 33.031, 130.446, 149.9),
  st('熊本', 'くまもと', 'Kumamoto', 32.79, 130.689, 196.4),
  st('八代', 'やつしろ', 'Yatsushiro', 32.506, 130.611, 232.3),
  [32.46, 130.56, 245],
  [32.3, 130.47, 262],
  st('水俣', 'みなまた', 'Minamata', 32.212, 130.408, 281.6),
  st('出水', 'いずみ', 'Izumi', 32.088, 130.36, 296.7),
  [32.02, 130.19, 315],
  st('川內', 'せんだい', 'Sendai', 31.818, 130.302, 345.6),
  [31.71, 130.27, 360],
  [31.62, 130.4, 380],
  st('鹿兒島中央', 'かごしまちゅうおう', 'Kagoshima-Chūō', 31.584, 130.541, 397.7),
  [31.38, 130.54, 423],
  st('指宿', 'いぶすき', 'Ibusuki', 31.234, 130.643, 443.4),
  [31.2, 130.63, 449],
  st('西大山', 'にしおおやま', 'Nishi-Ōyama', 31.188, 130.567, 455.2),
  [31.22, 130.43, 470],
  st('枕崎', 'まくらざき', 'Makurazaki', 31.274, 130.3, 485.5),
];

/** 稚内〜枕崎：北海道を南へ（鹿児島本線は門司から。門司港への枝は通らない） → 青函トンネル → 東北本線を上る → 東海道・山陽本線を下る → 関門トンネル → 鹿児島本線を下る */
const TRAIL: Entry[] = (() => {
  const out: Entry[] = [];
  let base = 0;
  /** from：つなぎ目で重なる先頭の駅を飛ばす数、gap：前の区間の終わりからのキロ */
  const add = (entries: Entry[], reverse = false, from = 0, gap = 0) => {
    const list = reverse ? [...entries].reverse() : entries;
    const k0 = kmOf(list[0]);
    const start = out.length ? base + gap : 0;
    for (const e of list.slice(from)) {
      const km = start + Math.abs(kmOf(e) - k0);
      out.push(Array.isArray(e) ? [e[0], e[1], km] : { ...e, km: Math.round(km * 10) / 10 });
    }
    base = kmOf(out[out.length - 1]);
  };
  add(HOKKAIDO, true);
  // 函館 → 木古内 → 青函トンネル → 蟹田 → 青森
  add([st('函館', '', '', 41.773, 140.726, 0), st('木古内', 'きこない', 'Kikonai', 41.678, 140.437, 37.8), [41.4, 140.25, 75], [41.2, 140.38, 100], st('蟹田', 'かにた', 'Kanita', 41.042, 140.642, 125.6), st('青森', '', '', 40.829, 140.734, 157.0)], false, 1);
  add(TOHOKU, true, 1);
  add(TOKAIDO, false, 1);
  // 下関 → 関門トンネル → 門司 → 鹿児島本線
  add(
    KYUSHU.filter((e) => kmOf(e) >= 5.5),
    false,
    0,
    6.3,
  );
  return out;
})();

function kmOf(e: Entry) {
  return Array.isArray(e) ? e[2] : e.km;
}

export interface MapMeta {
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
  yMax: number;
  scale: number;
  width: number;
  height: number;
}

export interface Line {
  id: TrainLine;
  /** 駅名標・地図の札に出す名前 */
  name: string;
  /** 起点〜終点 */
  span: string;
  /** 駅と、線路の形を作る途中の点（km の順） */
  points: Station[];
  stations: Station[];
  /** 出発駅に選べる主な駅（地図に名前を出す駅） */
  major: string[];
  map: MapMeta;
  mapUrl: string;
  totalKm: number;
}

function makeLine(id: TrainLine, name: string, entries: Entry[], major: string[]): Line {
  const points = entries.map((e) => (Array.isArray(e) ? st('', '', '', e[0], e[1], e[2]) : e));
  // 前の区間の終わりの駅と次の区間の始まりの駅が重なるところ（全線走破のつなぎ目）は 1 つにする
  const stations = points.filter((p, i) => p.name && points.findIndex((q) => q.name === p.name) === i);
  return {
    id,
    name,
    span: `${stations[0].name}〜${stations[stations.length - 1].name}`,
    points,
    stations,
    major,
    map: (maps as Record<TrainLine, MapMeta>)[id],
    mapUrl: `./train/map/${id}.svg`,
    totalKm: stations[stations.length - 1].km,
  };
}

export const LINES: Line[] = [
  makeLine('hokkaido', '函館・宗谷本線', HOKKAIDO, ['函館', '長萬部', '小樽', '札幌', '旭川', '名寄', '稚内']),
  makeLine('tohoku', '東北本線', TOHOKU, ['東京', '上野', '宇都宮', '郡山', '福島', '仙臺', '一ノ關', '盛岡', '八戸', '青森']),
  makeLine('tokaido', '東海道・山陽本線', TOKAIDO, ['東京', '横濱', '熱海', '靜岡', '濱松', '名古屋', '京都', '大阪', '神戸', '姫路', '岡山', '廣島', '下關']),
  makeLine('kyushu', '鹿児島本線・指宿枕崎線', KYUSHU, ['門司港', '小倉', '博多', '熊本', '八代', '川內', '鹿兒島中央', '指宿', '枕崎']),
  makeLine('trail', '稚内〜枕崎 全線走破', TRAIL, ['稚内', '旭川', '札幌', '函館', '青森', '盛岡', '仙臺', '東京', '名古屋', '大阪', '岡山', '廣島', '下關', '博多', '熊本', '鹿兒島中央', '枕崎']),
];

export const lineById = (id: string | undefined) => LINES.find((l) => l.id === id) ?? LINES[2];

const merc = (lat: number) => (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
export function project(line: Line, lon: number, lat: number) {
  const m = line.map;
  return { x: (lon - m.lonMin) * m.scale, y: (m.yMax - merc(lat)) * m.scale };
}

export const stationByName = (line: Line, name: string) => line.stations.find((s) => s.name === name) ?? line.stations[0];
export const onLine = (line: Line, name: string) => line.stations.some((s) => s.name === name);

/** 駅名の読み（どの路線の駅でも） */
export function kanaOf(name: string) {
  for (const l of LINES) {
    const s = l.stations.find((x) => x.name === name && x.kana);
    if (s) return s.kana;
  }
  return null;
}

/** 進む向き：1 = 起点から終点へ（下り）、-1 = 終点から起点へ（上り） */
export type Dir = 1 | -1;
/** 出発駅からの既定の向き：遠いほうの端へ */
export const defaultDir = (line: Line, origin: string): Dir => (stationByName(line, origin).km < line.totalKm / 2 ? 1 : -1);
/** その向きに 1 駅もない（端の駅）なら、逆向きに */
export const usableDir = (line: Line, origin: string, dir: Dir): Dir => {
  const o = stationByName(line, origin);
  const any = line.stations.some((s) => (dir === 1 ? s.km > o.km : s.km < o.km));
  return any ? dir : ((-dir) as Dir);
};

/** 出発駅から見た駅（進む向きの順）：所要（分）と営業キロ */
export interface Stop {
  station: Station;
  minutes: number;
  km: number;
}

/** 集中の分 → 進む営業キロ */
export const kmFor = (minutes: number, cls: TrainClass) => minutes * CLASSES[cls].kmPerMin;

export function stopsFrom(line: Line, origin: string, dir: Dir, cls: TrainClass): Stop[] {
  const o = stationByName(line, origin);
  return line.stations
    .filter((s) => (dir === 1 ? s.km > o.km : s.km < o.km))
    .map((s) => {
      const km = Math.round(Math.abs(s.km - o.km) * 10) / 10;
      return { station: s, minutes: km / CLASSES[cls].kmPerMin, km };
    })
    .sort((a, b) => a.km - b.km);
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

/** 起点からの営業キロ → 線路の上の位置 */
function at(line: Line, k: number) {
  const P = line.points;
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1];
    const b = P[i];
    if (k <= b.km) {
      const t = (k - a.km) / Math.max(0.001, b.km - a.km);
      return project(line, a.lon + (b.lon - a.lon) * t, a.lat + (b.lat - a.lat) * t);
    }
  }
  const e = P[P.length - 1];
  return project(line, e.lon, e.lat);
}

/** 起点からのキロ a〜b の線路（地図の単位の点の列。a > b なら逆向き） */
function segment(line: Line, a: number, b: number) {
  const lo = Math.max(0, Math.min(a, b));
  const hi = Math.min(line.totalKm, Math.max(a, b));
  const pts = [at(line, lo)];
  for (const p of line.points) if (p.km > lo && p.km < hi) pts.push(project(line, p.lon, p.lat));
  pts.push(at(line, hi));
  return a > b ? pts.reverse() : pts;
}

/** 出発駅から km だけ進んだところまでの線路 */
export function trackTo(line: Line, origin: string, dir: Dir, km: number) {
  const o = stationByName(line, origin).km;
  return segment(line, o, o + dir * km);
}

/** 起点から km までの線路 */
export const trackToKm = (line: Line, km: number) => segment(line, 0, km);

/** 線路の全体（地図に敷く） */
export const fullLine = (line: Line) => line.points.map((p) => project(line, p.lon, p.lat));

/** 硬券の運賃（昔の運賃表ふう：営業キロから。銭まで）。急行・特急は料金を足す */
export function fare(km: number, cls: TrainClass) {
  const base = Math.max(10, Math.round(km * 1.5)) / 100;
  const total = base + CLASSES[cls].fee;
  const yen = Math.floor(total);
  const sen = Math.round((total - yen) * 100);
  return sen ? `${yen}圓${sen}錢` : `${yen}圓`;
}
