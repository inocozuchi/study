# 航空モードの素材（機窓ビュー）

ここに置いた画像は、フライト中の「窓の外」で使う予定です（いまは CSS で描いた仮の夜空）。

```
public/flight/
  window-frame.png   機内の楕円の窓枠（窓の部分は透過）
  wing.png           窓から見える主翼（背景は透過）
  day/sky.png        昼の空・雲海
  sunset/sky.png     夕方の空・雲海
  night/sky.png      夜の空・雲海
```

- 地図（`map-dark.svg` / `map-lines.svg`）と搭乗券の背景（`dots.svg`）は `scripts/build-maps.py` が作るファイルです。手で置き換えないでください。
- 画像を置いたら、透過・ループ・圧縮（WebP）の仕上げをしてから窓の外の表示に組み込みます。
