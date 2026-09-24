import { useState } from 'preact/hooks';
import { PixelPanel } from '../core/ui/PixelPanel';
import { PixelInput } from '../core/ui/PixelInput';
import { PixelButton } from '../core/ui/PixelButton';
import { isValidRoomCode, normalizeRoomCode } from '../core/net/roomCode';
import { navigate } from '../app/router';
import { OFFLINE_MESSAGE_TH, useOnlineStatus } from '../core/device/online';

/** Always-visible "join with code" box pinned near the top of the hub. */
export function JoinPanel() {
  const [code, setCode] = useState('');
  const [touched, setTouched] = useState(false);
  const online = useOnlineStatus();

  const normalized = normalizeRoomCode(code);
  const valid = isValidRoomCode(normalized);

  const submit = (e: Event) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || !online) return;
    navigate(`/join/${normalized}`);
  };

  return (
    <PixelPanel className="join-panel" aria-label="เข้าร่วมห้องด้วยรหัส">
      <form onSubmit={submit} className="join-panel__form">
        <label htmlFor="room-code" className="join-panel__label">
          เข้าร่วมด้วยรหัสห้อง
        </label>
        <div className="join-panel__row">
          <PixelInput
            id="room-code"
            value={code}
            onInput={(e) => setCode((e.target as HTMLInputElement).value.toUpperCase())}
            placeholder="เช่น A3XQP"
            maxLength={8}
            autoComplete="off"
            autocapitalize="characters"
            inputMode="text"
            aria-invalid={touched && !valid}
          />
          <PixelButton type="submit" variant="primary" disabled={!valid || !online}>
            เข้าร่วม
          </PixelButton>
        </div>
        {touched && !valid && <p className="join-panel__hint">กรอกรหัสห้อง 5 ตัวอักษรให้ครบ</p>}
        {touched && valid && !online && <p className="join-panel__hint">{OFFLINE_MESSAGE_TH}</p>}
      </form>
    </PixelPanel>
  );
}
