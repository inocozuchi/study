import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftRight, ChevronDown, Layers, Plus, Scan, Trash2, Undo2, X } from 'lucide-react';
import { useApp } from '@/store/AppStore';
import { usePresentDepth } from '@/lib/depth';
import { useHoldScene } from '@/lib/sceneHold';
import { useEdgeSwipeBack } from '@/hooks/useEdgeSwipeBack';
import { springSheet } from '@/lib/motion';
import { uid } from '@/lib/id';
import { Sheet } from '@/components/ui/Sheet';
import type { MemoBoard, MemoColor, MemoEdge, MemoNode } from '@/types';
import { bounds, edgePath, rubberPath, type Box, type Pt } from './geometry';

/**
 * 思考マップ（グラフのメモ）。頭の中で考えをまとめるときのように、メモ（ノード）を自由に置いて、メモの間に向きのある線（エッジ）を張る。
 *
 * 操作はすべて 1 回のタップかドラッグ（メニューを開いて選ぶのは「削除」だけ）：
 *  - 何もないところをタップ → そこに空のメモ（すぐ題名を打てる）。何かを選んでいるときのタップは選択を外す
 *  - メモをドラッグ → 動かす（指を離した勢いで少し滑る）
 *  - メモの右の丸（●）をドラッグ → 線を引く。ほかのメモの上で離すとつながる、何もないところで離すとそこに新しいメモ + 線
 *  - メモ・線をタップ → 下の編集の面に題名と説明（そのまま書ける。保存は自動）
 *  - 何もないところをドラッグ → 見る場所を動かす、2 本指・トラックパッドで拡大
 * 削除は編集の面のごみ箱（すぐ消え、「元に戻す」で戻せる）。
 */

const LAST_BOARD = 'focus-trail:memo-board';
const MIN_K = 0.3;
const MAX_K = 2.5;
const TAP = 6;

type Sel = { kind: 'node' | 'edge'; id: string } | null;
type View = { x: number; y: number; k: number };

/** メモの色（ライト・ダークの両方で読める淡い面） */
const COLORS: { id: MemoColor; label: string; swatch: string; card: string }[] = [
  { id: 'none', label: '白', swatch: 'rgb(var(--c-surface))', card: 'bg-surface' },
  { id: 'yellow', label: '黄', swatch: '#F5C542', card: 'bg-[#FFF6D6] dark:bg-[#3A3220]' },
  { id: 'green', label: '緑', swatch: '#4CB782', card: 'bg-[#E3F6EC] dark:bg-[#1F3329]' },
  { id: 'blue', label: '青', swatch: '#4C8DF6', card: 'bg-[#E3EEFF] dark:bg-[#1D2B44]' },
  { id: 'pink', label: '桃', swatch: '#EE6E9F', card: 'bg-[#FDE7F0] dark:bg-[#3A2230]' },
  { id: 'purple', label: '紫', swatch: '#9B7BEA', card: 'bg-[#EFE8FF] dark:bg-[#2C2442]' },
];
const cardOf = (c: MemoColor | undefined) => COLORS.find((x) => x.id === c)?.card ?? 'bg-surface';

