import { useEffect, useState } from 'preact/hooks';

/**
 * Tracks browser online/offline state. The app is a static PWA shell that
 * still works offline (the hub loads from cache), but creating/joining a
 * room needs real internet (PeerJS/WebRTC signaling), so screens that
 * start a connection show "ต้องต่ออินเทอร์เน็ตเพื่อเล่นกับเพื่อน" when this
 * is false instead of failing silently.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}

export const OFFLINE_MESSAGE_TH = 'ต้องต่ออินเทอร์เน็ตเพื่อเล่นกับเพื่อน';
