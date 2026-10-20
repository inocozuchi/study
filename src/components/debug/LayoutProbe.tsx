import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Copy, X } from 'lucide-react';

/**
 * 表示の診断（設定 → 表示の診断）。iPhone の Safari とホーム画面アプリで、画面の高さ・安全域・
 * 枠やタブバーの位置がどう渡されているかをそのまま見せる。記録には触れない（表示だけ）。
 * オンにしている間は <html class="layout-probe"> になり、[data-probe] の付いた要素に点線が出る。
 */
const KEY = 'focus-trail:layout-probe';
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setLayoutProbe(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* 保存できなくてもこの起動の間は切り替わる */
  }
  current = on;
  listeners.forEach((l) => l());
}

let current = typeof window !== 'undefined' && (read() || new URLSearchParams(location.search).has('layout-probe'));

export function useLayoutProbe() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

type Rect = { top: number; bottom: number; height: number } | null;

function rectOf(sel: string): Rect {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
}

function measure(probe: HTMLElement) {
  const cs = getComputedStyle(probe);
  const px = (v: string) => Math.round(parseFloat(v) || 0);
  const units = probe.children;
  const vv = window.visualViewport;
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    standalone: matchMedia('(display-mode: standalone)').matches,
    navStandalone: nav.standalone ?? null,
    innerHeight: window.innerHeight,
    outerHeight: window.outerHeight,
    screenHeight: screen.height,
    clientHeight: document.documentElement.clientHeight,
    htmlHeight: Math.round(document.documentElement.getBoundingClientRect().height),
    vvHeight: vv ? Math.round(vv.height) : null,
    vvOffsetTop: vv ? Math.round(vv.offsetTop) : null,
    safeTop: px(cs.paddingTop),
    safeBottom: px(cs.paddingBottom),
    dvh: Math.round((units[0] as HTMLElement).getBoundingClientRect().height),
    lvh: Math.round((units[1] as HTMLElement).getBoundingClientRect().height),
    svh: Math.round((units[2] as HTMLElement).getBoundingClientRect().height),
    root: rectOf('[data-probe="root"]'),
    scene: rectOf('[data-probe="scene"]'),
    status: rectOf('[data-probe="status"]'),
    nav: rectOf('[data-probe="nav"]'),
  };
}

type Values = ReturnType<typeof measure>;

const fmtRect = (r: Rect) => (r ? `${r.top}→${r.bottom}（${r.height}）` : '—');

function lines(v: Values) {
  return [
    ['display-mode: standalone', String(v.standalone)],
    ['navigator.standalone', String(v.navStandalone)],
    ['innerHeight / outerHeight', `${v.innerHeight} / ${v.outerHeight}`],
    ['screen.height', String(v.screenHeight)],
    ['html clientHeight / 高さ', `${v.clientHeight} / ${v.htmlHeight}`],
    ['visualViewport 高さ / offsetTop', `${v.vvHeight ?? '—'} / ${v.vvOffsetTop ?? '—'}`],
    ['safe-area top / bottom', `${v.safeTop} / ${v.safeBottom}`],
    ['100dvh / 100lvh / 100svh', `${v.dvh} / ${v.lvh} / ${v.svh}`],
    ['枠（root）', fmtRect(v.root)],
    ['シーン', fmtRect(v.scene)],
    ['時刻の帯', fmtRect(v.status)],
    ['タブバー', fmtRect(v.nav)],
  ] as const;
}

export function LayoutProbe() {
  const on = useLayoutProbe();
  const probe = useRef<HTMLDivElement>(null);
  const [v, setV] = useState<Values | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('layout-probe', on);
    if (!on) return;
    const update = () => probe.current && setV(measure(probe.current));
    update();
    const id = setInterval(update, 1000);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      clearInterval(id);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      document.documentElement.classList.remove('layout-probe');
    };
  }, [on]);

  if (!on) return null;
  const rows = v ? lines(v) : [];
  const text = rows.map(([k, val]) => `${k}: ${val}`).join('\n');

  return createPortal(
    <>
      {/* 安全域と 100dvh / lvh / svh を測るための見えない要素 */}
      <div
        ref={probe}
        aria-hidden
        className="pointer-events-none invisible fixed left-0 top-0 w-px"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="absolute left-0 top-0 w-px" style={{ height: '100dvh' }} />
        <div className="absolute left-0 top-0 w-px" style={{ height: '100lvh' }} />
        <div className="absolute left-0 top-0 w-px" style={{ height: '100svh' }} />
      </div>
      <div
        className="fixed left-1/2 z-[200] w-[min(92vw,360px)] -translate-x-1/2 rounded-card bg-black/90 p-3 font-mono text-[11px] leading-[1.45] text-white"
        style={{ top: 'calc(env(safe-area-inset-top) + 56px)' }}
      >
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12px] font-bold">表示の診断</span>
          <span className="flex gap-1">
            <button
              aria-label="値をコピー"
              className="grid h-7 w-7 place-items-center rounded-full bg-white/15"
              onClick={() => {
                void navigator.clipboard?.writeText(text).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                });
              }}
            >
              <Copy size={14} />
            </button>
            <button aria-label="診断を閉じる" className="grid h-7 w-7 place-items-center rounded-full bg-white/15" onClick={() => setLayoutProbe(false)}>
              <X size={14} />
            </button>
          </span>
        </div>
        {rows.map(([k, val]) => (
          <div key={k} className="flex justify-between gap-2">
            <span className="text-white/65">{k}</span>
            <span className="tabular-nums">{val}</span>
          </div>
        ))}
        {copied && <p className="mt-1 text-[#7CE38B]">コピーしました</p>}
      </div>
    </>,
    document.body,
  );
}
