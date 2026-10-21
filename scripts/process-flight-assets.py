"""
航空モードの機窓ビューの素材を、アプリで使う形に仕上げる。

  入力：assets-src/flight/   （アップロードされた元の JPEG）
  出力：public/flight/        window-frame.webp / wing.webp / {day,sunset,night}/sky.webp

  python3 scripts/process-flight-assets.py      （Pillow と numpy が必要）

やっていること
  - window-frame：窓ガラスの白い部分を透過にする（中心から塗りつぶしで窓だけを抜く）。窓の位置を表示する
  - wing：白い背景を透過にする（四隅からつながった白だけを抜く。翼の白い光は残す）。縁は白からの距離でなじませる
  - sky：左右の端を重ねてつなぎ目のないループにする（横に流し続けるため）
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'flight'
OUT = ROOT / 'public' / 'flight'


def save(img: Image.Image, path: Path, quality=82):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, 'WEBP', quality=quality, method=6)
    print(f'{path.relative_to(ROOT)}  {img.size}  {path.stat().st_size // 1024} KB')


def resize_w(img: Image.Image, w: int) -> Image.Image:
    return img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)


def flood(mask: np.ndarray, seeds) -> np.ndarray:
    """明るい部分（mask）のうち、seeds からつながった部分だけ"""
    m = Image.fromarray((mask * 255).astype(np.uint8), 'L').copy()
    for s in seeds:
        if m.getpixel(s) == 255:
            ImageDraw.floodfill(m, s, 128)
    return np.asarray(m) == 128


def window_frame():
    img = Image.open(SRC / 'window-frame.jpeg').convert('RGB')
    w, h = img.size
    a = np.asarray(img).astype(np.int16)
    bright = (a.min(axis=2) >= 236) & ((a.max(axis=2) - a.min(axis=2)) <= 20)
    hole = flood(bright, [(w // 2, int(h * 0.5)), (w // 2, int(h * 0.42)), (w // 2, int(h * 0.62))])
    m = Image.fromarray((hole * 255).astype(np.uint8), 'L')
    # 穴を少し広げて白いにじみを消し、縁をぼかす
    m = m.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(2.5))
    x0, y0, x1, y1 = m.point(lambda v: 255 if v > 128 else 0).getbbox()
    rgba = img.convert('RGBA')
    rgba.putalpha(Image.fromarray(255 - np.asarray(m), 'L'))
    rgba = resize_w(rgba, 1000)
    save(rgba, OUT / 'window-frame.webp', quality=86)
    print('window', {'x': round(x0 / w, 4), 'y': round(y0 / h, 4), 'w': round((x1 - x0) / w, 4), 'h': round((y1 - y0) / h, 4)})


def wing():
    img = Image.open(SRC / 'wing.jpeg').convert('RGB')
    w, h = img.size
    a = np.asarray(img).astype(np.float32)
    white = (a.min(axis=2) >= 232) & ((a.max(axis=2) - a.min(axis=2)) <= 22)
    bg = flood(white, [(w - 2, 2), (2, 2), (w - 2, h - 2), (w // 2, 2), (w - 2, h // 2)])
    # 背景の縁：背景を少し広げたところは、白からの距離で半透明にする（縁の白いにじみを取る）
    bgm = Image.fromarray((bg * 255).astype(np.uint8), 'L')
    near = np.asarray(bgm.filter(ImageFilter.MaxFilter(7))) > 0
    dark = (255 - a).max(axis=2) / 255
    alpha = np.ones((h, w), np.float32)
    edge = near & ~bg
    alpha[edge] = np.clip(dark[edge] * 3.2, 0, 1)
    alpha[bg] = 0
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.where(alpha[..., None] < 0.999, np.clip((a - 255 * (1 - alpha[..., None])) / safe, 0, 255), a)
    out = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')
    out = resize_w(out, 1600)
    save(out, OUT / 'wing.webp', quality=84)


def seamless(img: Image.Image, frac=0.25) -> Image.Image:
    """左右の端を重ねてループにする：終わりの frac を頭へなめらかに重ね、そのぶん短くする"""
    a = np.asarray(img).astype(np.float32)
    w = a.shape[1]
    b = int(w * frac)
    out = a[:, : w - b].copy()
    t = np.linspace(0, 1, b, dtype=np.float32)
    t = (t * t * (3 - 2 * t))[None, :, None]
    out[:, :b] = a[:, w - b :] * (1 - t) + a[:, :b] * t
    return Image.fromarray(out.astype(np.uint8), img.mode)


def sky(name: str):
    img = Image.open(SRC / name / 'sky.jpeg').convert('RGB')
    img = seamless(img, 0.25)
    img = img.resize((round(img.width * 1100 / img.height), 1100), Image.LANCZOS)
    save(img, OUT / name / 'sky.webp', quality=78)


def main():
    window_frame()
    wing()
    for s in ['day', 'sunset', 'night']:
        sky(s)


if __name__ == '__main__':
    main()
