import { useState } from 'preact/hooks';
import { PixelPanel } from '../core/ui/PixelPanel';
import { PixelButton } from '../core/ui/PixelButton';
import { QRDisplay } from '../core/ui/QRDisplay';
import { AvatarSprite } from '../core/ui/AvatarSprite';
import { showToast } from '../core/ui/toast';
import { Icon } from '../core/ui/Icon';
import { shareJoinLink } from '../core/device/share';
import type { RoomPlayer } from '../core/room/protocol';

/** Party room info panel + player roster, shared by the lobby and in-game host screens. */
/** `https://host/F/#/join/ABCDE` -> `host/F` — short enough to read off a projector. */
function shortJoinUrl(joinUrl: string): string {
  try {
    const u = new URL(joinUrl);
    return `${u.host}${u.pathname}`.replace(/\/$/, '');
  } catch {
    return joinUrl;
  }
}

export function HostLobby({
  roomCode,
  joinUrl,
  players,
  locked,
  onToggleLock,
  onKick,
}: {
  roomCode: string;
  joinUrl: string;
  players: RoomPlayer[];
  locked: boolean;
  onToggleLock: () => void;
  onKick: (playerId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [qrEnlarged, setQrEnlarged] = useState(false);
  const qrSize = typeof window !== 'undefined' && window.innerWidth >= 1280 ? 280 : 150;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      showToast('คัดลอกลิงก์แล้ว', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('คัดลอกไม่สำเร็จ ลองคัดลอกด้วยตัวเอง', 'error');
    }
  };

  return (
    <div className="host-lobby">
      <PixelPanel className="host-lobby__code-panel">
        <p className="host-lobby__join-at">
          เข้าร่วมที่ <span className="pixel-num">{shortJoinUrl(joinUrl)}</span>
        </p>
        <div className="host-lobby__code-row">
          <div className="host-lobby__code-col">
            <p className="host-lobby__code-label">รหัสห้อง</p>
            <p className="host-lobby__code pixel-num" data-testid="room-code">
              {roomCode}
            </p>
          </div>
          <button
            type="button"
            className="host-lobby__qr-trigger"
            onClick={() => setQrEnlarged(true)}
            aria-label="ขยาย QR โค้ดเต็มจอ"
          >
            <QRDisplay url={joinUrl} size={qrSize} />
          </button>
        </div>
        <div className="host-actions-row">
          <PixelButton variant="secondary" onClick={copyLink}>
            {copied ? <><Icon name="check" className="pp-icon--sm" /> คัดลอกแล้ว</> : 'คัดลอกลิงก์'}
          </PixelButton>
          <PixelButton variant="secondary" onClick={() => shareJoinLink(joinUrl, roomCode)}>
            <Icon name="horn" className="pp-icon--sm" /> แชร์
          </PixelButton>
          <PixelButton variant={locked ? 'danger' : 'secondary'} onClick={onToggleLock}>
            <Icon name="lock" className="pp-icon--sm" /> {locked ? 'ปลดล็อกห้อง' : 'ล็อกห้อง'}
          </PixelButton>
        </div>
      </PixelPanel>

      {qrEnlarged && (
        <div className="host-lobby__qr-overlay" onClick={() => setQrEnlarged(false)} data-testid="qr-overlay">
          <QRDisplay url={joinUrl} size={Math.min(typeof window !== 'undefined' ? window.innerWidth : 400, 520) - 64} />
          <p className="host-lobby__qr-overlay-hint">แตะเพื่อปิด</p>
        </div>
      )}

      <PixelPanel className="host-lobby__players">
        <div className="host-lobby__players-header">
          <h2>นักผจญภัยในโรงเตี๊ยม ({players.length})</h2>
        </div>
        {players.length === 0 ? (
          <p className="host-lobby__empty">ยังไม่มีนักผจญภัย — สแกน QR หรือกรอกรหัสห้องเพื่อเข้าร่วม</p>
        ) : (
          <ul className="host-lobby__grid">
            {players.map((p) => (
              <li key={p.playerId} className={`host-lobby__player ${!p.connected ? 'is-disconnected' : ''}`}>
                <button
                  type="button"
                  className="host-lobby__kick"
                  onClick={() => onKick(p.playerId)}
                  title={`เชิญ ${p.name} ออกจากโรงเตี๊ยม`}
                  aria-label={`เชิญ ${p.name} ออกจากโรงเตี๊ยม`}
                >
                  <AvatarSprite avatarId={p.avatarId} tint={p.tint} size={56} animation="idle" pop />
                  <span className="host-lobby__player-name">
                    {p.name}
                    {p.isBot && <span className="npc-badge">NPC</span>}
                  </span>
                  <span className="host-lobby__kick-x" aria-hidden="true">
                    <Icon name="cross" className="pp-icon--sm" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PixelPanel>
    </div>
  );
}