/** 思考マップの全画面（ホームのツールの縦タブから開く） */
export function MemoMap({ open, onClose }: { open: boolean; onClose: () => void }) {
  usePresentDepth(open);
  // 出きったら後ろのシーンを止める（重さ）
  const [covered, setCovered] = useState(false);
  useEffect(() => {
    if (!open) return setCovered(false);
    const id = setTimeout(() => setCovered(true), 450);
    return () => clearTimeout(id);
  }, [open]);
  useHoldScene(covered);
  const swipe = useEdgeSwipeBack(onClose, open);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="ui-text fixed inset-x-0 top-0 z-50 h-app overflow-hidden bg-page text-fg"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={springSheet}
          style={{ willChange: 'transform', x: swipe.x }}
          {...swipe.bind}
          role="dialog"
          aria-label="思考マップ"
        >
          <MapBody onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function MapBody({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const { memoBoards, memoNodes, memoEdges, saveMemoBoard, saveMemoNode, saveMemoEdge, deleteMemoNode, deleteMemoEdge, deleteMemoBoard } = app;

  // ── ボード：前に開いていたもの。なければ 1 枚作る ──
  const [boardId, setBoardId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_BOARD);
    } catch {
      return null;
    }
  });
  const board = memoBoards.find((b) => b.id === boardId) ?? memoBoards[0];
  useEffect(() => {
    if (!memoBoards.length) {
      const now = Date.now();
      const b: MemoBoard = { id: uid('mb-'), title: '', createdAt: now, updatedAt: now };
      saveMemoBoard(b);
      setBoardId(b.id);
    }
  }, [memoBoards.length, saveMemoBoard]);
  useEffect(() => {
    if (!board) return;
    try {
      localStorage.setItem(LAST_BOARD, board.id);
    } catch {
      /* noop */
    }
  }, [board]);

  const nodes = useMemo(() => memoNodes.filter((n) => n.boardId === board?.id), [memoNodes, board?.id]);
  const edges = useMemo(() => memoEdges.filter((e) => e.boardId === board?.id), [memoEdges, board?.id]);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // ── 見る場所（描き直さずに transform だけ動かす） ──
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ x: 0, y: 0, k: 1 });
  const applyView = useCallback(() => {
    const v = view.current;
    if (worldRef.current) worldRef.current.style.transform = `translate3d(${v.x}px,${v.y}px,0) scale(${v.k})`;
    const vp = viewportRef.current;
    if (vp) {
      // 方眼の点（紙の上で考えている感じ。見る場所と一緒に動く）
      const g = 28 * v.k;
      vp.style.backgroundSize = `${g}px ${g}px`;
      vp.style.backgroundPosition = `${v.x}px ${v.y}px`;
    }
  }, []);
  const setView = useCallback(
    (v: View) => {
      view.current = { x: v.x, y: v.y, k: Math.min(MAX_K, Math.max(MIN_K, v.k)) };
      applyView();
    },
    [applyView],
  );
  // ボードを開いたら、前に見ていた眺め（なければ真ん中）
  useLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp || !board) return;
    setView(board.view ?? { x: vp.clientWidth / 2, y: vp.clientHeight * 0.4, k: 1 });
  }, [board?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // 眺めは閉じるとき・ボードを替えるときに残す
  const boardRef = useRef(board);
  boardRef.current = board;
  const saveView = useCallback(() => {
    const b = boardRef.current;
    if (b) saveMemoBoard({ ...b, view: { ...view.current } });
  }, [saveMemoBoard]);
  useEffect(() => () => saveView(), [board?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toWorld = useCallback((cx: number, cy: number): Pt => {
    const r = viewportRef.current!.getBoundingClientRect();
    const v = view.current;
    return { x: (cx - r.left - v.x) / v.k, y: (cy - r.top - v.y) / v.k };
  }, []);

  // ── メモの大きさ（線を縁で止めるため。ResizeObserver で測る） ──
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
  const ro = useMemo(
    () =>
      new ResizeObserver((entries) => {
        setSizes((prev) => {
          let next = prev;
          for (const e of entries) {
            const id = (e.target as HTMLElement).dataset.node!;
            const w = (e.target as HTMLElement).offsetWidth;
            const h = (e.target as HTMLElement).offsetHeight;
            if (prev[id]?.w !== w || prev[id]?.h !== h) next = { ...next, [id]: { w, h } };
          }
          return next;
        });
      }),
    [],
  );
  useEffect(() => () => ro.disconnect(), [ro]);

  // ── 選択・ドラッグ中の位置・線を引いている途中 ──
  const [sel, setSel] = useState<Sel>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [link, setLink] = useState<{ from: string; x: number; y: number; over: string | null } | null>(null);
  const [lifted, setLifted] = useState<string | null>(null);
  const posOf = useCallback((n: MemoNode) => (drag && drag.id === n.id ? { x: drag.x, y: drag.y } : { x: n.x, y: n.y }), [drag]);
  const boxOf = useCallback(
    (n: MemoNode): Box => {
      const p = posOf(n);
      const s = sizes[n.id] ?? { w: 96, h: 40 };
      return { x: p.x, y: p.y, w: s.w, h: s.h };
    },
    [posOf, sizes],
  );

  // ── 消したものを戻す（5 秒） ──
  const [undo, setUndo] = useState<{ label: string; run: () => void } | null>(null);
  useEffect(() => {
    if (!undo) return;
    const id = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(id);
  }, [undo]);

  // 編集の面の題名（作ったメモにすぐ打てるよう、タップの中で focus する。iOS は指の操作の中でないとキーボードを出さない）
  const titleRef = useRef<HTMLInputElement>(null);

  const createNode = useCallback(
    (p: Pt, focus = true) => {
      if (!board) return null;
      const now = Date.now();
      const n: MemoNode = { id: uid('mn-'), boardId: board.id, x: Math.round(p.x), y: Math.round(p.y), title: '', body: '', color: 'none', createdAt: now, updatedAt: now };
      saveMemoNode(n);
      setSel({ kind: 'node', id: n.id });
      if (focus) titleRef.current?.focus({ preventScroll: true });
      return n;
    },
    [board, saveMemoNode],
  );

  const connect = useCallback(
    (from: string, to: string) => {
      if (!board || from === to) return;
      if (edges.some((e) => e.from === from && e.to === to)) return;
      const now = Date.now();
      saveMemoEdge({ id: uid('me-'), boardId: board.id, from, to, title: '', body: '', createdAt: now, updatedAt: now });
    },
    [board, edges, saveMemoEdge],
  );

  // ── 指の操作（1 本：タップ・ドラッグ、2 本：拡大） ──
  type G =
    | { kind: 'pan'; sx: number; sy: number; vx: number; vy: number; moved: boolean; lx: number; ly: number; lt: number; velx: number; vely: number }
    | { kind: 'node'; id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean; lx: number; ly: number; lt: number; velx: number; vely: number }
    | { kind: 'link'; from: string; sx: number; sy: number; moved: boolean }
    | { kind: 'edge'; id: string; sx: number; sy: number; moved: boolean }
    | { kind: 'pinch'; d0: number; k0: number; wm: Pt };
  const g = useRef<G | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const glide = useRef<number | null>(null);
  const stopGlide = () => {
    if (glide.current) cancelAnimationFrame(glide.current);
    glide.current = null;
  };

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    g.current = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: view.current.k, wm: toWorld(mid.x, mid.y) };
  };

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    stopGlide();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    viewportRef.current?.setPointerCapture?.(e.pointerId);
    if (pointers.current.size === 2 && (!g.current || g.current.kind === 'pan')) return startPinch();
    if (pointers.current.size > 1) return;
    const t = e.target as Element;
    const handle = t.closest<HTMLElement>('[data-handle]');
    const node = t.closest<HTMLElement>('[data-node]');
    const edge = t.closest<HTMLElement>('[data-edge]');
    const now = performance.now();
    if (handle) g.current = { kind: 'link', from: handle.dataset.handle!, sx: e.clientX, sy: e.clientY, moved: false };
    else if (node) {
      const n = nodeById.get(node.dataset.node!);
      if (!n) return;
      const w = toWorld(e.clientX, e.clientY);
      g.current = { kind: 'node', id: n.id, sx: e.clientX, sy: e.clientY, ox: w.x - n.x, oy: w.y - n.y, moved: false, lx: e.clientX, ly: e.clientY, lt: now, velx: 0, vely: 0 };
    } else if (edge) g.current = { kind: 'edge', id: edge.dataset.edge!, sx: e.clientX, sy: e.clientY, moved: false };
    else g.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: view.current.x, vy: view.current.y, moved: false, lx: e.clientX, ly: e.clientY, lt: now, velx: 0, vely: 0 };
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = g.current;
    if (!s) return;
    if (s.kind === 'pinch') {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const r = viewportRef.current!.getBoundingClientRect();
      const k = Math.min(MAX_K, Math.max(MIN_K, (s.k0 * Math.hypot(a.x - b.x, a.y - b.y)) / s.d0));
      setView({ k, x: mid.x - r.left - s.wm.x * k, y: mid.y - r.top - s.wm.y * k });
      return;
    }
    const dist = Math.hypot(e.clientX - s.sx, e.clientY - s.sy);
    if (!s.moved && dist < TAP) return;
    s.moved = true;
    const now = performance.now();
    if (s.kind === 'pan') {
      const dt = Math.max(1, now - s.lt);
      s.velx = (e.clientX - s.lx) / dt;
      s.vely = (e.clientY - s.ly) / dt;
      s.lx = e.clientX;
      s.ly = e.clientY;
      s.lt = now;
      setView({ ...view.current, x: s.vx + e.clientX - s.sx, y: s.vy + e.clientY - s.sy });
    } else if (s.kind === 'node') {
      const dt = Math.max(1, now - s.lt);
      s.velx = (e.clientX - s.lx) / dt / view.current.k;
      s.vely = (e.clientY - s.ly) / dt / view.current.k;
      s.lx = e.clientX;
      s.ly = e.clientY;
      s.lt = now;
      const w = toWorld(e.clientX, e.clientY);
      setLifted(s.id);
      setDrag({ id: s.id, x: w.x - s.ox, y: w.y - s.oy });
    } else if (s.kind === 'link') {
      const w = toWorld(e.clientX, e.clientY);
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-node]')?.dataset.node ?? null;
      setLink({ from: s.from, x: w.x, y: w.y, over: over && over !== s.from ? over : null });
    }
  };

  const onPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const s = g.current;
    if (!s) return;
    if (s.kind === 'pinch') {
      // 残った 1 本の指で、そのまま見る場所を動かせる
      if (pointers.current.size === 1) {
        const [p] = [...pointers.current.values()];
        g.current = { kind: 'pan', sx: p.x, sy: p.y, vx: view.current.x, vy: view.current.y, moved: true, lx: p.x, ly: p.y, lt: performance.now(), velx: 0, vely: 0 };
      } else g.current = null;
      saveViewSoon();
      return;
    }
    g.current = null;
    if (s.kind === 'pan') {
      if (!s.moved) {
        // タップ：選んでいるものがあれば外す（キーボードを閉じる）。なければそこに空のメモ
        if (sel) {
          setSel(null);
          (document.activeElement as HTMLElement | null)?.blur?.();
        } else createNode(toWorld(e.clientX, e.clientY));
        return;
      }
      // 指を離した勢いで少し滑る
      let vx = s.velx * 16;
      let vy = s.vely * 16;
      const step = () => {
        vx *= 0.92;
        vy *= 0.92;
        setView({ ...view.current, x: view.current.x + vx, y: view.current.y + vy });
        if (Math.hypot(vx, vy) > 0.3) glide.current = requestAnimationFrame(step);
        else {
          glide.current = null;
          saveViewSoon();
        }
      };
      if (Math.hypot(vx, vy) > 2) glide.current = requestAnimationFrame(step);
      else saveViewSoon();
    } else if (s.kind === 'node') {
      const n = nodeById.get(s.id);
      if (!n) return;
      if (!s.moved) {
        setSel({ kind: 'node', id: n.id });
        return;
      }
      // 置いた位置を残す。勢いがあれば少し滑ってから
      let x = drag?.id === n.id ? drag.x : n.x;
      let y = drag?.id === n.id ? drag.y : n.y;
      let vx = s.velx * 16;
      let vy = s.vely * 16;
      const done = () => {
        setLifted(null);
        setDrag(null);
        saveMemoNode({ ...n, x: Math.round(x), y: Math.round(y), updatedAt: Date.now() });
      };
      if (Math.hypot(vx, vy) < 3) return done();
      const step = () => {
        vx *= 0.88;
        vy *= 0.88;
        x += vx;
        y += vy;
        setDrag({ id: n.id, x, y });
        if (Math.hypot(vx, vy) > 0.4) glide.current = requestAnimationFrame(step);
        else {
          glide.current = null;
          done();
        }
      };
      glide.current = requestAnimationFrame(step);
    } else if (s.kind === 'link') {
      setLink(null);
      if (!s.moved) {
        setSel({ kind: 'node', id: s.from });
        return;
      }
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-node]')?.dataset.node;
      if (over && over !== s.from) connect(s.from, over);
      else if (!over) {
        // 何もないところで離した：そこに新しいメモ + 線（すぐ題名を打てる）
        const n = createNode(toWorld(e.clientX, e.clientY));
        if (n) connect(s.from, n.id);
      }
    } else if (s.kind === 'edge') {
      if (!s.moved) setSel({ kind: 'edge', id: s.id });
    }
  };

  const viewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveViewSoon = () => {
    if (viewTimer.current) clearTimeout(viewTimer.current);
    viewTimer.current = setTimeout(saveView, 600);
  };

  // トラックパッド・マウスのホイール：ふつうは移動、ピンチ（ctrl）で拡大
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = view.current;
      if (e.ctrlKey || e.metaKey) {
        const r = vp.getBoundingClientRect();
        const k = Math.min(MAX_K, Math.max(MIN_K, v.k * Math.exp(-e.deltaY * 0.01)));
        const wx = (e.clientX - r.left - v.x) / v.k;
        const wy = (e.clientY - r.top - v.y) / v.k;
        setView({ k, x: e.clientX - r.left - wx * k, y: e.clientY - r.top - wy * k });
      } else setView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
      saveViewSoon();
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // 見る場所をなめらかに動かす（全体を見る・選んだメモを見えるところへ）
  const tweenTo = useCallback(
    (to: View) => {
      stopGlide();
      const from = { ...view.current };
      const t0 = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / 380);
        const e = 1 - Math.pow(1 - p, 3);
        setView({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, k: from.k + (to.k - from.k) * e });
        if (p < 1) glide.current = requestAnimationFrame(step);
        else {
          glide.current = null;
          saveViewSoon();
        }
      };
      glide.current = requestAnimationFrame(step);
    },
    [setView], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const fit = () => {
    const vp = viewportRef.current;
    const bb = bounds(nodes.map(boxOf));
    if (!vp || !bb) return tweenTo({ x: (vp?.clientWidth ?? 0) / 2, y: (vp?.clientHeight ?? 0) * 0.4, k: 1 });
    const pad = 48;
    const k = Math.min(1.4, Math.max(MIN_K, Math.min((vp.clientWidth - pad * 2) / Math.max(1, bb.x1 - bb.x0), (vp.clientHeight - pad * 2 - 80) / Math.max(1, bb.y1 - bb.y0))));
    tweenTo({ k, x: vp.clientWidth / 2 - ((bb.x0 + bb.x1) / 2) * k, y: (vp.clientHeight - 80) / 2 - ((bb.y0 + bb.y1) / 2) * k });
  };

  // 選んだメモが編集の面（とキーボード）に隠れるなら、上へずらす
  const kb = useKeyboardInset();
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sel || sel.kind !== 'node') return;
    const n = nodeById.get(sel.id);
    const vp = viewportRef.current;
    if (!n || !vp) return;
    const id = setTimeout(() => {
      const v = view.current;
      const sy = n.y * v.k + v.y;
      const visible = vp.clientHeight - (panelRef.current?.offsetHeight ?? 220) - kb - 24;
      if (sy > visible || sy < 40) tweenTo({ ...v, y: v.y + (Math.max(80, visible * 0.4) - sy) });
    }, 280);
    return () => clearTimeout(id);
  }, [sel?.id, kb]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 消す（元に戻せる） ──
  const removeSelected = () => {
    if (!sel) return;
    if (sel.kind === 'node') {
      const r = deleteMemoNode(sel.id);
      if (r) setUndo({ label: 'メモを削除しました', run: () => (saveMemoNode(r.node), r.edges.forEach(saveMemoEdge)) });
    } else {
      const r = deleteMemoEdge(sel.id);
      if (r) setUndo({ label: '線を削除しました', run: () => saveMemoEdge(r) });
    }
    setSel(null);
    (document.activeElement as HTMLElement | null)?.blur?.();
  };

  // 双方向の線は少し曲げて重ならないように
  const pairCount = useMemo(() => {
    const m = new Set<string>();
    for (const e of edges) m.add(`${e.from}>${e.to}`);
    return m;
  }, [edges]);

  const [boardsOpen, setBoardsOpen] = useState(false);
  // キーボード：Esc で選択を外す → もう一度で閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || boardsOpen) return;
      if (sel) {
        setSel(null);
        (document.activeElement as HTMLElement | null)?.blur?.();
      } else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, boardsOpen, onClose]);
  const selNode = sel?.kind === 'node' ? nodeById.get(sel.id) : undefined;
  const selEdge = sel?.kind === 'edge' ? edges.find((e) => e.id === sel.id) : undefined;
  // 選んでいたものが消えたら（元に戻す・ほかの操作）選択を外す
  useEffect(() => {
    if (sel && !selNode && !selEdge) setSel(null);
  }, [sel, selNode, selEdge]);

  if (!board) return null;
  const linkFrom = link ? nodeById.get(link.from) : undefined;

  return (
    <div className="flex h-full flex-col">
      {/* 見出し：閉じる / ボードの名前（そのまま書ける）/ ボードの一覧 */}
      <div className="relative z-20 shrink-0 border-b border-line bg-page">
        <div className="screen-header">
          <button onClick={onClose} aria-label="閉じる" className="btn-icon bg-fill text-fg-2">
            <ChevronDown />
          </button>
          <input
            value={board.title}
            onChange={(e) => saveMemoBoard({ ...board, title: e.target.value, updatedAt: Date.now() })}
            placeholder="無題のマップ"
            aria-label="マップの名前"
            className="w-full min-w-0 rounded-card bg-transparent px-2 py-1.5 text-center text-ui-[16px] font-bold outline-none placeholder:text-fg-3 focus:bg-fill"
          />
          <button onClick={() => setBoardsOpen(true)} aria-label="マップの一覧" className="btn-icon bg-fill text-fg-2">
            <Layers />
          </button>
        </div>
        <div className="h-2" />
      </div>

      {/* ボード：方眼の点の上にメモと線 */}
      <div
        ref={viewportRef}
        data-map-viewport
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(circle, rgb(var(--c-line-strong)) 1.1px, transparent 1.3px)' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={worldRef} className="absolute left-0 top-0 h-0 w-0 origin-top-left" style={{ willChange: 'transform' }}>
          {/* 線（矢印は向かう先のメモ側） */}
          <svg className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-visible">
            <defs>
              <marker id="memo-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="rgb(var(--c-fg2))" />
              </marker>
              <marker id="memo-arrow-on" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="rgb(var(--c-accent))" />
              </marker>
            </defs>
            {edges.map((e) => {
              const a = nodeById.get(e.from);
              const b = nodeById.get(e.to);
              if (!a || !b) return null;
              const on = sel?.kind === 'edge' && sel.id === e.id;
              const { d } = edgePath(boxOf(a), boxOf(b), pairCount.has(`${e.to}>${e.from}`) ? 26 : 0);
              return (
                <g key={e.id}>
                  {/* 押せる太さ（見えない） */}
                  <path d={d} data-edge={e.id} stroke="transparent" strokeWidth={22} fill="none" className="pointer-events-auto cursor-pointer" />
                  <path d={d} stroke={on ? 'rgb(var(--c-accent))' : 'rgb(var(--c-fg2))'} strokeOpacity={on ? 1 : 0.7} strokeWidth={on ? 2.4 : 1.8} fill="none" markerEnd={`url(#${on ? 'memo-arrow-on' : 'memo-arrow'})`} />
                </g>
              );
            })}
            {linkFrom && link && (
              <path d={rubberPath(boxOf(linkFrom), link)} stroke="rgb(var(--c-accent))" strokeWidth={2.2} strokeDasharray="6 5" fill="none" markerEnd="url(#memo-arrow-on)" />
            )}
          </svg>

          {/* 線の題名（なければ小さな点。押すと選べる） */}
          {edges.map((e) => {
            const a = nodeById.get(e.from);
            const b = nodeById.get(e.to);
            if (!a || !b) return null;
            const on = sel?.kind === 'edge' && sel.id === e.id;
            const { mid } = edgePath(boxOf(a), boxOf(b), pairCount.has(`${e.to}>${e.from}`) ? 26 : 0);
            const label = e.title.trim();
            return (
              <div
                key={e.id}
                data-edge={e.id}
                data-no-press
                role="button"
                aria-label={`線：${a.title || '無題'} → ${b.title || '無題'}${label ? `（${label}）` : ''}`}
                className={`absolute z-[1] -translate-x-1/2 -translate-y-1/2 cursor-pointer ${label ? `max-w-[150px] truncate rounded-full border px-2 py-0.5 text-ui-[11px] font-semibold shadow-card ${on ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-fg-2'}` : `grid h-7 w-7 place-items-center`}`}
                style={{ left: mid.x, top: mid.y }}
              >
                {label ? <span data-no-translate>{label}</span> : <span className={`h-2.5 w-2.5 rounded-full ${on ? 'bg-accent' : 'bg-fg-3/70'} ${e.body.trim() ? 'ring-2 ring-accent/40' : ''}`} />}
                {label && e.body.trim() && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle opacity-60" />}
              </div>
            );
          })}

          {/* メモ */}
          {nodes.map((n) => (
            <NodeCard
              key={n.id}
              node={n}
              pos={posOf(n)}
              selected={sel?.kind === 'node' && sel.id === n.id}
              lifted={lifted === n.id}
              target={link?.over === n.id}
              observe={ro}
            />
          ))}
        </div>

        {/* はじめての人へ（空のボード） */}
        {!nodes.length && (
          <div className="pointer-events-none absolute inset-x-6 top-[30%] text-center">
            <p className="text-ui-[15px] font-bold text-fg-2">何もないところをタップしてメモを置く</p>
            <p className="mt-1.5 text-ui-[12.5px] leading-relaxed text-fg-3">メモはドラッグで動かせます。メモの右の丸をドラッグすると線（矢印）が引けます。何もないところで離すと新しいメモができます。</p>
          </div>
        )}

        {/* 右下：全体を見る・真ん中にメモを置く */}
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+16px)] right-4 z-10 flex flex-col gap-2" style={{ transform: sel ? 'translateY(-200%)' : undefined, opacity: sel ? 0 : 1, pointerEvents: sel ? 'none' : undefined, transition: 'opacity 200ms, transform 300ms cubic-bezier(0.22,1,0.36,1)' }}>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={fit}
            aria-label="全体を見る"
            className="btn-icon bg-surface text-fg-2 shadow-raised"
          >
            <Scan />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              const vp = viewportRef.current!;
              const r = vp.getBoundingClientRect();
              // 真ん中（ほかのメモと重ならないよう少しずらす）
              const c = toWorld(r.left + r.width / 2 + ((nodes.length * 37) % 60) - 30, r.top + r.height * 0.4 + ((nodes.length * 53) % 80) - 40);
              createNode(c);
            }}
            aria-label="メモを置く"
            className="grid h-[52px] w-[52px] place-items-center rounded-full bg-accent text-white shadow-raised"
          >
            <Plus size={24} strokeWidth={2.6} />
          </button>
        </div>
      </div>

      {/* 編集の面：選んだメモ・線の題名と説明をそのまま書ける（いつも置いておき、選んでいないときは下に隠す） */}
      <Editor
        panelRef={panelRef}
        titleRef={titleRef}
        bottom={kb}
        node={selNode}
        edge={selEdge}
        nodeById={nodeById}
        onNode={(n) => saveMemoNode({ ...n, updatedAt: Date.now() })}
        onEdge={(e) => saveMemoEdge({ ...e, updatedAt: Date.now() })}
        onDelete={removeSelected}
        onClose={() => {
          setSel(null);
          (document.activeElement as HTMLElement | null)?.blur?.();
        }}
      />

      {/* 元に戻す */}
      <AnimatePresence>
        {undo && (
          <motion.div
            className="absolute inset-x-0 z-40 flex justify-center px-4"
            style={{ bottom: `calc(env(safe-area-inset-bottom) + 20px + ${kb}px)` }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
          >
            <div className="flex items-center gap-3 rounded-full bg-[#1C1E24] py-2 pl-4 pr-2 text-ui-[13px] font-semibold text-white shadow-raised" role="status">
              {undo.label}
              <button
                onClick={() => {
                  undo.run();
                  setUndo(null);
                }}
                className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 font-bold"
              >
                <Undo2 size={14} /> 元に戻す
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BoardsSheet
        open={boardsOpen}
        onClose={() => setBoardsOpen(false)}
        boards={memoBoards}
        current={board.id}
        counts={memoNodes}
        onPick={(id) => {
          saveView();
          setSel(null);
          setBoardId(id);
          setBoardsOpen(false);
        }}
        onNew={() => {
          saveView();
          const now = Date.now();
          const b: MemoBoard = { id: uid('mb-'), title: '', createdAt: now, updatedAt: now };
          saveMemoBoard(b);
          setSel(null);
          setBoardId(b.id);
          setBoardsOpen(false);
        }}
        onDelete={(id) => {
          deleteMemoBoard(id);
          if (id === board.id) setBoardId(memoBoards.find((b) => b.id !== id)?.id ?? null);
        }}
      />
    </div>
  );
}

/** メモ 1 枚（題名・説明の頭・右の丸＝線を引くつまみ） */
const NodeCard = memo(function NodeCard({ node, pos, selected, lifted, target, observe }: { node: MemoNode; pos: Pt; selected: boolean; lifted: boolean; target: boolean; observe: ResizeObserver }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    observe.observe(el);
    return () => observe.unobserve(el);
  }, [observe]);
  const title = node.title.trim();
  const body = node.body.trim();
  const style: CSSProperties = {
    left: pos.x,
    top: pos.y,
    transform: `translate(-50%,-50%) scale(${lifted ? 1.05 : 1})`,
    transition: 'transform 260ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms',
  };
  return (
    <div
      ref={ref}
      data-node={node.id}
      data-no-press
      role="button"
      aria-label={`メモ：${title || '無題'}`}
      className={`absolute z-[2] w-max min-w-[64px] max-w-[210px] cursor-grab rounded-card border px-3 py-2 ${cardOf(node.color)} ${
        selected ? 'border-accent ring-2 ring-accent/60' : target ? 'border-accent ring-4 ring-accent/30' : 'border-line'
      } ${lifted ? 'z-[3] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)]' : 'shadow-card'}`}
      style={style}
    >
      {title ? (
        <p data-no-translate className="line-clamp-3 break-words text-ui-[14px] font-bold leading-snug">{title}</p>
      ) : (
        <p className="text-ui-[12.5px] font-semibold text-fg-3">{body ? '' : '空のメモ'}</p>
      )}
      {body && <p data-no-translate className={`line-clamp-3 whitespace-pre-line break-words text-ui-[12px] leading-snug text-fg-2 ${title ? 'mt-0.5' : ''}`}>{body}</p>}
      {/* 線を引くつまみ（押せる範囲は見た目より広い） */}
      <span data-handle={node.id} data-no-press aria-label="線を引く" role="button" className="absolute -right-[15px] top-1/2 grid h-[30px] w-[30px] -translate-y-1/2 cursor-crosshair place-items-center">
        <span className={`h-[13px] w-[13px] rounded-full border-2 border-surface ${selected || target ? 'bg-accent' : 'bg-accent/70'} shadow-card`} />
      </span>
    </div>
  );
});

