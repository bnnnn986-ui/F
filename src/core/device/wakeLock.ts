import { useEffect, useRef } from 'preact/hooks';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

interface NavigatorWithWakeLock extends Navigator {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
}

/**
 * Keeps the screen awake while `active` is true (host running a game,
 * player in the lobby/game) — re-acquires automatically on
 * `visibilitychange` (the browser silently releases the lock when the tab
 * is backgrounded, per spec) and always releases on unmount/deactivate.
 * No-ops entirely where the Wake Lock API isn't supported (Safari < 16.4,
 * many browsers over insecure origins) — never throws.
 */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock) return undefined;

    let cancelled = false;

    async function acquire() {
      try {
        const sentinel = await nav.wakeLock!.request('screen');
        if (cancelled) {
          sentinel.release().catch(() => undefined);
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
        });
      } catch {
        /* denied (e.g. low battery, backgrounded) — ignore, will retry on visibilitychange */
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible' && !sentinelRef.current) {
        acquire();
      }
    }

    acquire();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      sentinelRef.current?.release().catch(() => undefined);
      sentinelRef.current = null;
    };
  }, [active]);
}
