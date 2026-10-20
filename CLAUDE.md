# Focus Trail

学習・集中記録 PWA。**メイン機能はポモドーロタイマー**。タイムライン・ルート・インサイトはサブ機能。
タイマーには複数の「デザイン」＝**旅のモード**がある：
- **登山**（集中＝山を登る旅、休憩＝焚き火、終わり＝キャンプの夜）
- **列車**（集中＝国鉄の客車の車窓の旅、休憩＝途中の駅、一時停止＝信号場、終わり＝目標の駅）
- **航空**は準備中（Coming Soon。搭乗券のカードだけ）
各デザインは別物として作る（登山の複製にしない）。

- **アプリ本体は泰山木POS（inocozuchi/pan-pos）と同じデザイン言語**：浮いた白いカード・青のアクセント・ライト／ダーク。色は分類に必要なところ（科目の色）以外は最小限。
- **クレヨン × 布の見た目は登山デザインの中だけ**（`src/designs/mountain/`）。列車の見た目は `src/designs/train/` の中だけ。アプリ本体に持ち出さない。

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
  audio/trainSound.ts   列車の走行音（public/sounds/train.*）。クロスフェードなしのループ、速さに合わせて playbackRate（普通 1.0 / 特急 1.4）
  lib/                  純粋関数：time / altitude（標高・ステージ）/ stats / scene（空の配色・旅の時間）/ id
  lib/fonts.ts          フォント設定（FONTS。選んだ書体を Google Fonts から読み込み、CSS 変数で全体に反映）
  hooks/                useNow, useWakeLock など
  lib/theme.ts          外観（ライト / ダーク / 端末）を <html data-theme> に。画面の外の帯の色（theme-color・--edge）
  lib/sceneHold.ts      全画面の画面（設定など）がシーンを覆っている間、シーンの描画を止める
  lib/googleCalendar.ts Google カレンダー（読み取りのみ・OAuth のブラウザ向けの流れ）
  designs/              ポモドーロタイマーのデザイン＝旅のモード（下記「タイマーのデザイン」）
    types.ts            TimerDesign の契約（Scene / Session / Result / SetupOptions / ProfileCard …）
    index.ts            登録（TIMER_DESIGNS）と、モードの並び（TRAVEL_MODES：登山 / 列車 / 航空）
    flight/             航空（準備中）：搭乗券のカードだけ（BoardingPass）
    train/              列車デザイン（下記「列車シーンの構成」。クラス名は tr-）
      TrainScene / TrainSession / TrainResult / ClassPicker（普通・特急）/ Ticket（指定席券のカード）
      stations.ts       止まる場所（出発駅・途中の駅・信号場・終着駅）と駅名
      scene/            TrainStage（rAF・速さ・停車）/ outside（L1〜L4 の絵）/ Interior（L5 車内）/ layout
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
    nav/                TabBar（画面の最下部に固定。帆布の質感）+ IslandPlayer（ダイナミックアイランド風）
    home/               SetupSheet（科目・時間 + デザイン固有の設定）
    profile/            ModeSheet（旅のモードの切り替え）/ ProfileSheet（旅のパス：カード・ニックネーム・目標）
    timeline/           MonthCalendar（月のカレンダー）など
    focus/              BreathOverlay（深呼吸。Apple Watch の「呼吸」風）
    audio/              CassettePlayer（サウンドのシート：BGM / ミキサー）+ SoundMixer（音ごとの音量）
    tools/              ToolsPanel（ノート / ToDo / 習慣、縦のサイドタブ）
    …                   画面ごとの部品（timeline/ routes/ insights/ trail/）
  screens/              HomeScreen / TimelineScreen / RoutesScreen / InsightsScreen / SettingsScreen
public/
  manifest.webmanifest, sw.js, icons/（icon.svg が元絵）, splash/（iOS 起動画像）
  bgm/      BGM のフォルダ（tracks.json は任意。README.md に書き方）
  ambient/  環境音のフォルダ（sounds.json は任意。README.md に書き方）
  sounds/   モードの音：train.*＝列車の走行音、それ以外（river / rain / festival …）は環境音のミキサーに並ぶ
