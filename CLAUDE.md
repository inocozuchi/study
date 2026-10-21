# Focus Trail

学習・集中記録 PWA。**メイン機能はポモドーロタイマー**。タイムライン・ルート・インサイトはサブ機能。
タイマーには複数の「デザイン」＝**旅のモード**がある：
- **登山**（集中＝山を登る旅、休憩＝焚き火、終わり＝キャンプの夜）
- **列車**（大正・昭和レトロ × アニメ美術の車窓。予約は全国の路線の古地図・木の客車の座席・硬券と改札鋏。休憩＝途中の駅、一時停止＝信号場、終わり＝行き先の駅）
- **航空**（Liquid Glass × ナイトフライトレーダー。予約は航路図とダイヤル・機内の座席・搭乗券とゲート。集中＝夜の地図の上を機体が進む）
各デザインは別物として作る（登山の複製にしない）。列車・航空は「旅の予約から出発までの儀式」（下記「予約」）から始まる。

- **アプリ本体は泰山木POS（inocozuchi/pan-pos）と同じデザイン言語**：浮いた白いカード・青のアクセント・ライト／ダーク。色は分類に必要なところ（科目の色）以外は最小限。
- **クレヨン × 布の見た目は登山デザインの中だけ**（`src/designs/mountain/`）。列車の見た目は `src/designs/train/`、航空は `src/designs/flight/` の中だけ。アプリ本体に持ち出さない。

すべてブラウザ内で完結（外部 API なし）。

## コマンド

```bash
npm install
npm run dev        # 開発サーバー
npm run typecheck  # 型チェックのみ
npm run build      # tsc -b && vite build（必ずエラーゼロで終えること）
npm run preview    # ビルド成果物の確認（Service Worker もここで動く）
```

## 技術スタック

React 18 + TypeScript (strict) + Vite 5 / Tailwind CSS 3 / Framer Motion 11 /
Lucide React / canvas-confetti / Web Audio API / Web Worker / Wake Lock / Page Visibility。

## ディレクトリ構成

