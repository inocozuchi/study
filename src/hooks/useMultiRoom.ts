import { useEffect, useRef, useState } from 'react';
import { uid } from '@/lib/id';

export type PeerStatus = 'idle' | 'focus' | 'break';

export interface Peer {
  id: string;
  name: string;
  status: PeerStatus;
  subject?: string;
  /** その状態になった時刻 */
  since: number;
  seen: number;
}

interface Presence {
  type: 'presence' | 'bye';
  id: string;
  name: string;
  status: PeerStatus;
  subject?: string;
  since: number;
}

const SELF_KEY = 'focus-trail:peer-id';
function selfId() {
  try {
    const v = sessionStorage.getItem(SELF_KEY);
    if (v) return v;
    const id = uid('peer-');
    sessionStorage.setItem(SELF_KEY, id);
    return id;
  } catch {
    return uid('peer-');
  }
}

export const multiSupported = typeof BroadcastChannel !== 'undefined';

/**
 * マルチ（旅の仲間）：同じ部屋コードを開いているタブ・ウィンドウ同士で
 * BroadcastChannel を使って在室と集中状態を共有する。
 * 端末をまたぐ同期にはサーバーが必要なため、data 層と同様にここを差し替える想定。
 */
export function useMultiRoom(enabled: boolean, room: string, me: { name: string; status: PeerStatus; subject?: string; since: number }) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const idRef = useRef(selfId());
  const meRef = useRef(me);
  meRef.current = me;
  const chanRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (!enabled || !room || !multiSupported) {
      setPeers([]);
      return;
    }
    const chan = new BroadcastChannel(`focus-trail-room:${room}`);
    chanRef.current = chan;
    const map = new Map<string, Peer>();
    const flush = () => setPeers([...map.values()].sort((a, b) => a.name.localeCompare(b.name)));
    const post = (type: Presence['type'] = 'presence') => chan.postMessage({ type, id: idRef.current, ...meRef.current } satisfies Presence);

    chan.onmessage = (e: MessageEvent<Presence>) => {
      const m = e.data;
      if (!m || m.id === idRef.current) return;
      if (m.type === 'bye') map.delete(m.id);
      else {
        const isNew = !map.has(m.id);
        map.set(m.id, { id: m.id, name: m.name, status: m.status, subject: m.subject, since: m.since, seen: Date.now() });
        if (isNew) post(); // 新しい仲間にすぐ自分を知らせる
      }
      flush();
    };
    post();
    const beat = setInterval(() => {
      post();
      const now = Date.now();
      let changed = false;
      for (const [k, p] of map) if (now - p.seen > 7000) {
        map.delete(k);
        changed = true;
      }
      if (changed) flush();
    }, 2500);
    const bye = () => post('bye');
    window.addEventListener('pagehide', bye);
    return () => {
      bye();
      clearInterval(beat);
      window.removeEventListener('pagehide', bye);
      chan.close();
      chanRef.current = null;
      setPeers([]);
    };
  }, [enabled, room]);

  // 自分の状態が変わったらすぐ知らせる
  useEffect(() => {
    chanRef.current?.postMessage({ type: 'presence', id: idRef.current, ...me } satisfies Presence);
  }, [me.name, me.status, me.subject, me.since]); // eslint-disable-line react-hooks/exhaustive-deps

  return { peers, selfId: idRef.current };
}

export function randomRoomCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
}
