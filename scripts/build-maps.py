"""
旅のモードの地図を作る（ビルド時に一度だけ。アプリは出来上がった SVG を画像として読むだけ）。

  python3 scripts/build-maps.py        （numpy が必要。海岸線は devDependency の world-atlas＝Natural Earth）

出力
  航空：public/flight/map-dark.svg   暗い東アジアの陸地（#22252A）
        public/flight/map-lines.svg  海岸線と経緯線だけ（レイヤー切替）
        public/flight/dots.svg       搭乗券の背景に透かすドットの世界地図
        src/designs/flight/map.json  投影（メルカトル）の値。空港・都市の位置はアプリがこの値で計算する
  列車：public/train/map/{hokkaido,tohoku,tokaido,kyushu,trail}.svg 路線ごとの古地図（水線・旧国名・海の名）
        src/designs/train/booking/maps.json  路線ごとの投影の値

投影：x = (経度 - lonMin) * scale、y = (yMax - merc(緯度)) * scale（merc は度に直したメルカトルの y）
"""
import json
import math
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
ATLAS = ROOT / 'node_modules' / 'world-atlas'


def merc(lat):
    return math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))


def decode(topo_path):
    """TopoJSON の land を、経度・緯度のリング（外周と穴）の一覧にする"""
    topo = json.loads(Path(topo_path).read_text())
    sx, sy = topo['transform']['scale']
    tx, ty = topo['transform']['translate']
    arcs = []
    for arc in topo['arcs']:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def ring(idx):
        out = []
        for i in idx:
            pts = arcs[i] if i >= 0 else arcs[~i][::-1]
            out.extend(pts if not out else pts[1:])
        return out

    rings = []
    for g in topo['objects']['land']['geometries']:
        polys = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']]
        for poly in polys:
            for r in poly:
                rings.append(ring(r))
    return rings


def clip(ring, x0, y0, x1, y1):
    """Sutherland–Hodgman：長方形の中だけを残す（塗りつぶしの多角形なので外周を長方形の辺でつなぐ）"""
    def inside(p, edge):
        x, y = p
        return {'l': x >= x0, 'r': x <= x1, 'b': y >= y0, 't': y <= y1}[edge]

    def cross(p, q, edge):
        (px, py), (qx, qy) = p, q
        if edge in 'lr':
            ex = x0 if edge == 'l' else x1
            t = (ex - px) / (qx - px)
            return (ex, py + t * (qy - py))
        ey = y0 if edge == 'b' else y1
        t = (ey - py) / (qy - py)
        return (px + t * (qx - px), ey)

    out = ring
    for edge in 'lrbt':
        if not out:
            break
        src, out = out, []
        for i, cur in enumerate(src):
            prev = src[i - 1]
            if inside(cur, edge):
                if not inside(prev, edge):
                    out.append(cross(prev, cur, edge))
                out.append(cur)
            elif inside(prev, edge):
                out.append(cross(prev, cur, edge))
    return out