```
src/
  main.tsx              エントリ。SW 登録（production のみ）
  App.tsx               画面シェル：背景シーン + 画面切替 + タブバー + グローバルモーダル
  types/                ドメイン型（Subject, FocusSession, PlanBlock, Settings, ActiveTimer …）
  data/
    repository.ts       FocusRepository インターフェース（非同期）。Firestore 実装はここを実装するだけ
    localRepository.ts  LocalStorage 実装（キー接頭辞 focus-trail:v1:）
    index.ts            使用する repository の選択点
  store/
    AppStore.tsx        データ（科目/セッション/予定/設定）の Context + アクション
    TimerStore.tsx      タイマー状態機械（Worker tick + タイムスタンプ差分）+ ディープ集中 + Wake Lock
  timer/timer.worker.ts 250ms ごとの tick を投げるだけの Worker（時間計算は常に Date.now() 差分）
  audio/ambient.ts      内蔵の環境音シンセ（雨・焚き火・森の風・川・虫）+ チャイム。環境音のまとめ（output）を持つ
  audio/ambientFiles.ts 追加した環境音（public/ambient）のミキサー。音ごとに LoopPlayer + GainNode
  audio/ambientLibrary.ts 環境音リスト：public/ambient/sounds.json（実行時に読む。絵文字はファイル名から推測）
  audio/bgm.ts          BGM エンジン（アップロードした曲を LoopPlayer で鳴らす。曲は ID で選ぶ）
  audio/loopPlayer.ts   音声ファイルのシームレス無限ループ（AudioBuffer ループ、無音の自動トリム、継ぎ目のクロスフェードを焼き込む）
  audio/bgmLibrary.ts   曲リスト：public/bgm/tracks.json（実行時に読む）。曲がなければ BGM は鳴らない
  audio/trainSound.ts   列車の走行音（public/sounds/train.*）。クロスフェードなしのループ、速さに合わせて playbackRate（普通 1.0・快速 1.12・急行 1.25・特急 1.4）
  audio/sfx.ts          予約・出発の儀式の効果音（すべて合成）：ダイヤルの刻み・改札鋏・発車ベル・汽笛・半券を切る音・スキャン・機内チャイム・電子音
  audio/cabinSound.ts   航空の機内の音（茶色のノイズを低域で。合成・継ぎ目なしのループ）
  lib/                  純粋関数：time / altitude（標高・ステージ）/ stats / scene（空の配色・旅の時間）/ id
  lib/fonts.ts          フォント設定（FONTS。選んだ書体を Google Fonts から読み込み、CSS 変数で全体に反映）
  hooks/                useNow, useWakeLock など
  lib/theme.ts          外観（ライト / ダーク / 端末）を <html data-theme> に。画面の外の帯の色（theme-color・--edge）
  lib/sceneHold.ts      全画面の画面（設定など）がシーンを覆っている間、シーンの描画を止める
  lib/chrome.ts         画面ごとの枠（全画面のシーン・時刻の帯の下・タブバー）の表
  lib/tasks.ts          予約の座席で選ぶ「集中すること」の定番（フォーカス・作業・簿記・読む…）。選んだ名前が科目になる
  lib/googleCalendar.ts Google カレンダー（読み取りのみ・OAuth のブラウザ向けの流れ）
  designs/              ポモドーロタイマーのデザイン＝旅のモード（下記「タイマーのデザイン」）
    types.ts            TimerDesign の契約（Scene / Session / Result / SetupOptions / ProfileCard …）
    index.ts            登録（TIMER_DESIGNS）と、モードの並び（TRAVEL_MODES：登山 / 列車 / 航空）
    flight/             航空デザイン（下記「航空の構成」。クラス名は fl-）
      airports.ts       空港・航路（羽田からの所要の表 / ほかは距離から）・投影・航路の弧
      FlightMap.tsx     夜の地図のカメラ（中心・倍率を MotionValue で。絵は public/flight/map-*.svg）+ MapAnchor
      view.ts           シーン（地図）と HUD が共有する表示（カメラ・レイヤー・大きな時計・窓）
      FlightScene / FlightSession / FlightResult / WindowView（窓の外：窓枠・主翼・空の画像）/ PassCard（搭乗券）/ BoardingPass（旅のパス）
      booking/          FlightBooking → RouteStep（航路図とダイヤル）/ SeatStep（機内の座席）/ PassStep（チェックイン・搭乗）
    train/              列車デザイン（下記「列車シーンの構成」。クラス名は tr-）
      TrainScene / TrainSession / TrainResult / Ticket（マルス券のカード）
      stations.ts       止まる場所（出発駅・途中の駅・信号場・終着駅）。予約した旅は路線の実際の駅（`bookedStops` / `routeOf`）
      booking/          TrainBooking → LineStep（古地図とダイヤル・駅名標・旅の支度）/ CarStep（三等客車・展望車）/ TicketStep（改札）
                        HardTicket（硬券）/ line.ts（全国の路線の駅・営業キロ・種別 CLASSES）/ maps.json（路線ごとの古地図の投影）
      scene/            TrainStage（rAF・速さ・画像の層）/ views（景色の組・窓の位置）/ assets.json（素材の寸法）
    mountain/           登山デザイン（クレヨン × 布はこのフォルダの中だけ）
      index.ts          mountainDesign（mountain.css を読み込む）
      mountain.css      布の質感・クレヨンの部品（mt-paper / mt-ink-btn）・環境アニメーション
      CrayonDefs.tsx    クレヨンの SVG フィルタ（#crayon / #crayon-soft。文字列 CRAYON_FILTERS）+ CrayonOutline
      MountainScene.tsx タイマー状態 → ハイカーの気分（歩く/立つ/座る/警告/眠る）に変換してシーンを描く
      MountainSession.tsx 集中・休憩中の HUD（音楽・時間・完了、長押しで終了、休憩カード）
      MountainResult.tsx  夜のキャンプのリザルト
      IdCard.tsx        登山者 ID カード（旅のパス）/ MountainCustomize.tsx（ハイカーの服・テント）/ HikerPreview.tsx
      SeasonPicker.tsx / SeasonSwatch.tsx  支度シートに差し込む「シーズン」
      scene/            6 層シーン（下記「登山シーンの構成」）
        TrailStage.tsx  レイヤーの組み立て + 唯一の rAF ループ（関節・トラック・粒子を更新）
        Baked.tsx       クレヨンの絵を一度だけ PNG に焼き込んで表示（Cache Storage に保存）
        rigMath.ts      歩行サイクル・2 ボーン IK・座りポーズ・犬の速歩/伏せ・ポーズ補間
        HikerRig.tsx / DogRig.tsx  関節分割されたクレヨン × パステルのハイカーとコーギー
        CrayonPart.tsx  関節の中の動かない絵をフィルタごと画像に焼く（キャラクター用のフィルタ）
        tents.tsx       選べるテント（ドーム・三角・ティピー）
        layout.ts / palette.ts  画面サイズ→配置、時間帯の空・季節の配色
        layers/         Sky / Mountain / Tree / Meadow / Foreground / Light
  components/           アプリ本体（泰山木POS と同じデザイン言語）
    ui/                 GlassCard（＝.card）, Sheet, Modal, Segmented, PickerModal, Toggle, CheckCircle, Pressable …
    nav/                TabBar（下に浮いたカプセル・アイコンだけ）+ IslandPlayer（ダイナミックアイランド風）
    icons/              Pictograms（旅のモードのピクトグラム。絵文字の代わり）
    home/               SetupSheet（科目・時間 + デザイン固有の設定。登山だけ。列車・航空は予約の画面）
    booking/            useRulerDial（予約の横目盛りダイヤルの手ざわり。見た目は持たない）
    profile/            ModeSheet（旅のモードの切り替え）/ ProfileSheet（旅のパス：カード・ニックネーム・目標）
    timeline/           EntrySheet（予定・記録の入力）/ DayHoursSheet（起床・就寝）/ MonthCalendar（月のカレンダー）
    focus/              BreathOverlay（深呼吸。Apple Watch の「呼吸」風）
    audio/              CassettePlayer（サウンドのシート：BGM / ミキサー）+ SoundMixer（音ごとの音量）
    tools/              ToolsPanel（ノート / ToDo / 習慣、縦のサイドタブ）
    …                   画面ごとの部品（timeline/ routes/ insights/ trail/）
  screens/              HomeScreen / TimelineScreen / RoutesScreen / InsightsScreen / SettingsScreen
public/
  manifest.webmanifest, sw.js, icons/（icon.svg が元絵）, splash/（iOS 起動画像）
  bgm/      BGM のフォルダ（tracks.json は任意。README.md に書き方）
  ambient/  環境音のフォルダ（sounds.json は任意。README.md に書き方）
  train/    列車の車窓の素材（WebP。仕上げは scripts/process-train-assets.py、元の画像は assets-src/train/）。map/{hokkaido,tohoku,tokaido,kyushu,trail}.svg は路線ごとの古地図
  flight/   航空の地図（map-dark.svg / map-lines.svg）・搭乗券のドットの世界地図（dots.svg）・窓の外の画像（window-frame / wing / {day,sunset,night}/sky。仕上げは scripts/process-flight-assets.py、元の画像は assets-src/flight/）
  sounds/   モードの音：train.*＝列車の走行音、それ以外（river / rain / festival …）は環境音のミキサーに並ぶ
vite.config.ts             audioManifests：ビルド時に bgm/・ambient/・sounds/ の音声ファイルを一覧（json）へ自動で足す
scripts/generate-assets.mjs  icon.svg → アイコン PNG と iOS 起動画像（playwright-core を --no-save で入れて実行）
scripts/build-maps.py        地図を作る（devDependency の world-atlas＝Natural Earth の海岸線から。メルカトル。投影の値は航空の map.json・列車の maps.json）
.github/workflows/deploy.yml main への push で GitHub Pages に公開
```

