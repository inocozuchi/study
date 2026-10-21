/**
 * 画面ごとの「枠」の決まり（どこまで背景を広げるか・時刻の帯の下に何を敷くか・タブバーを出すか）。
 * App.tsx はこの表を読むだけ。新しい画面や状態を足すときは、ここに 1 行足す。
 *
 *  - fullscreen：選択中の旅のモードのシーンを画面の上端から下端まで敷く（時刻の帯・ホームバーの下まで）。
 *                false なら画面の地の色（page）の上にカードを並べる。
 *  - statusArea：時刻の帯（env(safe-area-inset-top) の高さ）の下に敷くもの。index.css の .status-band
 *                'scene'＝何も敷かない / 'solid'＝地の色で塗る / 'scrim'＝うすい暗がり。
 *                ぼかし（backdrop-filter）はどの画面でも使わない（iPhone で重く、上がぼやけて見えるため）。
 *  - bottomNav： 下に浮いたタブバーを出すか。
 *
 * 文字やボタンを時刻の帯・ホームバーから離すのは各画面の pt-safe / pb-nav / pb-safe（安全域は消さない）。
 * 時刻の文字の色（apple-mobile-web-app-status-bar-style）は起動時に一度だけ読まれ、画面ごとには変えられない（iOS の制約）。
 */
export type StatusArea = 'scene' | 'solid' | 'scrim';

export interface ScreenChrome {
  fullscreen: boolean;
  statusArea: StatusArea;
  bottomNav: boolean;
}

export function chromeFor({ home, immersive }: { home: boolean; immersive: boolean }): ScreenChrome {
  // ホーム：シーンを全画面に。集中・休憩・リザルトの間はタブバーも隠す
  if (home) return { fullscreen: true, statusArea: 'scene', bottomNav: !immersive };
  // タイムライン・ルート・インサイト・設定：地の色の画面。時刻の下は地の色で塗り、スクロールした中身を入り込ませない
  return { fullscreen: false, statusArea: 'solid', bottomNav: true };
}

