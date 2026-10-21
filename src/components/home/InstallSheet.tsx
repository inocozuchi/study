import type { ReactNode } from 'react';
import { Check, MoreVertical, PlusSquare, Share } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';

/** ホーム画面から開いている（アプリとして起動している）か */
export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone / iPad（iPadOS はデスクトップ表示の UA なのでタッチ点数でも判定） */
function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fill text-ui-[12px] font-bold">{n}</span>
      <span className="min-w-0 flex-1 pt-0.5 text-ui-[13px] leading-relaxed text-fg">{children}</span>
    </li>
  );
}

/** ホーム画面に追加する方法（iPhone / Android） */
export function InstallSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const standalone = isStandalone();
  const ios = isIOS();

  return (
    <Sheet open={open} onClose={onClose} title="ホーム画面に追加" subtitle="アプリのように全画面で開けます">
      <div className="space-y-5 pb-5">
        {standalone && (
          <div className="flex items-center gap-2 rounded-2xl bg-moss/15 px-4 py-3 text-ui-[13px] font-medium text-moss">
            <Check size={16} strokeWidth={3} /> すでにホーム画面のアプリとして開いています
          </div>
        )}

        <section className={ios || !standalone ? '' : 'opacity-60'}>
          <p className="section-label mb-2">iPhone（Safari）</p>
          <ol className="group-box space-y-3.5 rounded-2xl p-4">
            <Step n={1}>Safari でこのページを開きます。</Step>
            <Step n={2}>
              画面下の <Share size={15} className="mx-0.5 inline -translate-y-px" /> <b className="font-semibold text-fg">共有</b> ボタンをタップします。
            </Step>
            <Step n={3}>
              メニューを上へスクロールして <PlusSquare size={15} className="mx-0.5 inline -translate-y-px" /> <b className="font-semibold text-fg">ホーム画面に追加</b> を選びます。
            </Step>
            <Step n={4}>
              <b className="font-semibold text-fg">Web アプリとして開く</b> がオンになっているのを確かめて、右上の <b className="font-semibold text-fg">追加</b> をタップします。
            </Step>
          </ol>
          <p className="mt-2 px-1 text-ui-[12px] leading-relaxed text-fg-2">ホーム画面に「Focus Trail」のアイコンができます。次からはそこから開いてください。</p>
        </section>

        <section className={!ios || !standalone ? '' : 'opacity-60'}>
          <p className="section-label mb-2">Android（Chrome）</p>
          <ol className="group-box space-y-3.5 rounded-2xl p-4">
            <Step n={1}>Chrome でこのページを開きます。</Step>
            <Step n={2}>
              右上の <MoreVertical size={15} className="mx-0.5 inline -translate-y-px" /> メニューから <b className="font-semibold text-fg">ホーム画面に追加</b>（または <b className="font-semibold text-fg">アプリをインストール</b>）を選びます。
            </Step>
          </ol>
        </section>

        <section className="rounded-card bg-accent-soft p-4 text-ui-[12.5px] leading-relaxed text-fg-2">
          <p className="font-bold text-accent-ink">記録はホーム画面のアプリごとに保存されます</p>
          <p className="mt-1">
            Safari で使った記録と、ホーム画面から開いたアプリの記録は<b className="font-semibold text-fg">別々に保存</b>されます（iPhone の仕様）。追加したら、これからはホーム画面のアイコンから使ってください。
          </p>
        </section>
      </div>
    </Sheet>
  );
}
