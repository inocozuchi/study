# Focus Trail — 集中旅行者 × Structured × Chill With You

学習・集中記録 PWA。集中＝山を登る旅、休憩＝焚き火を囲む時間。
すべてブラウザ内で完結（外部 API・音源ファイルなし）。
見た目は「クレヨンで描いた絵本 × キャンバス地/デニムの布 × iOS の動き」。

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
    sampleData.ts       初回起動用のサンプルデータ（現在日時から相対生成・シード付き乱数）
    index.ts            使用する repository の選択点
  store/
    AppStore.tsx        データ（科目/セッション/予定/設定）の Context + アクション
    TimerStore.tsx      タイマー状態機械（Worker tick + タイムスタンプ差分）+ ディープ集中 + Wake Lock
  timer/timer.worker.ts 250ms ごとの tick を投げるだけの Worker（時間計算は常に Date.now() 差分）
  audio/ambient.ts      プロシージャル環境音シンセ（雨・焚き火・森の風・川・虫）+ チャイム
  audio/bgm.ts          BGM エンジン（ファイル曲 → LoopPlayer / 合成曲 → プロシージャル Lo-Fi）
  audio/loopPlayer.ts   音声ファイルのシームレス無限ループ（AudioBuffer + loopStart/loopEnd、無音の自動トリム）
  audio/bgmLibrary.ts   曲リスト：public/bgm/tracks.json（実行時に読む）+ 合成曲 4 曲（synthTracks.ts）
  lib/                  純粋関数：time / altitude（標高・ステージ）/ stats / scene（空の配色）/ id
  hooks/                useNow, useWakeLock, useMultiRoom（BroadcastChannel の部屋）など
  components/
    scene/stage/          メイン画面の 6 層シーン（下記「シーン構成」）
      TrailStage.tsx      レイヤーの組み立て + 唯一の rAF ループ（関節・トラック・粒子を更新）
      rigMath.ts          歩行サイクル・2 ボーン IK・座りポーズ・犬の速歩/伏せ・ポーズ補間
      HikerRig.tsx        関節分割されたハイカー SVG（約 6 頭身）と applyHikerPose
      DogRig.tsx          ザックを背負ったコーギー SVG と applyDogPose
      layout.ts / palette.ts  画面サイズ→配置、時間帯の空・ステージ別の草原色
      layers/             Sky / Mountain / Tree / Meadow / Foreground / Light
    ui/                   GlassCard, Sheet(tone), Modal(tone), Segmented, PaperControls, PickerModal,
                          Toggle(tone), CrayonDefs（全体の SVG フィルタ + CrayonOutline）…
    nav/                  TabBar（フローティング）+ IslandPlayer（ダイナミックアイランド風）
    home/                 SetupSheet（科目・時間・シーズン）, SeasonSwatch
    focus/                BreathOverlay（深呼吸）, FocusHUD（長押しで終了）, ResultView（キャンプの夜）
    audio/                CassettePlayer（カセットデッキ + 環境音のボトムコントロール）
    tools/                ToolsPanel（ノート / ToDo / 習慣、縦のサイドタブ）
    …                     画面ごとの部品（timeline/ routes/ insights/ trail/）
  screens/              HomeScreen / TimelineScreen / RoutesScreen / InsightsScreen / SettingsScreen
public/
  manifest.webmanifest, sw.js, icons/
