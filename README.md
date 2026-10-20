# ⛰️🚃 Focus Trail — 集中旅行者

集中している時間は **旅**。山を登るか、ローカル線の車窓をゆくか。
学習・集中を記録する PWA です。サーバー不要、すべてブラウザ内で動作します（Google カレンダーの読み込みだけは任意で接続）。

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 型チェック + 本番ビルド（dist/）
npm run preview  # ビルド成果物を確認（Service Worker 有効）
```

## 画面

| 画面 | 内容 |
|---|---|
| **ホーム（ポモドーロタイマー）** | メイン機能。科目・時間を決めて集中 → タップで休憩 → 長押しで終了。深呼吸、ノート・ToDo・習慣、音楽プレイヤー、設定（ライト／ダーク・フォント） |
| **旅のモード** | **登山**：クレヨン調の 6 層シーンを、パステルのハイカーとコーギーが登る（春夏秋冬桜・服とテントを選べる）。**列車**：国鉄の客車の窓から見る 5 層の車窓。普通／特急、発車して加速し、休憩で駅に止まる。**航空**：準備中 |
| **旅のパス** | モードごとのカード（登山者 ID カード・指定席券・搭乗券）。ニックネームと目標（行き先）はモード共通 |
| **タイムライン** | Structured 風の縦タイムライン + 月のカレンダー。予定と実績の自動マッチ、空き時間、現在時刻ライン、あとから記録、Google カレンダーの予定 |
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
| `public/sounds/` | `train.mp3` は列車モードの走行音（速さに合わせて再生速度が変わる）。それ以外（川・雨・祭り…）は環境音 |

1. 音声ファイルをフォルダに置く（GitHub なら、フォルダを開いて「Add file → Upload files」）
2. `main` に入ると自動で公開される。ビルド時にフォルダの中のファイルが一覧に自動で足されるので、json を書かなくても出てくる

- 題名・絵文字・音量・継ぎ目の重ね方を決めたいときは `tracks.json` / `sounds.json` に書く（書き方は各フォルダの `README.md`）。
- 再生は Web Audio API のバッファループで、途切れずに無限ループする。環境音は継ぎ目で終わりを頭に重ねるので、録音をそのまま入れても「プチッ」と鳴らない。
- ミキサーで BGM・追加した環境音・内蔵の環境音（雨・川・森の風・虫・焚き火）の音量をそれぞれ変えられる。
- 再配布できる（自分で作った / ライセンス上 OK な）音だけを置いてください。公開リポジトリだと誰でもダウンロードできます。

## Google カレンダーを表示する（任意）

予定を **見るだけ** で取り込みます（書き換えません）。サーバーがないので、Google の「ブラウザ向けの OAuth」を使います。

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作り、「API とサービス → ライブラリ」で **Google Calendar API** を有効にする
2. 「OAuth 同意画面」を作る（外部・テストユーザーに自分の Google アカウントを追加）
3. 「認証情報 → 認証情報を作成 → OAuth クライアント ID」で種類を **ウェブ アプリケーション** にして、
   - 承認済みの JavaScript 生成元：`https://inocozuchi.github.io`
   - 承認済みのリダイレクト URI：`https://inocozuchi.github.io/study/`
4. できたクライアント ID を、アプリの 設定 → 連携 → Google カレンダー に貼って「Google でログインして接続」

- クライアント ID は公開しても問題ない値です。端末ごとに貼るのが面倒なら `src/lib/googleCalendar.ts` の `BUILTIN_CLIENT_ID` に書いておけます。
- ログインは約 1 時間で切れます。切れたあとは最後に読んだ予定を表示し、タイムラインの「再接続」から読み直せます。

設計とデザインシステムの詳細は [CLAUDE.md](./CLAUDE.md) を参照。