## アーキテクチャ原則

- **データ層は Repository 経由のみ**。コンポーネントは `useApp()` のアクションを呼ぶ。
  ストアは楽観的にメモリ状態を更新してから repository に書き込む。
- **タイマーは「開始時刻 + 累積ms」モデル**。`elapsed = accumulatedMs + (now - startedAt)`。
  Worker は tick の合図だけ。タブ非表示・スリープ復帰でもズレない。実行中状態は永続化され、
  リロードしても継続する。カウントダウン終了時のセッション終了時刻は「予定終了時刻」で記録する。
- よそ見検知（ディープ集中）は**ない**（ユーザーの要望で削除）。アプリを離れてもタイマーはそのまま進む。
- 集中中は**画面をタップすると休憩、1.1 秒の長押しで旅を終える**（どのデザインでも同じ操作）。
- 休憩明けの自動出発は、休憩が終わって 1 分以内に気づいたときだけ。長く閉じていた間の集中を作り出さない。
- 時刻は epoch ms（number）、日付キーは `YYYY-MM-DD`（ローカル）、予定は「0時からの分」。
- タイムラインは **起床（`wakeMin`）から就寝（`sleepMin`。25:00 のように 24 時を越えてよい）まで**。始まり・終わりの印を押すか、設定で変える。
- 予定の入力：科目はその場で新しく作れる（`ensureSubject`）。時刻は「開始 + 長さ」（終わりは自動）。いまから / 前の予定のあと / 起床、
  よく使う長さ・ポモドーロ ×n、前に使ったタイトル、くり返し（毎日 7 日・平日 5 日・毎週 4 回）、重なりの警告。
- 予定の並べ替え：「予定を並べ替え」→ つまみをドラッグ（framer-motion の Reorder）。時刻は最初の予定の開始から、元の空き時間を保って詰め直す。
- 標高換算：**1 分 = 10 m**。科目ルートは `targetMinutes` で登頂、進捗で 5 ステージ。

## タイマーのデザイン

タイマーの状態・記録・音・設定はアプリ共通（`store/` `audio/`）。デザインは**見た目と演出だけ**を持つ。

```ts
interface TimerDesign {
  Scene           // いつも背景にあるシーン（ホームでも集中中でも）
  Session         // 集中・休憩中の全画面 UI（HUD）
  Result          // 旅の終わりの画面
  SetupOptions?   // 支度シートに差し込む固有の設定（登山：シーズン）
  Booking?        // 予約の画面（列車・航空）。あれば「集中」で支度シートの代わりに開く
  ProfileCard     // 旅のパスのカード（登山者 ID カード / 指定席券）
  ProfileOptions? // 旅のパスに差し込むカスタマイズ（登山：ハイカーの服・テント）
  edgeColors?     // ホームで画面の外の帯（ステータスバー・ホームバー）を塗る色
  routes?         // ルートの画面の見た目（列車＝路線図、航空＝航路図。ないモードは山岳ルート）
}
```

- 新しいデザインは `src/designs/<id>/` に作り、`designs/index.ts` の `TIMER_DESIGNS` と `TRAVEL_MODES` に登録し、`types` の `TimerDesignId`（`TravelMode`）に id を足す。
- デザイン同士でコード・CSS を共有しない（登山のリグやクレヨンを鉄道で使い回さない）。
- デザイン専用の CSS はそのフォルダの CSS ファイルに置き、`index.ts` から読み込む。クラス名には接頭辞（登山は `mt-`）。

## ホームの流れ（どのデザインでも共通）

`HomeScreen` が 1 つの画面の中で状態を切り替える（ホームタブのみ。没入中はタブバーを隠す）。
1. **ホーム**：上に「サウンド」「旅のモード（登山 ▾）」「旅のパス」「設定」、「やあ！{名前}、前へ進む準備はいい？」、大きな「集中」、右端にツールの縦タブ
2. **支度シート**（登山）：科目名（新しい名前なら科目を自動作成）・時間（ポモドーロ/タイマー/フリー）・デザイン固有の設定
   **予約**（列車・航空）：`design.Booking`。下記「予約」。出発の儀式が深呼吸の代わり（深呼吸は挟まない）
3. **深呼吸**（登山）：花びらの輪が 4 秒でふくらみ 4 秒でしぼむ。タップでスキップ
4. **集中・休憩**：`design.Session`（音楽・時間・完了。タップで休憩、どこでも 1.1 秒の長押しで終了。登山の休憩はテントと焚き火、列車は駅に停車）
5. **リザルト**：`design.Result`（登山：夜のキャンプに日付・時間・科目を日記のように。共有ボタンはない）