```

## アーキテクチャ原則

- **データ層は Repository 経由のみ**。コンポーネントは `useApp()` のアクションを呼ぶ。
  ストアは楽観的にメモリ状態を更新してから repository に書き込む。
- **タイマーは「開始時刻 + 累積ms」モデル**。`elapsed = accumulatedMs + (now - startedAt)`。
  Worker は tick の合図だけ。タブ非表示・スリープ復帰でもズレない。実行中状態は永続化され、
  リロードしても継続する。カウントダウン終了時のセッション終了時刻は「予定終了時刻」で記録する。
- **ディープ集中**：非表示になった時刻を記録し、5 秒以上離れて戻ったら離脱時刻で遡って一時停止 →
  警告モーダル（集中に戻る / 休憩へ）。
- 時刻は epoch ms（number）、日付キーは `YYYY-MM-DD`（ローカル）、予定は「0時からの分」。
- 標高換算：**1 分 = 10 m**。科目ルートは `targetMinutes` で登頂、進捗で 5 ステージ。

## ホームの流れ

`HomeScreen` が 1 つの画面の中で状態を切り替える（ホームタブのみ。没入中はタブバーを隠す）。
1. **ホーム**：「やあ！{名前}、前へ進む準備はいい？」、ソロ/マルチ、大きな「集中」、右端にツールの縦タブ
2. **支度シート**：科目名（新しい名前ならルートを自動作成）・時間（ポモドーロ/タイマー/フリー）・シーズン
3. **深呼吸**：同心円が 4 秒で広がり 4 秒で縮む。タップでスキップ
4. **集中 HUD**：上に音楽・時間（タップで一時停止）・完了。どこでも 1.1 秒の長押しで旅を終える
5. **休憩**：テントと焚き火、座って手を温める。休憩明けは設定に応じて自動で次の登りへ
6. **リザルト**：夜のキャンプ（ハイカーはテントの中、焚き火は燻る）に日付・時間・科目を日記のように

タイマーは「旅（journey）」単位：`startJourney` → 集中/休憩を繰り返す → `endJourney`（長押し）。

## シーン構成（メイン画面の背景）

すべて `position:absolute` の 6 層。下から：
1. **Sky**：セルリアンのグラデーション、太陽/月、入道雲（CSS で横に流れる）、羽ばたく鳥、夜は星
2. **Mountain**：空気遠近法の 2 段の山脈。周期タイルを `translate3d` で極めてゆっくり流す
3. **Tree**：左右からフレームインする針葉樹と白樺（CSS で根元を支点に揺れる）
4. **Meadow**：右上がりの草原斜面。草の質感は斜面に沿って回転したストリップを流す。ハイカー・犬・テント
5. **Foreground**：`blur(3px)` の草花（被写界深度）。草原より速く流れ、風で大きく揺れる
6. **Light**：ゴッドレイ、焚き火（夜でも暗くならないようティントより上）、Canvas 粒子、紙の粒状感
   - 5 と 6 の間に時間帯ティント（夜：群青 multiply、朝夕：暖色 soft-light）

**骨格アニメーションの原則**
- リグは階層 `<g>`。関節の原点が回転の支点。React は描画のみ、毎フレームは `setAttribute('transform')` だけ。
- 脚は 2 ボーン IK で足首を斜面上の目標へ。接地中は足が後ろへ等速移動し、その速度＝地面の流れる速度（足が滑らない）。
- 状態（歩く/立つ/座る/警告）は重み（w, camp, alert）を lerp し、関節角をポーズ間で補間して切り替える。
- アニメーションする要素を SVG フィルタの内側に置かない（毎フレーム再計算になる）。
  木のように「揺れるけれど絵は静的」なものは、div ごとに SVG を分けて div を CSS で回す（合成レイヤー）。
- **layoutId を使わない**：退場中の AnimatePresence の中にあると退場が止まり、モーダルが閉じなくなる。
  選択ピルは「index × 100%」の x で動かす（Segmented / PaperSegmented / TabBar を参照）。
- 季節（春・夏・秋・冬・桜）は `palette.ts` の `SEASONS`。草原・葉・舞うもの・前景の花がまとめて変わる。

## デザインシステム

世界観：背景はクレヨンで描いた山岳シーン。UI は「布」——濃色はデニム、明色は生成りのキャンバス地。

### クレヨンと布（index.css / CrayonDefs.tsx）
- `#crayon`（静的な絵）、`#crayon-soft`（UI の線）、`#crayon-boil`（キャラクター、乱数の種を 8fps で入れ替え線を震わせる）。
  いずれも「輪郭の揺れ（displacement）」+「紙目でワックスが乗らない粒（noise → alpha）」。
