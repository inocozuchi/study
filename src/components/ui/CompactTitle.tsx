import { useEffect, useRef, useState } from 'react';

/**
 * iOS の大見出し → 小さな見出し。下へスクロールして大見出しが上に隠れると、画面の上に細い帯と小さな題名がふわっと出る。
 * 画面（タブの中身）のいちばん初めに置く。場所は取らない（上下の負の余白で、後ろの中身の位置は変えない）。
 * 帯は塗りの面（ぼかしは使わない）。出入りは 200ms の opacity と 4px だけ。
 */
export function CompactTitle({ title }: { title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const scroller = ref.current?.closest<HTMLElement>('[data-main-scroll]');
    if (!scroller) return;
    // 大見出し（約 44px）が隠れたら出す。値が変わったときだけ描き直す
    const check = () => setOn(scroller.scrollTop > 52);
    check();
    scroller.addEventListener('scroll', check, { passive: true });
    return () => scroller.removeEventListener('scroll', check);
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none sticky top-0 z-30 -mx-5"
      style={{ height: 'calc(var(--safe-top) + 44px)', marginTop: 'calc(-1 * var(--safe-top))', marginBottom: '-44px' }}
    >
      <div className={`absolute inset-0 border-b bg-page transition-[opacity,border-color] duration-200 ${on ? 'border-line opacity-100' : 'border-transparent opacity-0'}`} />
      <p
        className={`absolute inset-x-0 bottom-0 flex h-[44px] items-center justify-center text-ui-[15px] font-bold transition-[opacity,transform] duration-200 ${
          on ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
        }`}
      >
        {title}
      </p>
    </div>
  );
}
