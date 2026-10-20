# ⛰️ Focus Trail — 集中旅行者

集中している時間は **山を登る旅**、休憩は **焚き火を囲む時間**。
学習・集中を記録する PWA です。サーバー不要、すべてブラウザ内で動作します。

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 型チェック + 本番ビルド（dist/）
npm run preview  # ビルド成果物を確認（Service Worker 有効）
```

## 画面

| 画面 | 内容 |
|---|---|
| **ホーム（ポモドーロタイマー）** | メイン機能。科目・時間を決めて集中 → 休憩 → 長押しで終了。深呼吸、ノート・ToDo・習慣、音楽プレイヤー、iOS 風の設定。タイマーのデザインは現在 **登山**（クレヨン調の 6 層シーンを関節で動くハイカーとコーギーが登る。春夏秋冬桜）。鉄道・飛行機は今後追加予定 |
| **タイムライン** | Structured 風の縦タイムライン。予定と実績の自動マッチ、空き時間、現在時刻ライン、あとから記録 |
| **ルート** | 科目ごとの山と 5 段階の風景、登頂スタンプと風景図鑑 |
| **インサイト** | 今日/今週/今月、ストリーク、日別積み上げ棒、科目ドーナツ、時間帯ヒートマップ、獲得標高（1分=10m） |

## しくみ

- **ズレないタイマー**：開始時刻 + 累積 ms で計算し、Web Worker は tick の合図のみ。スリープ・別タブ・リロード後も正確に復元
- **音**：Web Audio API で雨・焚き火・森の風・川・虫の音をリアルタイム合成。BGM は `public/bgm/` に置いた曲をシームレスにループ
- **軽さ**：クレヨン調の絵は一度だけ画像に焼き込み（2 回目以降はキャッシュ）、動かすのは transform / opacity だけ
- **データ**：Repository パターン（`src/data/`）。現在は LocalStorage 実装、Firestore 等へ差し替え可能
- **PWA**：manifest / Service Worker / iOS メタタグ。ホーム画面に追加して全画面で動作

## 公開してスマホのホーム画面に追加する（GitHub Pages）

`main` に push（PR をマージ）すると、`.github/workflows/deploy.yml` が自動でビルドして GitHub Pages に公開します。
URL は `https://<ユーザー名>.github.io/<リポジトリ名>/`（このリポジトリなら `https://inocozuchi.github.io/study/`）。

最初に 1 回だけ：
1. GitHub の無料プランでは Pages は**公開リポジトリ**でのみ使えます（Settings → General → Danger Zone → Change visibility）。
2. Settings → Pages → Build and deployment → Source を **GitHub Actions** にする。

iPhone でホーム画面に追加：Safari で URL を開く → 共有ボタン → 「ホーム画面に追加」→「Web アプリとして開く」がオンのまま「追加」。
アプリ内の 設定 → ホーム画面に追加 にも同じ手順があります。Safari で使った記録とホーム画面のアプリの記録は別々に保存されます。

アイコンと iOS の起動画像は `public/icons/icon.svg` から `scripts/generate-assets.mjs` で生成しています。

## 音を追加する（BGM・環境音）

| フォルダ | アプリでの場所 |
|---|---|
| `public/bgm/` | サウンド → BGM |
| `public/ambient/` | サウンド → ミキサー → 環境音 |

1. 音声ファイルをフォルダに置く（GitHub なら、フォルダを開いて「Add file → Upload files」）
2. `main` に入ると自動で公開される。ビルド時にフォルダの中のファイルが一覧に自動で足されるので、json を書かなくても出てくる

- 題名・絵文字・音量・継ぎ目の重ね方を決めたいときは `tracks.json` / `sounds.json` に書く（書き方は各フォルダの `README.md`）。
- 再生は Web Audio API のバッファループで、途切れずに無限ループする。環境音は継ぎ目で終わりを頭に重ねるので、録音をそのまま入れても「プチッ」と鳴らない。
- ミキサーで BGM・追加した環境音・内蔵の環境音（雨・川・森の風・虫・焚き火）の音量をそれぞれ変えられる。
- 再配布できる（自分で作った / ライセンス上 OK な）音だけを置いてください。公開リポジトリだと誰でもダウンロードできます。

設計とデザインシステムの詳細は [CLAUDE.md](./CLAUDE.md) を参照。