/** 編集の面（下に浮いたカード）。題名・説明はそのまま書けて、自動で保存 */
function Editor({
  panelRef,
  titleRef,
  bottom,
  node,
  edge,
  nodeById,
  onNode,
  onEdge,
  onDelete,
  onClose,
}: {
  panelRef: React.RefObject<HTMLDivElement>;
  titleRef: React.RefObject<HTMLInputElement>;
  bottom: number;
  node?: MemoNode;
  edge?: MemoEdge;
  nodeById: Map<string, MemoNode>;
  onNode: (n: MemoNode) => void;
  onEdge: (e: MemoEdge) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const item = node ?? edge;
  // 閉じる動きの間も中身を残す
  const last = useRef<{ node?: MemoNode; edge?: MemoEdge }>({});
  if (item) last.current = { node, edge };
  const shown = last.current;
  const it = shown.node ?? shown.edge;
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // 説明の欄は書いた分だけ伸びる（上限あり）
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [it?.body, it?.id]);
  const from = shown.edge ? nodeById.get(shown.edge.from) : undefined;
  const to = shown.edge ? nodeById.get(shown.edge.to) : undefined;
  const set = (patch: Partial<MemoNode & MemoEdge>) => {
    if (node) onNode({ ...node, ...patch });
    else if (edge) onEdge({ ...edge, ...patch });
  };
  return (
    <div
      ref={panelRef}
      className="absolute inset-x-0 z-30 px-3"
      style={{
        bottom: `calc(env(safe-area-inset-bottom) + 10px + ${bottom}px)`,
        transform: item ? 'translateY(0)' : 'translateY(calc(100% + 40px))',
        opacity: item ? 1 : 0,
        transition: 'transform 360ms cubic-bezier(0.22,1,0.36,1), opacity 200ms',
        pointerEvents: item ? undefined : 'none',
      }}
      aria-hidden={!item}
    >
      <div className="mx-auto max-w-xl rounded-[20px] border border-line bg-surface p-3 shadow-raised">
        <div className="flex items-center gap-2">
          {shown.node ? (
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="メモの色">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => set({ color: c.id })}
                  aria-label={`色：${c.label}`}
                  aria-checked={shown.node!.color === c.id}
                  role="radio"
                  className={`hit h-7 w-7 rounded-full border ${shown.node!.color === c.id ? 'border-accent ring-2 ring-accent/50' : 'border-line-strong'}`}
                  style={{ background: c.swatch }}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-1.5 text-ui-[12.5px] font-semibold text-fg-2">
              <span className="truncate">{from?.title || '無題'}</span>
              <span className="shrink-0">→</span>
              <span className="truncate">{to?.title || '無題'}</span>
              <button
                onClick={() => edge && onEdge({ ...edge, from: edge.to, to: edge.from })}
                aria-label="向きを反対に"
                className="hit ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-fill text-fg-2"
              >
                <ArrowLeftRight size={14} />
              </button>
            </div>
          )}
          <div className="flex-1" />
          <button onClick={onDelete} aria-label="削除" className="hit grid h-8 w-8 place-items-center rounded-full text-danger-ink active:bg-danger-soft">
            <Trash2 size={17} />
          </button>
          <button onClick={onClose} aria-label="編集を閉じる" className="hit grid h-8 w-8 place-items-center rounded-full bg-fill text-fg-2">
            <X size={16} />
          </button>
        </div>
        <input
          ref={titleRef}
          value={it?.title ?? ''}
          onChange={(e) => set({ title: e.target.value })}
          placeholder={shown.edge ? '線の題名（例：だから・なぜなら）' : '題名'}
          aria-label="題名"
          enterKeyHint="next"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              bodyRef.current?.focus();
            }
          }}
          className="mt-2 w-full bg-transparent text-ui-[17px] font-bold outline-none placeholder:text-fg-3"
        />
        <textarea
          ref={bodyRef}
          value={it?.body ?? ''}
          onChange={(e) => set({ body: e.target.value })}
          placeholder="説明（長く書けます）"
          aria-label="説明"
          rows={2}
          className="no-scrollbar mt-1 w-full resize-none bg-transparent text-ui-[14px] leading-relaxed text-fg outline-none placeholder:text-fg-3"
        />
      </div>
    </div>
  );
}