タイマーは「旅（journey）」単位：`startJourney` → 集中/休憩を繰り返す → `endJourney`（長押し）。
予約した旅は予定の集中時間（`journeyTargetMs`）に届くと自動で到着し、リザルトを出す（`arrival` → App が `setResult`）。

## ルートの画面（旅のモードに連動）
- `RoutesScreen` は選んでいるモードの `design.routes` を使う：登山＝山岳ルート（MountainArt・標高・登頂スタンプ）、
  列車＝路線図（東海道・山陽本線 東京→下関。科目の累計の割合だけ線路が伸びる）、航空＝航路図（東アジア周遊便 HND→…→HND）。
- 列車・航空のカードの絵は各デザインの `routes.tsx`（地図の SVG を `<image>` で敷いた 1 枚の静的な SVG。動かさない）。
  詳しいシートは駅・空港の印の一覧、記録のタブはログブック（`TravelLog`）。

## 予約（列車・航空）
- 3 ステップ：① 時間と行き先（上に地図、下に横目盛りダイヤル。刻みは「ポモドーロ 25 分刻み」/「フリー 5 分刻み」）→
  ② 座席を押して「何に集中しますか？」（`lib/tasks.ts` の定番 + 科目。選んだ名前が科目になる）→ ③ きっぷ / 搭乗券と出発の儀式。
- 終わると `onStart(BookingPlan)`。HomeScreen が `ensureSubject(名前, アイコン)`、設定を保存、`startJourney({ journeyMinutes, booking })`。
  ポモドーロは 25 分 × n（間に休憩）、フリーは 1 本の集中。1 回の長さはタイマーの `blockMs`（ふだんのポモドーロの設定は変えない）。
- 予約は `ActiveTimer.booking` に持つ（リロードしても残る）。到着・途中で終えたときに `TravelLog`（ログブック）を 1 件（repository の `addLog`）。
- ダイヤルは `components/booking/useRulerDial`（帯を transform で動かす。勢いの先の刻みに止まる。外から値を変えたときは途中の刻みを返さない）。
- 到着の瞬間はタイマーが idle になってからリザルトが入るまで 1 回の描画があく。HomeScreen は `arrival` がある間も旅の画面のままにする
  （hud → home → result と速く切り替わると AnimatePresence mode="wait" が home で止まる）。

## 航空の構成（src/designs/flight）
- 漆黒（#050608〜#12141A）に Liquid Glass（`.fl-glass`：`backdrop-filter: blur(24px) saturate(180%)`、半透明の白、上の縁の光沢）、
  アンバー #FF9F0A・レーダーイエロー #FFD60A、SF（システムの書体）+ 等幅数字。**ぼかしはこのデザインの中だけ**（ユーザーの指定。アプリ本体では使わない）。
  ぼかしは大きな面とボタンだけ。地図の上にたくさん並ぶピルは `.fl-tint`（ぼかしなし）。
- 地図：`FlightMap` が <img>（map-*.svg）+ 地図の単位の svg（航路・レーダーの円）を 1 枚の層にして transform で動かす。地図の絵は別の合成レイヤー（線が動いても描き直さない）。
  ピル・都市名・機体は画面の単位で `MapAnchor` / `MovingAnchor`（拡大しない）。地図のルートは `isolate`（z-index を外へ出さない）。
- 予約のカメラはダイヤルが止まってから動かし、拡大率は収まらないとき・ずっと寄れるときだけ変える（大きな地図を何度も描き直さない）。
- 空港は羽田からの所要の表（ユーザー指定）、ほかの出発地は `28 分 + 距離 / 16.5`。大島は実在のコード OIM。
- フライト中：タップで休憩・長押しで着陸・ドラッグで移動・2 本指で拡大。左上：一時停止・機内の音・大きな時計・音楽。右上：ルート全体・機体を追う・レイヤー・窓の外。
- **窓の外**（`WindowView`。サブの画面、メインはレーダーの地図）：下から 空と雲海 `{day,sunset,night}/sky.webp`（z1・時間帯で選び、ゆっくり横に流す）→ 主翼 `wing.webp`（z5・かすかに揺れる）→ シェード（ドラッグで開け閉め）→ 窓枠 `window-frame.webp`（z10・窓ガラスは透過）。
  右の座席（D / F）は進行方向が右：雲は右から左へ。左の座席（A / C）は雲が左から右へ流れ、主翼を `scaleX(-1)`。夜は窓枠・主翼を `brightness` で暗く（動かない絵にだけフィルタ）。
  下：残り時間・残り距離（予約の距離 × 残りの割合）。機内の音は飛んでいる間だけ（`settings.flightCabin`）。

## 列車の予約（src/designs/train/booking）
- 臙脂・木目・真鍮・生成りの紙・明朝（`.tr-mincho`。iPhone はヒラギノ明朝）。駅名は旧字（横濱・濱松・靜岡・豐橋）。
- **質感はマット**（上質紙・古布・使い込んだ木）：どの面にも `grain.png`（ごく薄い粒）を重ね、上の縁の白い光沢線・光沢のグラデーションは使わない。
  立体感は内側への影と温かい色のドロップシャドウだけ。色は生成り #F4EEDD・臙脂 #7A2830・真鍮 #B8955A・ダークウッド #3B2416（純白・純黒は使わない）。
  部品は `train.css` の `tr-paper` / `tr-wood` / `tr-brass` / `tr-enji` / `tr-velvet` / `tr-enamel` / `tr-card` / `tr-ruler` / `tr-gate` …（インラインで光沢を足さない）。
