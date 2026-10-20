import { useLayoutEffect, useRef, type CSSProperties, type ReactElement } from 'react';
import { CRAYON_FILTERS } from '../CrayonDefs';

/**
 * クレヨンのフィルタがかかった静的な SVG を、一度だけ画像（PNG）に焼き込んで表示する。
 *
 * iOS Safari は SVG フィルタ（feTurbulence / feDisplacementMap）を CPU で計算し、
 * 同じ描画レイヤーの中で何かが変わるたびに計算し直す。画面いっぱいの絵にかけたまま動かすと
 * 1 フレームに数十〜数百 ms かかり、アプリ全体が固まる原因になっていた。
 * 焼き込んだ画像は動かしても（transform / opacity）再計算が起きない。
 * 焼いた PNG は Cache Storage に残し、次に開いたときはフィルタを一切計算せずに表示する。
 *
 * children には 1 枚の <svg>（viewBox 付き）を渡す。中身は表示されず、文字列にして画像化される。
 */

/** 焼き込みの解像度。端末の倍率が高くても 2 倍まで（クレヨンの粒は柔らかいので見た目は変わらない） */
const scale = () => Math.min(window.devicePixelRatio || 1, 2);

const CACHE = 'focus-trail-bake-v1';
const CACHE_LIMIT = 80;

// 同時にたくさん焼くと 1 フレームが長くなるので、1 フレームに 1 枚ずつ順番に焼く
const queue: (() => void)[] = [];
let pumping = false;
function enqueue(job: () => void) {
  queue.push(job);
  if (pumping) return;
  pumping = true;
  const pump = () => {
    const next = queue.shift();
    if (!next) {
      pumping = false;
      return;
    }
    next();
    requestAnimationFrame(() => setTimeout(pump, 0));
  };
  requestAnimationFrame(() => setTimeout(pump, 0));
}

/** 文字列の短いハッシュ（FNV-1a）。焼いた画像のキャッシュのキーに使う */
function hash(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + str.length.toString(36);
}

async function cached(key: string): Promise<Blob | null> {
  try {
    if (!('caches' in window)) return null;
    const res = await (await caches.open(CACHE)).match(key);
    return res ? await res.blob() : null;
  } catch {
    return null;
  }
}

async function store(key: string, blob: Blob) {
  try {
    if (!('caches' in window)) return;
    const cache = await caches.open(CACHE);
    await cache.put(key, new Response(blob, { headers: { 'content-type': 'image/png' } }));
    const keys = await cache.keys();
    // 季節や画面の大きさを変えるたびに増えるので、古いものから消す
    for (const k of keys.slice(0, Math.max(0, keys.length - CACHE_LIMIT))) await cache.delete(k);
  } catch {
    /* 保存できなくても表示には影響しない */
  }
}

function loadSvg(markup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      resolve(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

export function Baked({
  width,
  height,
  repeat = 1,
  bakeKey,
  className = '',
  style,
  children,
}: {
  /** 1 枚ぶんの CSS ピクセルの大きさ */
  width: number;
  height: number;
  /** 横に何枚並べるか（流れるタイル用） */
  repeat?: number;
  /** 絵が変わったときに変える値（色・季節など）。大きさの変化は自動で焼き直す */
  bakeKey?: string | number;
  className?: string;
  style?: CSSProperties;
  children: ReactElement;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const svg = holder.current?.querySelector('svg');
    const canvas = canvasRef.current;
    const out = imgRef.current;
    if (!svg || !canvas || !out || width < 1 || height < 1) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    clone.removeAttribute('class');
    clone.removeAttribute('style');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = CRAYON_FILTERS;
    clone.insertBefore(defs, clone.firstChild);
    const markup = new XMLSerializer().serializeToString(clone);
    const s = scale();
    const key = `/bake/${hash(markup)}-${repeat}@${s}.png`;
    let cancelled = false;

    const show = (el: HTMLElement) => {
      el.style.display = 'block';
      requestAnimationFrame(() => (el.style.opacity = '1'));
    };
    const showBlob = (blob: Blob) => {
      const prev = out.src;
      out.onload = () => {
        if (cancelled) return;
        show(out);
        canvas.width = canvas.height = 0;
        canvas.style.display = 'none';
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      };
      out.src = URL.createObjectURL(blob);
    };

    const bake = () =>
      loadSvg(markup).then((img) => {
        if (cancelled) return;
        enqueue(() => {
          if (cancelled) return;
          canvas.width = Math.round(width * repeat * s);
          canvas.height = Math.round(height * s);
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.setTransform(s, 0, 0, s, 0, 0);
          for (let i = 0; i < repeat; i++) ctx.drawImage(img, i * width, 0, width, height);
          try {
            canvas.toBlob((blob) => {
              if (cancelled) return;
              if (!blob) return show(canvas);
              showBlob(blob);
              store(key, blob);
            }, 'image/png');
          } catch {
            // 古い Safari は SVG を描いたキャンバスを書き出せない。そのときはキャンバスのまま表示
            show(canvas);
          }
        });
      });

    cached(key)
      .then((blob) => {
        if (cancelled) return;
        if (blob) showBlob(blob);
        else return bake();
      })
      .catch(() => {
        /* 焼けなかったときは何も出さない（シーンの他の層はそのまま） */
      });
    return () => {
      cancelled = true;
    };
  }, [bakeKey, width, height, repeat]);

  const size: CSSProperties = { width: width * repeat, height, maxWidth: 'none', opacity: 0, transition: 'opacity 0.5s', ...style };
  return (
    <>
      <div ref={holder} style={{ display: 'none' }} aria-hidden>
        {children}
      </div>
      <canvas ref={canvasRef} aria-hidden className={className} style={{ ...size, display: 'none' }} />
      <img ref={imgRef} alt="" aria-hidden draggable={false} decoding="async" className={className} style={{ ...size, display: 'none' }} />
    </>
  );
}