- キャラクター・小道具は焦げ茶 `#2E221C` の輪郭線 + 斜線の陰影で描く。
- `.tex-denim`（綾織り + ノイズ）：画面背景・タブバー・濃色ボタン。`.tex-canvas`（平織り + 斑点）：シート・設定。
  `.glass*` にも薄い織り目とノイズが重なる。`.paper-card` / `.field-paper` / `.ink-btn` が紙の上の部品。
- `CrayonOutline`：手描きの縁取り（円・角丸）。重要なボタンや選択中のチップに重ねる。
- 書体：見出しと日本語の UI は Zen Maru Gothic（`font-maru`）、時間の数字は Fredoka（`font-digits`）。

### カラー（tailwind.config.js に定義）
| トークン | 値 | 用途 |
|---|---|---|
| `night-950` | `#070B17` | 最背面 / 夜 |
| `night-900` | `#0C1224` | シート背景 |
| `ember` | `#FF8A4C` | 焚き火・休憩・主要 CTA |
| `summit` | `#8EC5FF` | 集中・登山 |
| `moss` | `#7FD1A8` | 達成・完了 |
| `dusk` | `#C3A6FF` | 夜・補助 |
| `sun` | `#FFD27A` | ハイライト・標高 |
| `paper` / `paper-2` | `#F5EEDC` / `#EDE3CC` | キャンバス地のシート |
| `ink` / `ink-soft` / `ink-faint` | `#3A2E28` / `#6E5D52` / `#A39283` | 紙の上の文字 |
| `denim` / `denim-deep` | `#24395A` / `#17253D` | デニムの面 |
| `crayon-*` | blue / green / red / yellow / pink / brown | クレヨンの差し色（ボタン・チェック） |
| テキスト | `white` / `white/70` / `white/50` / `white/35` | 主 / 副 / 補足 / 無効 |

科目カラーは `lib/subjects.ts` の `SUBJECT_COLORS`（8 色・暗い面で CVD 検証済み、順序固定）から選ぶ。図表の系列色もこれを使う（色は科目に従い、順位に従わない）。

### ガラス
- `.glass`：`bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12]` + 内側ハイライト
- `.glass-strong`：シート・モーダル用（`bg-night-900/70`）
- 角丸：カード `rounded-3xl`、ピル/ボタン `rounded-2xl`〜`rounded-full`
- 1px 半透明ボーダー必須。影は `shadow-glass`（柔らかく大きく）

### タイポグラフィ
- システムフォント（SF Pro / Hiragino Sans / Noto Sans JP）
- 大見出し 28–34px bold tracking-tight / セクション 13px semibold uppercase white/50 /
  本文 15px / 補足 12–13px。数字は `tabular-nums`。タイマーは 72–88px thin。

### 余白
- 画面左右 20px（`px-5`）、カード内 16–20px、要素間 8/12/16/24 の 4 の倍数。
- 下部はタブバー分 `pb-36`、上部は `pt-safe`（safe-area-inset）。

### アニメーション原則（`lib/motion.ts`）
- 既定スプリング：`{ type: 'spring', stiffness: 380, damping: 32 }`（UI 全般）
- ソフト：`{ stiffness: 220, damping: 28 }`（画面遷移・大きな面）
- タップ：`whileTap={{ scale: 0.96 }}`（`Pressable` コンポーネント）
- シートは下からスプリング、ドラッグで閉じる。モーダルは scale 0.94→1 + fade。
- タブの選択インジケータは `layoutId` で滑らかに移動。
- `prefers-reduced-motion` を尊重（Canvas の粒子量・視差を削減）。

## BGM のループ原則
- 曲の継ぎ目にフェード・無音・クロスフェードを入れない。ループは `AudioBufferSourceNode.loop` に任せる（HTMLAudio の loop は使わない）。
- フェードはユーザーが再生/一時停止したときだけ。一時停止は位置を覚え、続きから再開する。
- 追加の曲は `public/bgm/` + `tracks.json`（コード変更不要）。SW は tracks.json だけネットワーク優先。

## 規約
- 文言は日本語。コンポーネントは関数 + 名前付き export。
- 新規の永続データは types → repository → localRepository → AppStore の順に追加。
- ビルド前に `npm run build` を通すこと。
