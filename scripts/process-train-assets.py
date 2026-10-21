"""
列車モードの背景素材を、アプリで使う形に仕上げる。

  入力：assets-src/train/   （アップロードされた元の JPEG。白い背景・左右がつながっていない）
  出力：public/train/        （WebP。透過・左右がつながるループ・軽いサイズ）+ layout.json
        src/designs/train/scene/assets.json（同じ寸法。アプリが読み込む）

  python3 scripts/process-train-assets.py      （Pillow と numpy が必要）

やっていること
  - frame-table：窓ガラスの白い部分を透過にする（中心から塗りつぶしで窓だけを抜く）。窓の位置を layout.json に書く
  - pole / fence：白い背景を透過にする（白からの距離で不透明度を決め、縁の白いにじみを取る）
  - pole：電線が画像の端で切れないよう、左右の端に向かって薄くする。夕方は昼の電柱を夕日の色に染める
  - fence：左右の端がつながるよう、左右反転したものを横につなぐ。時間帯・天気ごとに色を合わせた版を各フォルダへ
  - mid：上下左右の黒い帯を切り、左右の端を「差がいちばん小さい切れ目」でつないでループにする（鏡合わせ・二重写しにしない）。上端を空へ溶かす
    （中景だけ作り直すとき：python3 scripts/process-train-assets.py mid）
  - sky：黒い帯を切り、左右の端を重ねてつなぎ目のないループにする
  - station：窓枠と下の暗い帯を切り落とし、駅名標の位置と、その上に重ねる文字の色を書く
    （駅のホームだけ作り直すとき：python3 scripts/process-train-assets.py station）
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'train'
OUT = ROOT / 'public' / 'train'
SETS = ['day', 'sunset', 'night', 'rain']


def save(img: Image.Image, path: Path, quality=82):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, 'WEBP', quality=quality, method=6)
    print(f'{path.relative_to(ROOT)}  {img.size}  {path.stat().st_size // 1024} KB')


def resize_h(img: Image.Image, h: int) -> Image.Image:
    return img.resize((round(img.width * h / img.height), h), Image.LANCZOS)


def white_to_alpha(img: Image.Image, gain=4.0) -> Image.Image:
    """白い背景を透過に。白からの離れ具合 → 不透明度。半透明の縁は白を引いて色を戻す"""
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    dark = (255 - a).max(axis=2) / 255  # 0 = 真っ白
    dark[dark < 0.035] = 0  # JPEG のざらつきは消す
    alpha = np.clip(dark * gain, 0, 1)
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip((a - 255 * (1 - alpha[..., None])) / safe, 0, 255)
    rgb[alpha < 1e-3] = 0
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def crop_alpha(img: Image.Image, pad=4) -> Image.Image:
    bbox = img.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))


def crop_black_bars(img: Image.Image) -> Image.Image:
    a = np.asarray(img.convert('L')).astype(np.float32)
    rows = a.mean(axis=1)
    cols = a.mean(axis=0)
    top = next(i for i, v in enumerate(rows) if v > 18)
    bottom = len(rows) - next(i for i, v in enumerate(rows[::-1]) if v > 18)
    left = next(i for i, v in enumerate(cols) if v > 18)
    right = len(cols) - next(i for i, v in enumerate(cols[::-1]) if v > 18)
    # 帯の縁のにじみも少し落とす
    m = 4
    return img.crop((left + (m if left else 0), top + (m if top else 0), right - (m if right < img.width else 0), bottom - (m if bottom < img.height else 0)))


def seamless(img: Image.Image, frac=0.22) -> Image.Image:
    """左右の端を重ねてループにする：終わりの frac を頭へなめらかに重ね、そのぶん短くする"""
    a = np.asarray(img).astype(np.float32)
    w = a.shape[1]
    b = int(w * frac)
    out = a[:, : w - b].copy()
    t = np.linspace(0, 1, b, dtype=np.float32)
    t = t * t * (3 - 2 * t)  # なめらかに
    t = t[None, :, None]
    out[:, :b] = a[:, w - b :] * (1 - t) + a[:, :b] * t
    return Image.fromarray(out.astype(np.uint8), img.mode)


def seam_loop(img: Image.Image, frac=0.2, feather=8) -> Image.Image:
    """左右の端をつないでループにする（鏡合わせ・二重写しにしない）。
    終わりの frac と頭の frac を重ね、その中で 2 枚の差がいちばん小さい縦の道（動的計画法の最小コストの切れ目）を探し、
    切れ目の左は終わりの絵・右は頭の絵にする。切れ目のまわり ±feather px だけなじませる。"""
    a = np.asarray(img.convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    b = int(w * frac)
    A = a[:, w - b :]  # 終わり（ループで前に来る絵）
    B = a[:, :b]  # 頭（ループで後ろに来る絵）
    err = ((A - B) ** 2).sum(axis=2)
    # 端の近くでは切らない（重ねた帯の真ん中あたりを通す）
    margin = feather * 2
    err[:, :margin] += 1e9
    err[:, b - margin :] += 1e9
    cost = err.copy()
    for y in range(1, h):
        prev = cost[y - 1]
        left = np.concatenate(([np.inf], prev[:-1]))
        right = np.concatenate((prev[1:], [np.inf]))
        cost[y] += np.minimum(np.minimum(left, prev), right)
    seam = np.zeros(h, dtype=np.int32)
    seam[-1] = int(np.argmin(cost[-1]))
    for y in range(h - 2, -1, -1):
        x = seam[y + 1]
        lo, hi = max(0, x - 1), min(b, x + 2)
        seam[y] = lo + int(np.argmin(cost[y, lo:hi]))
    cols = np.arange(b)[None, :]
    t = np.clip((cols - seam[:, None] + feather) / (2 * feather), 0, 1)[..., None]
    t = t * t * (3 - 2 * t)
    out = a[:, : w - b].copy()
    out[:, :b] = A * (1 - t) + B * t
    return Image.fromarray(out.astype(np.uint8), 'RGB')


def mirror_tile(img: Image.Image) -> Image.Image:
    both = Image.new(img.mode, (img.width * 2, img.height))
    both.paste(img, (0, 0))
    both.paste(img.transpose(Image.FLIP_LEFT_RIGHT), (img.width, 0))
    return both


def fade_top(img: Image.Image, frac=0.16) -> Image.Image:
    """中景の上端を空へ溶かす（山の上がまっすぐな線で切れないように）"""
    img = img.convert('RGBA')
    a = np.asarray(img).astype(np.float32)
    h = a.shape[0]
    n = int(h * frac)
    t = np.linspace(0, 1, n, dtype=np.float32)
    t = t * t * (3 - 2 * t)
    a[:n, :, 3] *= t[:, None]
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def fade_sides(img: Image.Image, frac=0.16) -> Image.Image:
    a = np.asarray(img).astype(np.float32)
    w = a.shape[1]
    n = int(w * frac)
    t = np.linspace(0, 1, n, dtype=np.float32) ** 1.5
    a[:, :n, 3] *= t[None, :]
    a[:, w - n :, 3] *= t[::-1][None, :]
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def tint(img: Image.Image, mul, add=(0, 0, 0)) -> Image.Image:
    a = np.asarray(img).astype(np.float32)
    for i in range(3):
        a[..., i] = np.clip(a[..., i] * mul[i] + add[i], 0, 255)
    return Image.fromarray(a.astype(np.uint8), img.mode)


def frame_table():
    img = Image.open(SRC / 'frame-table.jpeg').convert('RGB')
    w, h = img.size
    # 窓ガラス＝中央にある明るく色の薄い部分。塗りつぶしで窓だけをつなげて抜く
    a = np.asarray(img).astype(np.int16)
    bright = (a.min(axis=2) >= 222) & ((a.max(axis=2) - a.min(axis=2)) <= 34)
    mask = Image.fromarray((bright * 255).astype(np.uint8), 'L').copy()
    cx, cy = w // 2, int(h * 0.38)
    ImageDraw.floodfill(mask, (cx, cy), 128)
    hole = Image.fromarray(((np.array(mask) == 128) * 255).astype(np.uint8), 'L')
    # 穴を少し広げて白いにじみを消し、縁をぼかす
    hole = hole.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(2.2))
    x0, y0, x1, y1 = hole.point(lambda v: 255 if v > 128 else 0).getbbox()
    alpha = Image.fromarray(255 - np.asarray(hole), 'L')
    rgba = img.convert('RGBA')
    rgba.putalpha(alpha)
    out_w = 1290
    rgba = rgba.resize((out_w, round(h * out_w / w)), Image.LANCZOS)
    save(rgba, OUT / 'frame-table.webp', quality=86)
    # 画面の外の帯（ステータスバー・ホームバー）の色：上端と下端の平均
    arr = np.asarray(img).astype(np.float32)
    top = arr[: int(h * 0.04)].reshape(-1, 3).mean(axis=0)
    bottom = arr[int(h * 0.96) :].reshape(-1, 3).mean(axis=0)
    hexc = lambda c: '#' + ''.join(f'{int(v):02X}' for v in c)
    return {
        'width': rgba.width,
        'height': rgba.height,
        'window': {'x': x0 / w, 'y': y0 / h, 'w': (x1 - x0) / w, 'h': (y1 - y0) / h},
        'edge': {'top': hexc(top), 'bottom': hexc(bottom)},
    }


# 手前のフェンスは時間帯・天気ごとに色を合わせた版を作る（重ねる色を動く層に乗せないため）
FENCE_GRADE = {
    'day': ((1.0, 1.0, 1.0), (0, 0, 0), 0.0),
    'sunset': ((1.0, 0.74, 0.58), (14, 2, 0), 0.0),
    'night': ((0.3, 0.34, 0.48), (0, 0, 6), 0.2),
    'rain': ((0.74, 0.8, 0.86), (0, 0, 4), 0.35),
}


def grade(img: Image.Image, mul, add, desat) -> Image.Image:
    a = np.asarray(img).astype(np.float32)
    rgb = a[..., :3]
    if desat:
        g = rgb.mean(axis=2, keepdims=True)
        rgb = rgb * (1 - desat) + g * desat
    rgb = np.clip(rgb * np.array(mul) + np.array(add), 0, 255)
    a[..., :3] = rgb
    return Image.fromarray(a.astype(np.uint8), img.mode)


def fence():
    img = white_to_alpha(Image.open(SRC / 'fence.jpeg'), gain=3.2)
    img = crop_alpha(img)
    # 左右反転をつなげて、端どうしがつながる帯にする
    both = resize_h(mirror_tile(img), 320)
    for name, (mul, add, desat) in FENCE_GRADE.items():
        save(grade(both, mul, add, desat), OUT / name / 'fence.webp', quality=80)
    return {'width': both.width, 'height': both.height}


def pole(name: str, src: Path, sunset=False):
    img = white_to_alpha(Image.open(src), gain=3.4)
    if sunset:
        img = tint(img, (1.0, 0.88, 0.76), (12, 3, 0))
    img = fade_sides(crop_alpha(img))
    img = resize_h(img, 1400)
    save(img, OUT / name / 'pole.webp', quality=80)
    return {'width': img.width, 'height': img.height}


def mid(name: str):
    img = crop_black_bars(Image.open(SRC / name / 'mid.jpeg').convert('RGB'))
    # 田園は左右の端を「差がいちばん小さい切れ目」でつないでループにする（鏡合わせ・家の二重写しにしない）
    img = seam_loop(img, 0.2)
    img = fade_top(img, 0.14)
    img = resize_h(img, 760)
    save(img, OUT / name / 'mid.webp', quality=80)
    return {'width': img.width, 'height': img.height}


def sky(name: str):
    img = crop_black_bars(Image.open(SRC / name / 'sky.jpeg').convert('RGB'))
    img = seamless(img, 0.3)
    img = resize_h(img, 900)
    save(img, OUT / name / 'sky.webp', quality=78)
    return {'width': img.width, 'height': img.height}


# 駅のホーム（休憩・終着で停車する景色）。アップロードの窓枠・下の暗い帯を切り落とす範囲（元の画像の px）と、
# 駅名標の位置（切ったあとの画像に対する割合。line は矢印の線の高さ）
STATION = {
    'day': {'crop': (290, 135, 2880, 1240), 'sign': (0.412, 0.147, 0.588, 0.342), 'line': 0.281},
    'sunset': {'crop': (255, 115, 2495, 1345), 'sign': (0.401, 0.221, 0.601, 0.397), 'line': 0.341},
    'night': {'crop': (40, 0, 2712, 1350), 'sign': (0.411, 0.273, 0.589, 0.446), 'line': 0.389},
    'rain': {'crop': (30, 0, 2722, 1410), 'sign': (0.411, 0.239, 0.589, 0.406), 'line': 0.353},
}


def station(name: str):
    cfg = STATION[name]
    img = Image.open(SRC / name / 'station.jpeg').convert('RGB').crop(cfg['crop'])
    x0, y0, x1, y1 = cfg['sign']
    # 駅名標の地の明るさで、上に重ねる文字の色を決める（暗い看板には明るい文字）
    w, h = img.size
    board = np.asarray(img.crop((int(w * (x0 + 0.02)), int(h * (y0 + 0.02)), int(w * (x1 - 0.02)), int(h * (cfg['line'] - 0.02))))).astype(np.float32)
    lum = float((board[..., 0] * 0.299 + board[..., 1] * 0.587 + board[..., 2] * 0.114).mean() / 255)
    img = resize_h(img, 1000)
    save(img, OUT / name / 'station.webp', quality=80)
    return {
        'width': img.width,
        'height': img.height,
        'sign': {'x': x0, 'y': y0, 'w': round(x1 - x0, 4), 'h': round(y1 - y0, 4), 'line': cfg['line']},
        'ink': '#2A2622' if lum > 0.32 else '#EFE6D2',
    }


def write_layout(layout):
    text = json.dumps(layout, indent=2) + '\n'
    (OUT / 'layout.json').write_text(text)
    # アプリが読み込む寸法（窓の位置・画像の大きさ）。public のファイルは import できないので src にも置く
    (ROOT / 'src' / 'designs' / 'train' / 'scene' / 'assets.json').write_text(text)


def main():
    import sys

    if sys.argv[1:] == ['mid']:
        # 中景（田園）だけを作り直す
        layout = json.loads((OUT / 'layout.json').read_text())
        for s in SETS:
            layout['sets'][s]['mid'] = mid(s)
        write_layout(layout)
        return
    if sys.argv[1:] == ['station']:
        # 駅のホームだけを作り直す（ほかの素材はそのまま）
        layout = json.loads((OUT / 'layout.json').read_text())
        for s in SETS:
            layout['sets'][s]['station'] = station(s)
        write_layout(layout)
        return
    layout = {'frame': frame_table(), 'fence': fence(), 'sets': {}}
    for s in SETS:
        p = pole(s, SRC / 'day' / 'pole.jpeg', sunset=True) if s == 'sunset' else pole(s, SRC / s / 'pole.jpeg')
        layout['sets'][s] = {'sky': sky(s), 'mid': mid(s), 'pole': p, 'station': station(s)}
    write_layout(layout)
    print('layout.json', json.dumps(layout['frame']))


if __name__ == '__main__':
    main()
