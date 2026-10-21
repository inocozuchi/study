# 航空モードの素材

```
public/flight/
  window-frame.webp  機内の楕円の窓枠（窓ガラスは透過）
  wing.webp          窓から見える主翼（背景は透過）
  day/sky.webp       昼の空・雲海（左右がつながるループ）
  sunset/sky.webp    夕方の空・雲海
  night/sky.webp     夜の空・雲海
  map-dark.svg / map-lines.svg / dots.svg   地図（scripts/build-maps.py が作る。手で置き換えない）
```

- 窓の外の画像は `scripts/process-flight-assets.py` で仕上げます（元の画像は `assets-src/flight/`）。
  窓ガラスの白を透過（中心からの塗りつぶし）、主翼の白い背景を透過（四隅からつながった白だけ）、空は左右の端を重ねてループに。
- 画像を差し替えるときは `assets-src/flight/` の元の画像を置き換えて `python3 scripts/process-flight-assets.py` を実行し、
  窓ガラスの位置（スクリプトが表示する `window`）を `src/designs/flight/WindowView.tsx` の `GLASS` に合わせます。