/** マップの一覧（切り替え・新しいマップ・削除） */
function BoardsSheet({
  open,
  onClose,
  boards,
  current,
  counts,
  onPick,
  onNew,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  boards: MemoBoard[];
  current: string;
  counts: MemoNode[];
  onPick: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  // 削除は 2 回押す（1 回目で「削除する？」に変わる）。めったに使わない操作だけ確かめる
  const [arm, setArm] = useState<string | null>(null);
  useEffect(() => {
    if (!open) setArm(null);
  }, [open]);
  const sorted = [...boards].sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <Sheet open={open} onClose={onClose} title="マップの一覧">
      <div className="space-y-2 pb-5">
        <button onClick={onNew} className="card flex w-full items-center gap-3 px-4 py-3 text-left font-bold text-accent-ink">
          <Plus size={18} /> 新しいマップ
        </button>
        {sorted.map((b) => {
          const n = counts.filter((x) => x.boardId === b.id).length;
          return (
            <div key={b.id} className={`card flex items-center gap-2 py-1 pl-4 pr-1.5 ${b.id === current ? 'ring-2 ring-accent/50' : ''}`}>
              <button onClick={() => onPick(b.id)} className="min-w-0 flex-1 py-2.5 text-left">
                <span className="block truncate text-ui-[14px] font-bold" data-no-translate={b.title.trim() ? true : undefined}>{b.title.trim() || '無題のマップ'}</span>
                <span className="block text-ui-[12px] text-fg-2">{`メモ ${n} 枚`}</span>
              </button>
              {arm === b.id ? (
                <button onClick={() => onDelete(b.id)} className="shrink-0 rounded-full bg-danger px-3 py-2 text-ui-[12.5px] font-bold text-white">
                  削除する
                </button>
              ) : (
                <button onClick={() => setArm(b.id)} aria-label="マップを削除" className="hit grid h-9 w-9 shrink-0 place-items-center rounded-full text-fg-3">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

/** 画面のキーボードの高さ（iOS は visualViewport が縮む）。下に浮いた面をキーボードの上に出すため */
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const on = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    vv.addEventListener('resize', on);
    vv.addEventListener('scroll', on);
    return () => {
      vv.removeEventListener('resize', on);
      vv.removeEventListener('scroll', on);
    };
  }, []);
  return inset;
}