- 路線は 5 つ（`line.ts` の `LINES`。駅の位置・営業キロは実際の値のおおよそ）：函館・宗谷本線 / 東北本線 / 東海道・山陽本線（東京〜下関）/ 鹿児島本線・指宿枕崎線（門司港〜枕崎）/
  稚内〜枕崎 全線走破（北海道 → 青函トンネル → 東北本線 → 東海道・山陽本線 → 関門トンネル → 鹿児島本線）。地図の左上の路線の札で路線と出発駅、隣の札で上り・下り（`dir`）を選ぶ。
  地図は路線ごとの古地図（`public/train/map/{路線}.svg`、投影は `maps.json`）。カメラの倍率の上限・駅名を全部出す倍率は「1 度あたりの px」で決める。
- 種別：普通 / 快速 / 急行 / 特急（`CLASSES`）。集中 1 分で進む営業キロ（2.2 / 2.8 / 3.4 / 4.4 km）・車窓の速さ・走行音の速さ・料金が変わる。
  ダイヤルは 25 分〜10 時間。時間 × 種別の速さだけ線路が伸び（臙脂）、いちばん近い駅が行き先（琺瑯の駅名標）。地図の駅を押しても選べる。
- 旅の途中の駅は「集中した分の割合 = 進んだキロの割合」で通る（予約の時間ちょうどで行き先に着く）。着いた駅（途中下車の駅）が次の出発駅になり、同じ路線・同じ向きに乗り継げる（`trainFrom` / `trainLine` / `trainDir`）。
- 座席：三等客車（普通・快速・木のボックス席）/ 展望車（急行・特急・ソファと展望デッキ）。客車を替えると種別も替わる。
- 改札：硬券（B 型の比・地紋・日付印・乗車記念）を改札口へ → 改札鋏で切り欠き（入鋏痕）→ 発車ベル → 汽笛 → 車窓へズームイン。
- 休憩で止まる駅は「ここまでに集中した分」で通り過ぎた実際の駅。終着は行き先（途中で終えたら途中下車の駅）。

## 旅のモードと旅のパス
- モードはホームの上の「登山 ▾」か、設定 → 旅のモードで切り替える（`Settings.timerDesign`）。記録・科目はモード共通。
- **旅のパス**（ホームの ID カードのボタン）：モードごとのカード + 共通の **ニックネーム**（`userName`）と **目標**（`goal`）。
  - 登山：登山者 ID カード（累計の登山時間・現在の標高＝累計分 × 10 m）。ハイカーの服（`hikerLook`）とテント（`tentStyle`）を選べる
  - 列車：JR のマルス券（乗車券・特急券）ふう：うすい緑の地紋・全角の印字・水色の帯・発券の行。〇〇様・**出発駅**（`departure`）→ **行き先**（＝目標）
  - 航空：搭乗券（PASSENGER NAME・出発空港・DESTINATION＝目標・バーコード・GATE・MILEAGE＝ログブックの合計）

## 列車シーンの構成（src/designs/train/scene）
- 車窓は**アニメ美術の画像**（`public/train/`。WebP）を重ねた視差スクロール。SVG で描いた景色は使わない。
  - 最前面：車内の絵 `frame-table`（窓ガラスが透過）を画面いっぱいに置く（cover）。窓の位置は `assets.json` の割合から計算（`views.ts` の `trainLayout`）。
  - 窓の形に切り抜いた中（下から）：遠景 `sky` / 中景 `mid`（窓の下 64%、上端は空へ溶ける）/ フェンス `fence` / 電柱 `pole` / 架線（canvas）
  - 流れる速さ（巡航 = 1）：中景 60 px/秒 : 遠景 9 px/秒（10 : 1.5）、フェンス 150 px/秒。電柱は線路に沿って 2〜5 秒ごとに並び（`s.poles`。線路に沿った位置で持つ）、0.4 秒で窓を駆け抜ける。
  - 架線：窓の上 10〜25% に 3 本。電柱で高く留まり、電柱の間で放物線に垂れる（電柱が来ると跳ね上がり、過ぎるとまた垂れていく）。小さな canvas に線路の位置が変わったときだけ描く。
  - 動かすのは transform だけ（1 本の rAF）。各画像は横に並べた帯を「1 枚の幅で割った余り」だけ動かしてつなぎ目なく流す。
- 景色の組（`day` / `sunset` / `night` / `rain`）は時刻（空の時間の設定）と天気（`Settings.trainWeather`）から選ぶ（`viewFor`）。
  変わったら新しい組を 1.6 秒でふわっと重ね、古い組を外す。ほかの組の画像は起動 4 秒後に先読みする。
- 車内の色：夕方は茜色、夜は `brightness(0.4)` + 群青、雨は `grayscale(0.15) brightness(0.85)` + 青い影。
  色の重ねは車内の絵の形（`mask-image`）にだけ乗せる（窓の外には乗らない）。フェンスの色は時間帯ごとの画像に焼き込み済み（動く層にフィルタをかけない）。