def simplify(pts, tol):
    """Douglas–Peucker（画面の単位で tol より細かい揺れを落とす）"""
    if len(pts) < 4:
        return pts
    a = np.asarray(pts)
    keep = np.zeros(len(a), bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(a) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        p, q = a[i], a[j]
        seg = a[i + 1 : j]
        d = q - p
        n = math.hypot(*d)
        if n == 0:
            dist = np.hypot(*(seg - p).T)
        else:
            dist = np.abs(d[0] * (seg[:, 1] - p[1]) - d[1] * (seg[:, 0] - p[0])) / n
        k = int(np.argmax(dist))
        if dist[k] > tol:
            m = i + 1 + k
            keep[m] = True
            stack += [(i, m), (m, j)]
    return [tuple(x) for x in a[keep]]


class Projection:
    def __init__(self, lon_min, lon_max, lat_min, lat_max, width):
        self.lon_min, self.lon_max, self.lat_min, self.lat_max = lon_min, lon_max, lat_min, lat_max
        self.scale = width / (lon_max - lon_min)
        self.y_max = merc(lat_max)
        self.width = width
        self.height = round((self.y_max - merc(lat_min)) * self.scale, 1)

    def __call__(self, lon, lat):
        return ((lon - self.lon_min) * self.scale, (self.y_max - merc(lat)) * self.scale)

    def meta(self):
        return {'lonMin': self.lon_min, 'lonMax': self.lon_max, 'latMin': self.lat_min, 'latMax': self.lat_max, 'yMax': round(self.y_max, 6), 'scale': round(self.scale, 6), 'width': self.width, 'height': self.height}


def land_path(rings, proj, tol, min_area):
    m = 0.6  # 長方形より少し外まで残し、端に線が出ないようにする
    parts = []
    for r in rings:
        c = clip(r, proj.lon_min - m, proj.lat_min - m, proj.lon_max + m, proj.lat_max + m)
        if len(c) < 3:
            continue
        pts = simplify([proj(lon, lat) for lon, lat in c], tol)
        if len(pts) < 3:
            continue
        a = np.asarray(pts)
        area = 0.5 * abs(np.dot(a[:, 0], np.roll(a[:, 1], 1)) - np.dot(a[:, 1], np.roll(a[:, 0], 1)))
        if area < min_area:
            continue
        parts.append('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'Z')
    return ''.join(parts)


def graticule(proj, step):
    d = []
    lon = math.ceil(proj.lon_min / step) * step
    while lon <= proj.lon_max:
        x0, y0 = proj(lon, proj.lat_max)
        x1, y1 = proj(lon, proj.lat_min)
        d.append(f'M{x0:.1f} {y0:.1f}V{y1:.1f}')
        lon += step
    lat = math.ceil(proj.lat_min / step) * step
    while lat <= proj.lat_max:
        x0, y = proj(proj.lon_min, lat)
        d.append(f'M0 {y:.1f}H{proj.width}')
        lat += step
    return ''.join(d)


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    print(f'{path.relative_to(ROOT)}  {len(text.encode()) // 1024} KB')


# ───────────── 航空：東アジアの夜の地図 ─────────────

def unwrap(rings):
    """日付変更線をまたぐリング（ユーラシアのチュクチ半島）は西経を 360 度ずらして東へつなぐ。平面で切ると箱いっぱいに塗られるため"""
    out = []
    for r in rings:
        if any(abs(r[i][0] - r[i - 1][0]) > 180 for i in range(1, len(r))):
            r = [(lon + 360 if lon < -150 else lon, lat) for lon, lat in r]
        out.append(r)
    return out


def flight(rings):
    rings = unwrap(rings)
    proj = Projection(106, 152, 16, 48.5, 2000)
    land = land_path(rings, proj, tol=0.55, min_area=2.0)
    w, h = proj.width, proj.height
    head = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
    write(ROOT / 'public' / 'flight' / 'map-dark.svg', head + f'<path d="{land}" fill="#22252A" stroke="#2C3036" stroke-width="1.4" stroke-linejoin="round"/></svg>')
    grid = graticule(proj, 5)
    write(
        ROOT / 'public' / 'flight' / 'map-lines.svg',
        head + f'<path d="{grid}" fill="none" stroke="#1B1F26" stroke-width="1.2"/><path d="{land}" fill="#0C0F14" stroke="#4A5260" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    )
    (ROOT / 'src' / 'designs' / 'flight' / 'map.json').write_text(json.dumps(proj.meta(), indent=2) + '\n')


def point_in_rings(lon, lat, rings_np):
    inside = False
    for xs, ys, (bx0, by0, bx1, by1) in rings_np:
        if not (bx0 <= lon <= bx1 and by0 <= lat <= by1):
            continue
        j = len(xs) - 1
        c = False
        for i in range(len(xs)):
            if (ys[i] > lat) != (ys[j] > lat) and lon < (xs[j] - xs[i]) * (lat - ys[i]) / (ys[j] - ys[i]) + xs[i]:
                c = not c
            j = i
        if c:
            inside = not inside
    return inside


def dots(rings110):
    """ドットの世界地図（正距円筒。2.4 度ごとに陸なら点を打つ）"""
    rings_np = []
    for r in rings110:
        a = np.asarray(r)
        rings_np.append((a[:, 0], a[:, 1], (a[:, 0].min(), a[:, 1].min(), a[:, 0].max(), a[:, 1].max())))
    step = 2.4
    out = []
    lat = 76.0
    row = 0
    while lat > -56:
        lon = -178.0 + (step / 2 if row % 2 else 0)
        while lon < 180:
            if point_in_rings(lon, lat, rings_np):
                out.append(f'<circle cx="{lon + 180:.1f}" cy="{76 - lat:.1f}" r="0.8"/>')
            lon += step
        lat -= step
        row += 1
    w, h = 360, 132
    write(ROOT / 'public' / 'flight' / 'dots.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w * 3}" height="{h * 3}"><g fill="#ffffff">{"".join(out)}</g></svg>')


# ───────────── 列車：古地図ふうの東海道 ─────────────

PROVINCES = [
    # 東海道
    ('武藏', 139.42, 35.86), ('相模', 139.26, 35.44), ('伊豆', 138.96, 34.86), ('駿河', 138.42, 35.2), ('甲斐', 138.62, 35.66),
    ('遠江', 137.86, 34.86), ('信濃', 137.9, 35.98), ('三河', 137.36, 34.96), ('尾張', 136.98, 35.3), ('美濃', 136.82, 35.6),
    ('伊勢', 136.4, 34.62), ('近江', 136.12, 35.24), ('山城', 135.78, 34.86), ('大和', 135.86, 34.42), ('攝津', 135.34, 34.86),
    ('紀伊', 135.62, 33.92), ('志摩', 136.78, 34.36), ('伊賀', 136.16, 34.72), ('安房', 140.02, 35.05), ('上總', 140.22, 35.42),
    ('下總', 140.3, 35.86), ('河内', 135.62, 34.58), ('和泉', 135.44, 34.36), ('越前', 136.2, 35.98), ('若狹', 135.82, 35.44),
    # 山陽・山陰・四國
    ('播磨', 134.72, 34.98), ('備前', 134.05, 34.78), ('備中', 133.62, 34.82), ('備後', 133.2, 34.7), ('安藝', 132.6, 34.5),
    ('周防', 131.9, 34.12), ('長門', 131.15, 34.3), ('美作', 134.0, 35.1), ('讃岐', 134.0, 34.25), ('伊豫', 132.9, 33.7),
    ('阿波', 134.3, 33.95), ('土佐', 133.4, 33.5), ('淡路', 134.82, 34.4), ('丹波', 135.3, 35.2), ('但馬', 134.72, 35.4),
    ('因幡', 134.22, 35.4), ('伯耆', 133.6, 35.35), ('出雲', 132.8, 35.3), ('石見', 132.2, 34.9),
    # 九州
    ('豐前', 130.98, 33.62), ('筑前', 130.55, 33.6), ('筑後', 130.62, 33.25), ('肥前', 130.0, 33.2), ('肥後', 130.82, 32.6),
    ('豐後', 131.4, 33.2), ('日向', 131.3, 32.3), ('大隅', 130.92, 31.4), ('薩摩', 130.38, 31.66),
    # 東北・關東
    ('陸奥', 141.0, 40.62), ('陸中', 141.4, 39.6), ('陸前', 141.0, 38.55), ('羽後', 140.3, 39.6), ('羽前', 140.1, 38.4),
    ('磐城', 140.7, 37.3), ('岩代', 140.0, 37.55), ('下野', 139.8, 36.62), ('常陸', 140.3, 36.4), ('上野', 139.0, 36.42),
    ('越後', 139.0, 37.45),
    # 北海道
    ('渡島', 140.5, 41.85), ('後志', 140.62, 42.85), ('膽振', 141.4, 42.62), ('石狩', 141.75, 43.3), ('天鹽', 141.95, 44.65),
    ('北見', 143.0, 44.25), ('日高', 142.6, 42.5), ('十勝', 143.2, 42.95),
]
SEAS = [
    ('遠州灘', 137.6, 34.42), ('相模灘', 139.42, 34.96), ('駿河灣', 138.56, 34.82), ('熊野灘', 136.42, 33.86),
    ('伊勢灣', 136.74, 34.76), ('大阪灣', 135.1, 34.52), ('東京灣', 139.8, 35.36), ('太平洋', 138.2, 33.9),
    ('瀨戶內海', 133.0, 34.18), ('周防灘', 131.4, 33.8), ('玄界灘', 130.1, 33.92), ('有明海', 130.25, 33.0),
    ('八代海', 130.38, 32.35), ('東支那海', 129.75, 31.4), ('鹿兒島灣', 130.66, 31.45), ('太平洋', 132.6, 32.2),
    ('仙臺灣', 141.25, 38.1), ('太平洋', 142.4, 38.6), ('日本海', 139.3, 39.4), ('陸奥灣', 140.9, 41.02),
    ('津輕海峽', 140.75, 41.55), ('噴火灣', 140.62, 42.3), ('石狩灣', 141.12, 43.38), ('日本海', 140.4, 44.2),
    ('宗谷海峽', 141.95, 45.68), ('太平洋', 142.6, 41.8),
]

# 路線ごとの古地図の範囲（経度・緯度）。長い辺を 1800px にする
TRAIN_MAPS = {
    'hokkaido': (139.3, 145.9, 41.2, 45.8),
    'tohoku': (138.4, 142.6, 35.2, 41.6),
    'tokaido': (130.4, 140.4, 33.25, 36.15),
    'kyushu': (129.3, 132.2, 30.9, 34.25),
    'trail': (129.3, 145.2, 30.85, 45.85),
}


def fit(lon0, lon1, lat0, lat1, size=1800):
    """長い辺が size になる投影"""
    span_y = merc(lat1) - merc(lat0)
    span_x = lon1 - lon0
    width = size if span_x >= span_y else round(size * span_x / span_y)
    return Projection(lon0, lon1, lat0, lat1, width)


def old_map(rings, line, box):
    proj = fit(*box)
    k = proj.scale / 310  # 東海道（310px/度）を基準に、文字と水線の太さを合わせる
    land = land_path(rings, proj, tol=0.45, min_area=4.0 * min(1, k))
    w, h = proj.width, proj.height
    lon0, lon1, lat0, lat1 = box
    text = []
    for cls, items in (('p', PROVINCES), ('s', SEAS)):
        for name, lon, lat in items:
            if lon0 + 0.1 < lon < lon1 - 0.1 and lat0 + 0.1 < lat < lat1 - 0.1:
                x, y = proj(lon, lat)
                text.append(f'<text x="{x:.0f}" y="{y:.0f}" class="{cls}">{name}</text>')
    f = lambda v: f'{max(v * k, v * 0.42):.1f}'
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
        '<style>text{font-family:"Hiragino Mincho ProN","Yu Mincho","Shippori Mincho",serif;text-anchor:middle;dominant-baseline:middle}'
        f'.p{{font-size:{f(30)}px;fill:#7A5A3A;fill-opacity:.55;letter-spacing:{f(10)}px}}.s{{font-size:{f(32)}px;fill:#4E6A72;fill-opacity:.6;letter-spacing:{f(14)}px;font-style:italic}}</style>'
        # 水線：海岸に沿った細い線を何重にも（太い線を下に敷き、陸で覆うと外側だけが残る）
        f'<g fill="none" stroke="#5E7F8A" stroke-linejoin="round">'
        f'<path d="{land}" stroke-width="{f(34)}" stroke-opacity=".07"/><path d="{land}" stroke-width="{f(22)}" stroke-opacity=".09"/>'
        f'<path d="{land}" stroke-width="{f(12)}" stroke-opacity=".13"/><path d="{land}" stroke-width="{f(5)}" stroke-opacity=".2"/></g>'
        f'<path d="{land}" fill="#EAD9B2" stroke="#6B4A2B" stroke-width="{f(2)}" stroke-linejoin="round"/>'
        f'{"".join(text)}'
        '</svg>'
    )
    write(ROOT / 'public' / 'train' / 'map' / f'{line}.svg', svg)
    return proj.meta()


def train_maps(rings):
    metas = {line: old_map(rings, line, box) for line, box in TRAIN_MAPS.items()}
    out = ROOT / 'src' / 'designs' / 'train' / 'booking' / 'maps.json'
    out.write_text(json.dumps(metas, indent=2) + '\n')


def main():
    rings10 = decode(ATLAS / 'land-10m.json')
    flight(rings10)
    train_maps(rings10)
    dots(decode(ATLAS / 'land-110m.json'))


if __name__ == '__main__':
    main()
