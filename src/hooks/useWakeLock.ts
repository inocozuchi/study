import { useEffect, useRef, useState } from 'react';

export const wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

/** active の間 Screen Wake Lock を保持。タブ復帰時に再取得する */
export function useWakeLock(active: boolean) {
  const sentinel = useRef<WakeLockSentinel | null>(null);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!wakeLockSupported) return;
    let cancelled = false;

    const acquire = async () => {
      if (!active || document.visibilityState !== 'visible' || sentinel.current) return;
      try {
        const s = await navigator.wakeLock.request('screen');
        if (cancelled) {
          s.release();
          return;
        }
        sentinel.current = s;
        setHeld(true);
        s.addEventListener('release', () => {
          sentinel.current = null;
          setHeld(false);
        });
      } catch {
        setHeld(false);
      }
    };

    const onVis = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    if (active) {
      acquire();
      document.addEventListener('visibilitychange', onVis);
    } else if (sentinel.current) {
      sentinel.current.release();
      sentinel.current = null;
    }

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [active]);

  useEffect(() => () => {
    sentinel.current?.release();
  }, []);

  return held;
}