vite.config.ts             audioManifests：ビルド時に bgm/・ambient/・sounds/ の音声ファイルを一覧（json）へ自動で足す
scripts/generate-assets.mjs  icon.svg → アイコン PNG と iOS 起動画像（playwright-core を --no-save で入れて実行）
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
- 標高換算：**1 分 = 10 m**。科目ルートは `targetMinutes` で登頂、進捗で 5 ステージ。

## タイマーのデザイン

タイマーの状態・記録・音・設定はアプリ共通（`store/` `audio/`）。デザインは**見た目と演出だけ**を持つ。

```ts
interface TimerDesign {
  Scene           // いつも背景にあるシーン（ホームでも集中中でも）
  Session         // 集中・休憩中の全画面 UI（HUD）
  Result          // 旅の終わりの画面
  SetupOptions?   // 支度シートに差し込む固有の設定（登山：シーズン、列車：普通・特急と走行音）
  ProfileCard     // 旅のパスのカード（登山者 ID カード / 指定席券）
  ProfileOptions? // 旅のパスに差し込むカスタマイズ（登山：ハイカーの服・テント）
  edgeColors?     // ホームで画面の外の帯（ステータスバー・ホームバー）を塗る色
}
```

- 新しいデザインは `src/designs/<id>/` に作り、`designs/index.ts` の `TIMER_DESIGNS` と `TRAVEL_MODES` に登録し、`types` の `TimerDesignId`（`TravelMode`）に id を足す。
  航空はいま `ComingSoonMode`（カードだけ）。実装するときは TimerDesign にして登録し直す。
- デザイン同士でコード・CSS を共有しない（登山のリグやクレヨンを鉄道で使い回さない）。
- デザイン専用の CSS はそのフォルダの CSS ファイルに置き、`index.ts` から読み込む。クラス名には接頭辞（登山は `mt-`）。

## ホームの流れ（どのデザインでも共通）

`HomeScreen` が 1 つの画面の中で状態を切り替える（ホームタブのみ。没入中はタブバーを隠す）。
1. **ホーム**：上に「サウンド」「旅のモード（登山 ▾）」「旅のパス」「設定」、「やあ！{名前}、前へ進む準備はいい？」、大きな「集中」、右端にツールの縦タブ
2. **支度シート**（iOS）：科目名（新しい名前なら科目を自動作成）・時間（ポモドーロ/タイマー/フリー）・デザイン固有の設定
3. **深呼吸**（iOS）：花びらの輪が 4 秒でふくらみ 4 秒でしぼむ。タップでスキップ
4. **集中・休憩**：`design.Session`（音楽・時間・完了。タップで休憩、どこでも 1.1 秒の長押しで終了。登山の休憩はテントと焚き火、列車は駅に停車）
5. **リザルト**：`design.Result`（登山：夜のキャンプに日付・時間・科目を日記のように）

タイマーは「旅（journey）」単位：`startJourney` → 集中/休憩を繰り返す → `endJourney`（長押し）。

## 旅のモードと旅のパス
- モードはホームの上の「登山 ▾」か、設定 → 旅のモードで切り替える（`Settings.timerDesign`）。記録・科目はモード共通。
- **旅のパス**（ホームの ID カードのボタン）：モードごとのカード + 共通の **ニックネーム**（`userName`）と **目標**（`goal`）。
  - 登山：登山者 ID カード（累計の登山時間・現在の標高＝累計分 × 10 m）。ハイカーの服（`hikerLook`）とテント（`tentStyle`）を選べる
  - 列車：国鉄のマルス指定席券ふう（地紋・改札鋏の切り欠き・日付印）。〇〇様・**出発駅**（`departure`）→ **行き先**（＝目標）
  - 航空：搭乗券（PASSENGER NAME・DESTINATION＝目標・バーコード・GATE）。Coming Soon

