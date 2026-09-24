import { useEffect, useState } from 'preact/hooks';
import { applyPwaUpdate, isPwaUpdateAvailable, onPwaUpdateAvailable } from './register';
import { isUpdateDeferred, onUpdateGateChange } from './updateGate';
import { PixelButton } from '../ui/PixelButton';

/**
 * Persistent "มีเวอร์ชันใหม่ — อัปเดต" banner. Stays hidden while a game is
 * in progress (see updateGate.ts) even if a new SW finished installing in
 * the background — reappears the moment the room returns to the lobby.
 * Mount once near the app root (src/app/App.tsx).
 */
export function UpdateToast() {
  const [available, setAvailable] = useState(isPwaUpdateAvailable());
  const [deferred, setDeferred] = useState(isUpdateDeferred());
  const [applying, setApplying] = useState(false);

  useEffect(() => onPwaUpdateAvailable(setAvailable), []);
  useEffect(() => onUpdateGateChange(() => setDeferred(isUpdateDeferred())), []);

  if (!available || deferred) return null;

  return (
    <div className="pwa-update-toast pixel-panel" role="status">
      <span>มีเวอร์ชันใหม่ — อัปเดต</span>
      <PixelButton
        variant="primary"
        onClick={() => {
          setApplying(true);
          applyPwaUpdate().catch(() => setApplying(false));
        }}
        disabled={applying}
      >
        {applying ? 'กำลังอัปเดต…' : 'อัปเดต'}
      </PixelButton>
    </div>
  );
}
