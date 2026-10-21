# 列車モードの車窓の素材（public/train/）

アプリが読み込むのはこのフォルダの **WebP** です。元の画像は `assets-src/train/` にあり、
`python3 scripts/process-train-assets.py`（Pillow と numpy が必要）で、ここへ仕上げて書き出します。

| ファイル | 内容 | 仕上げ |
|---|---|---|
| `frame-table.webp` | 最前面の車内（窓枠・テーブル。9:16） | 窓ガラスの白を透過に |
| `{day,sunset,night,rain}/sky.webp` | 遠景（空・雲） | 黒い帯を切り、左右の端を重ねてループに |
| `{day,sunset,night,rain}/mid.webp` | 中景（田園・集落） | 黒い帯を切り、左右反転をつないでループに。上端を空へ溶かす |
| `{day,sunset,night,rain}/fence.webp` | 近景（線路沿いのフェンス・ガードレール） | 白を透過に。左右反転でループに。時間帯・天気の色に合わせる |
| `{day,sunset,night,rain}/pole.webp` | 近景（電柱） | 白を透過に。電線の端を薄く。夕方は昼の電柱を夕日の色に |
| `{day,sunset,night,rain}/station.png` | 駅のホーム（停車中の景色。受け入れ待ち） | 置いたあと、仕上げて停車中の表示に組み込む |
| `layout.json` | 窓の位置・画像の大きさ | アプリ用に `src/designs/train/scene/assets.json` にも同じものを書く |

## 素材を差し替えるとき

1. `assets-src/train/` の同じ名前の JPEG / PNG を置き換える（白い背景のままで大丈夫）
   - `frame-table.jpeg` / `fence.jpeg`
   - `day/` `sunset/` `night/` `rain/` の `sky.jpeg` `mid.jpeg` `pole.jpeg`（夕方の電柱は昼のものを使う）
2. `python3 scripts/process-train-assets.py` を実行し、できた `public/train/` と `assets.json` をコミット