## 列車シーンの構成（src/designs/train/scene）
- 窓の外は 5 層の視差（下から）。動かすのは各層の transform だけ。時間帯の色は層を描き直さず、半透明を重ねる。
  1. **L1 空と雲**：`skyAt(hour)` のグラデーション + ゆっくり流れる雲
  2. **L2 遠くの山**：とがった連峰（高い峰に雪）と手前の丘
  3. **L3 田園**：田んぼ・麦畑・あぜ道・集落・ビニールハウス・小川・鎮守の森と鳥居（夜は家の窓に明かり）
  4. **L4 線路ぎわ**：電柱と架線・土手の草・バラスト（いちばん速い）、ときどき踏切。停車時は駅のホーム（駅名標）か信号場
  5. **L5 車内**（固定）：木の窓枠・ロールカーテン・窓辺のテーブル（コーヒーと参考書）・網棚・青いモケットの座席・暖房。走行中は小さく上下に揺れ、レールの継ぎ目でガタンゴトン
- 速さ v（普通の巡航 = 1、特急 = 1.65）：発車でゆっくり加速し、止まるときは**止まれる距離の先に駅（信号場）を置いて**、窓の真ん中にぴたりと止める。
- 休憩＝途中の駅（休憩のたびに 1 駅進む：ひだまり → こもれび → …）、一時停止＝信号場、旅の終わり＝目標の駅（終着）、ホーム＝出発駅。
- 走行音は TrainStage が速さを `trainSound.setMotion()` に伝える。

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
6. **Light**：ゴッドレイ、焚き火（夜でも暗くならないようティントより上）、Canvas 粒子、紙の粒状感
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
- ホームの上のボタン・チップ・ツールの縦タブは `.fabric-denim.stitch`（インディゴのデニム + ステッチ）、タブバーは `.fabric-canvas`（帆布 + 破線の縁）
- `.hit`：見た目は小さいまま、押せる範囲を四方 6px 広げる
- 角丸：チップ `rounded-chip` 9px、カード `rounded-card` 13px、シート `rounded-t-sheet` 20px

### タイポグラフィ
- フォント設定の書体（既定 BIZ UDPゴシック。上記「フォント」）
- 大見出し 28–34px bold tracking-tight / セクション 13px bold fg-2 / 本文 15px / 補足 12–13px。数字は `tabular-nums`。

### 余白・レイアウト（iPhone のホーム画面アプリ）
- 画面左右 16–20px、カード内 16–20px、要素間 8/12/16/24。
- `viewport-fit=cover` は**使わない**（泰山木POS の実機での結論）。ステータスバーの帯は theme-color、ホームバーの帯は html の背景（`--edge`）で塗る。
  ホームではシーンの空・地面の色に合わせる（`design.edgeColors`）。
- アプリの枠は `.app-frame`（`fixed` + `100dvh`）。全画面の重ね（シート・モーダル・設定）は `fixed inset-x-0 top-0 h-app`（`fixed inset-0` は使わない）。
- タブバーは画面の最下部に固定（`fixed bottom-0`、セーフエリア分の下余白）。集中・休憩・リザルトの間は下へ隠す（シーンが最下部まで見える）。
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
- 列車の走行音（`public/sounds/train.*`）はクロスフェードせずサンプル単位でつなぎ、速さを playbackRate で表す（発車で上がっていき、巡航は普通 1.0・特急 1.4）。
- 音量は設定に保存（`bgmVolume` / `ambient`（内蔵）/ `ambientFiles`（追加した音、ID ごと））。起動時は再生を止めた状態から（iOS はタップが必要）。

## 規約
- 文言は日本語。コンポーネントは関数 + 名前付き export。
- 新規の永続データは types → repository → localRepository → AppStore の順に追加。
- 初めて開いたときは記録も科目も空（サンプルデータはない）。試作版のサンプル記録は `fresh-start` のしるしで一度だけ消している。
- ビルド前に `npm run build` を通すこと。