- 雨は窓の外に雨のすじ（CSS の繰り返し画像を流すだけ）と、窓ガラスを流れる雨粒（`GlassDrops`：止まりかけては流れ落ちる粒＋小さな水滴。transform だけ）を重ねる。
- **駅のホーム**（`{day,sunset,night,rain}/station.webp`）：出発前・休憩・旅の終わりに、窓の右の外から滑り込んでホームの真ん中（絵の横 50%＝屋根の下の駅名標）で止まる。
  絵は `scale(1.15)`（黒い縁を出さない）+ 両端を `mask-image: linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)` で景色へ溶かし、両端に電柱を立ててつなぎ目を隠す。
  減速度は「いまの速さから距離 D＝(窓の幅＋ホームの幅)/2 でちょうど止まる」値（`流れる速さ × v² / 2D`）。集中の 1 回が終わる少し前からブレーキをかけ、終わる瞬間に止まる（`approach`）。
  発車すると加速に合わせて左へ流れ去る。駅名標の位置とその上に刷る文字の色は `assets.json` の `station.sign` / `ink`（`process-train-assets.py station` で作る）。
  駅名標には明朝で駅名・読み（路線の駅はかな）・前後の駅を重ねる（`SignBoard`）。一時停止（信号場）では駅に入らない。
- 速さ v（普通の巡航 = 1、快速 1.2、急行 1.42、特急 1.65）：発車でゆっくり加速し、休憩・一時停止・旅の終わりでブレーキをかけて止まる。走行音は `trainSound.setMotion()` に速さを伝える。
- 素材の仕上げ（透過・ループ・圧縮）は `scripts/process-train-assets.py`。元の画像は `assets-src/train/`。

## 空の時間（Settings.sky）
- `auto`＝**旅の時間（既定）**：集中を始めると朝（6.1 時）、集中の進み具合に合わせて昼・夕方（18.4 時）へ進み、
  休憩に入ると 40 秒かけて夜（21.6 時）になる。フリー（時間なし）は `pomodoroFocus` を 1 日分の長さとみなす。
  ホーム（旅の外）は今の時刻。計算は `lib/scene.ts` の `journeyHour` / `hourFor`、値は `App.tsx` の SceneLayer からデザインへ渡す。
- `clock`＝今の時刻、`dawn` / `day` / `sunset` / `night`＝固定。設定画面と支度シート（登山の SetupOptions）で選べる。

## フォント（Settings.font）
- 既定は **BIZ UDPゴシック**（見やすさ優先）。ほかにシステム / Noto Sans JP / M PLUS Rounded / Zen 丸ゴシック / Klee / しっぽり明朝。
- `applyFont()` が `--font-text` / `--font-digits` を `<html>` に設定。Tailwind の `font-sans` / `font-maru` / `font-digits` はこの変数を使うので、
  **登山デザインの文字もフォント設定に従う**。新しいフォントは `lib/fonts.ts` の `FONTS` に足すだけ。
- 起動直後は `main.tsx` の `applyCachedFont()` で前回の書体を当てる。SW は Google Fonts をキャッシュし、オフラインでも同じ書体で表示する。

## 登山シーンの構成（src/designs/mountain/scene）

すべて `position:absolute` の 6 層。下から：
1. **Sky**：セルリアンのグラデーション、太陽/月、入道雲（CSS で横に流れる）、羽ばたく鳥、夜は星
2. **Mountain**：空気遠近法の 2 段の山脈。周期タイルを `translate3d` で極めてゆっくり流す
3. **Tree**：左右からフレームインする針葉樹と白樺（CSS で根元を支点に揺れる）
4. **Meadow**：右上がりの草原斜面。草の質感は斜面に沿って回転したストリップを流す。ハイカー・犬・テント
5. **Foreground**：`blur(3px)` の草花（被写界深度）。草原より速く流れ、風で大きく揺れる
6. **Light**：焚き火（夜でも暗くならないようティントより上）、Canvas 粒子
   - 炎は Canvas の粒子（芯・中・外の 3 色のスプライトを最初に描いておき、加算合成で重ねる）。根元から湧き、中心へ寄りながら細く・赤く・薄くなる
   - 5 と 6 の間に時間帯ティント（夜：群青 multiply、朝夕：暖色 soft-light）

**描画の重さ（iOS で固まらないために）**
- iOS Safari は SVG フィルタを CPU で計算し、同じ描画レイヤーで何かが変わるたびに計算し直す。
  **クレヨンのフィルタをかけた絵は必ず `Baked` で画像に焼き込む**（画面に filter 付きの SVG を出したまま動かさない）。
  焼いた PNG は Cache Storage（`focus-trail-bake-v1`）に残り、2 回目以降の起動ではフィルタを計算しない。
- 毎フレーム変えてよいのは transform と opacity だけ。値が変わったときだけ書き込む（TrailStage の setOpacity）。
- 動く要素に CSS の `filter: blur()` をかけない（前景のぼかしも焼き込みの中で一度だけ）。たくさんの小さな要素を別々にアニメーションさせない（星は 3 群に分けて群ごと）。
- タイマーの再描画は 1 秒に 1 回。ホーム以外の画面は遅延読み込み（起動後に先読み）。

**骨格アニメーションの原則**
- リグは階層 `<g>`。関節の原点が回転の支点。React は描画のみ、毎フレームは `setAttribute('transform')` だけ。
- 脚は 2 ボーン IK で足首を斜面上の目標へ。接地中は足が後ろへ等速移動し、その速度＝地面の流れる速度（足が滑らない）。
- 状態（歩く/立つ/座る/警告）は重み（w, camp, alert）を lerp し、関節角をポーズ間で補間して切り替える。
- アニメーションする要素を SVG フィルタの内側に置かない（毎フレーム再計算になる）。
  木のように「揺れるけれど絵は静的」なものは、div ごとに SVG を分けて div を CSS で回す（合成レイヤー）。
- 季節（春・夏・秋・冬・桜）は `palette.ts` の `SEASONS`。草原・葉・舞うもの・前景の花がまとめて変わる。

### 登山デザインの見た目（クレヨン × 布）
- `#crayon`（静的な絵）、`#crayon-soft`（UI の線）。
  いずれも「輪郭の揺れ（displacement）」+「紙目でワックスが乗らない粒（noise → alpha）」。
- **キャラクター（ハイカー・犬）はクレヨン × パステル × キャンバス地**：黒い輪郭線を使わず、縁は塗りより少し濃いパステル色の途切れた線（`pastel()`）。
  色はテラコッタ・ダスティミント・クリーム・ウォームブラウン。フィルタは `CrayonPart` の `#cc`（fractalNoise 0.08 / 3 オクターブ → displacement 3 + 紙の歯 + 横糸）。
  関節ごとの動かない絵を `CrayonPart` で画像に焼き、関節は transform だけで動かす（毎フレーム フィルタを計算しない）。
- 小道具（丸太など）は焦げ茶 `#2E221C` の輪郭線 + 斜線の陰影。
- HUD は `.mt-ink-btn`（焦げ茶のフェルト）、休憩カードとリザルトのボタンは `.mt-paper`（生成りのキャンバス地）。
- 書体はフォント設定に従う（`font-maru` / `font-digits` は CSS 変数）。「Zen 丸ゴシック」を選ぶと以前の Zen Maru Gothic + Fredoka の見た目になる。

## アニメーションの注意（アプリ全体）
- **layoutId を使わない**：退場中の AnimatePresence の中にあると退場が止まり、モーダルが閉じなくなる。
  選択ピルは「index × 100%」の x で動かす（Segmented / TabBar を参照）。
- **退場するもの（シート・モーダル・オーバーレイ）の中に AnimatePresence mode="wait" を入れ子にしない**（同じく退場が止まる）。
  どうしても必要なら `useIsPresent()` で退場中は表示を固定する（MountainSession を参照）。
- 閉じるアニメーションの間に中身が消えないよう、シートに渡すデータは最後の値を ref に残して表示する（PickerModal / EntrySheet / 予定の詳細）。
- アプリ全体を `<MotionConfig reducedMotion="user">` で包んでいる。登山シーンは視差を減らす設定で歩く速さと地面の流れを一緒に落とす。列車は景色の流れを半分にし、揺れを止める。

## デザインシステム（アプリ本体 = 泰山木POS と同じ）

世界観：ホームの背景は選択中の旅のモードのシーン。ほかのタブ・シート・設定は、薄い灰色の地に浮いた白いカード（ダークでは濃紺の地に濃い灰のカード）。
すりガラス（backdrop-blur）は使わない（iPhone で重く、上部がぼやけて見えるため）。色は青のアクセントと科目の色だけ。

### カラー（`src/index.css` の CSS 変数 → tailwind.config.js のトークン）
外観は `<html data-theme="light|dark">`（`lib/theme.ts`。`index.html` の先頭のスクリプトが描画前に当てる）。
| トークン | ライト | 用途 |
|---|---|---|
| `page` | `#F2F3F7` | 画面の地 |
| `surface` | `#FFFFFF` | カード・シート |
| `sunken` / `fill` | — | へこんだ面・補助ボタンの下地 |
| `line` / `line-strong` | — | 1px の線 |
| `fg` / `fg-2` / `fg-3` | — | 主 / 補助 / 控えめな文字 |
| `accent` / `accent-ink` / `accent-soft` | `#0A6CE0` | 選択・主ボタン・リンク（ダークの文字は `#74B6FF`） |
| `danger…` | — | 消去など |
| `night-*` `ember` `sun` `paper` `ink` `crayon-*` | — | **シーン・デザイン専用**（アプリ本体では使わない） |

科目カラーは `lib/subjects.ts` の `SUBJECT_COLORS`（8 色・CVD 検証済み、順序固定）から選ぶ。図表の系列色もこれを使う（色は科目に従い、順位に従わない）。
シーンの上に直接置く文字（ホームの挨拶・ルートの絵の上）は外観に関係なく白。

### 部品（`src/index.css`）
- `.card`（浮いた白いカード `rounded-card` 13px + `shadow-card`）、`.group-box`、`.field`（入力）、`.btn-primary` / `.btn-secondary`
- `.page-title`（大見出し）、`.section-label`（13px の小見出し）
- 設定の 1 項目＝1 枚のカード（開く項目は青いアイコン + 値 + 「>」、スイッチの項目はへこんだアイコン + スイッチ）
- ホームの上のボタン・チップ・ツールの縦タブは `.fabric-denim.stitch`（インディゴのデニム + ステッチ）
- **絵文字は使わない**。アイコンは Lucide と、独自のピクトグラム（`components/icons/Pictograms.tsx`：登山・列車・航空）。文字は少なめ・小さめ
- `.hit`：見た目は小さいまま、押せる範囲を四方 6px 広げる
- 角丸：チップ `rounded-chip` 9px、カード `rounded-card` 13px、シート `rounded-t-sheet` 20px

### タイポグラフィ
- フォント設定の書体（既定 BIZ UDPゴシック。上記「フォント」）
- 大見出し 28–34px bold tracking-tight / セクション 13px bold fg-2 / 本文 15px / 補足 12–13px。数字は `tabular-nums`。

### 余白・レイアウト（iPhone のホーム画面アプリ）
- 画面左右 16–20px、カード内 16–20px、要素間 8/12/16/24。
- **全画面**：`viewport-fit=cover` + `black-translucent`。シーンは時刻の帯の下まで広がり、上に帯を作らない。文字・ボタンは `pt-safe` で時刻の下へ。
- **上の部品の線は `--safe-top`**（安全域 + 18px。`pt-safe` もこれ）。iOS のホーム画面アプリは時刻の帯のすぐ下をぼかして見せるので、そこに部品を置かない。
  デザインの中で上からの位置を決めるときも `calc(var(--safe-top) + …)` を使う（`env(safe-area-inset-top)` を直接使わない）。
- **iOS 26 のホーム画面アプリの高さ**（WebKit 301108）：cover + black-translucent で文書が画面より低いと、iOS は高さを時刻の帯の分だけ短く渡す
  （fixed の枠・タブバーが短い下端で止まり、下に地の色の帯が残る）。`index.css` の `@media (display-mode: standalone)` で
  `html { min-height: min(100lvh, calc(100% + env(safe-area-inset-top))) }` として文書を画面の高さまで伸ばす。この規則は消さない。
- **画面ごとの枠は `lib/chrome.ts` の `chromeFor`**（App.tsx はこれを読むだけ）：
  `fullscreen`（シーンを全画面に敷くか）/ `statusArea`（時刻の帯の下：`scene` 何も敷かない・`solid` 地の色・`scrim` うすい暗がり。`.status-band`）/ `bottomNav`（タブバー）。
  設定（全画面の重ね）は `OVERLAY_CHROME` で自分の `.status-band` を持つ。ぼかし（backdrop-filter）はどの画面にも使わない。
- タブバーの下の余白は `--tabbar-pb`、タブバーが占める高さは `--nav-space`（index.css）。スクロールする画面の最後は `.pb-nav`、ホームの「集中」は `--nav-space` から。
- 時刻の文字の色（`apple-mobile-web-app-status-bar-style`）は起動時に一度だけ読まれ、画面ごとには変えられない（iOS の制約）。
- **表示の診断**：設定 → データ →「表示の診断」（または `?layout-probe`）。高さ・安全域・100dvh/lvh/svh・枠/シーン/時刻の帯/タブバーの位置を表示（`components/debug/LayoutProbe.tsx`）。
- アプリの枠は `.app-frame`（`fixed` + `100dvh`）。全画面の重ね（シート・モーダル・設定）は `fixed inset-x-0 top-0 h-app`（`fixed inset-0` は使わない）。
- タブバーは**画面の下に浮いたカプセル**（左右と下に余白。iPhone の角で欠けない）。**アイコンだけ**で文字は出さない（名前は aria-label）。
  集中・休憩・リザルトの間は下へ隠す（シーンが最下部まで見える）。
- 上部のぼかしはどこにも置かない。

### アニメーション原則（`lib/motion.ts`）
- 既定スプリング：`{ type: 'spring', stiffness: 380, damping: 32 }`（UI 全般）
- ソフト：`{ stiffness: 220, damping: 28 }`（画面遷移・大きな面）
- タップ：`whileTap={{ scale: 0.96 }}`（`Pressable` コンポーネント）
- シートは下からスプリング、ドラッグで閉じる。モーダルは scale 0.94→1 + fade。
- タブ・セグメントの選択インジケータは index に合わせて x をスプリングで動かす（layoutId は使わない）。
- `prefers-reduced-motion` を尊重（Canvas の粒子量・視差を削減）。

## 起動画面
- `index.html` の `#boot`（アイコン + iOS の読み込みインジケーター）が JS より先に描かれる。iOS の起動画像（`public/splash/`。ライト・ダークの 2 種類）と同じ位置・大きさ・背景色（外観に合わせる）。
- アプリの準備ができたら `lib/boot.ts` の `hideBoot()` でフェードして消す（`App.tsx` の `Gate`）。
- アイコンを変えたら `scripts/generate-assets.mjs` を実行し、`index.html` の #boot の SVG も同じ図柄に揃える。

## 音のループ原則（BGM・環境音）
- ループは `AudioBufferSourceNode.loop` に任せる（HTMLAudio の loop は使わない）。再生中に継ぎ目の処理をしない。
- 継ぎ目は読み込み時に一度だけ作る（`seamlessBuffer`）：
  - BGM（既定 crossfade 0）：ループ用の曲は長さを変えずにそのままつなぐ。波形が飛ぶときだけ 8ms 重ねて「プチッ」を消す。
  - 環境音（既定 crossfade 1.5 秒）：録音をそのまま入れても鳴らないよう、終わりを頭に等パワーで重ねる（音量は下がらない）。
  - 先頭・末尾の無音はエンコーダーのパディング（1.5ms 以上・各端 0.25 秒まで）だけを外す。
- フェードはユーザーが再生/一時停止・音量を変えたときだけ。一時停止は位置を覚え、続きから再開する。
- 音の追加は `public/bgm/`・`public/ambient/`・`public/sounds/` にファイルを置くだけ（json は題名などを決めたいときだけ）。SW は一覧の json だけネットワーク優先。
- 列車の走行音（`public/sounds/train.*`）はクロスフェードせずサンプル単位でつなぎ、速さを playbackRate で表す（発車で上がっていき、巡航は普通 1.0・快速 1.12・急行 1.25・特急 1.4）。
- 音量は設定に保存（`bgmVolume` / `ambient`（内蔵）/ `ambientFiles`（追加した音、ID ごと））。起動時は再生を止めた状態から（iOS はタップが必要）。

## 規約
- 文言は日本語。コンポーネントは関数 + 名前付き export。
- 新規の永続データは types → repository → localRepository → AppStore の順に追加。
- 初めて開いたときは記録も科目も空（サンプルデータはない）。試作版のサンプル記録は `fresh-start` のしるしで一度だけ消している。
- ビルド前に `npm run build` を通すこと。
