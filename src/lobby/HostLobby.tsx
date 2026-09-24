import { useState } from 'preact/hooks';
import { PixelPanel } from '../core/ui/PixelPanel';
import { PixelButton } from '../core/ui/PixelButton';
import { QRDisplay } from '../core/ui/QRDisplay';
import { AvatarSprite } from '../core/ui/AvatarSprite';
import { showToast } from '../core/ui/toast';
import type { RoomPlayer } from '../core/room/protocol';

/** Party room info panel + player roster, shared by the lobby and in-game host screens. */
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
        <p className="host-lobby__game-title">ห้องปาร์ตี้</p>
        <div className="host-lobby__code-row">
          <div>
            <p className="host-lobby__code-label">รหัสห้อง</p>
            <p className="host-lobby__code" data-testid="room-code">
              {roomCode}
            </p>
            <div className="host-lobby__actions">
              <PixelButton variant="secondary" onClick={copyLink}>
                {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกลิงก์เข้าร่วม'}
              </PixelButton>
              <PixelButton variant={locked ? 'danger' : 'secondary'} onClick={onToggleLock}>
                {locked ? '🔒 ปลดล็อกห้อง' : '🔓 ล็อกห้อง'}
              </PixelButton>
            </div>
          </div>
          <QRDisplay url={joinUrl} size={150} />
        </div>
      </PixelPanel>

      <PixelPanel className="host-lobby__players">
        <div className="host-lobby__players-header">
          <h2>ผู้เล่นในห้อง ({players.length})</h2>
        </div>
        {players.length === 0 ? (
          <p className="host-lobby__empty">ยังไม่มีผู้เล่น — สแกน QR หรือกรอกรหัสห้องเพื่อเข้าร่วม</p>
        ) : (
          <ul className="host-lobby__grid">
            {players.map((p) => (
              <li key={p.playerId} className={`host-lobby__player ${!p.connected ? 'is-disconnected' : ''}`}>
                <button
                  type="button"
                  className="host-lobby__kick"
                  onClick={() => onKick(p.playerId)}
                  title={`เชิญ ${p.name} ออกจากห้อง`}
                  aria-label={`เชิญ ${p.name} ออกจากห้อง`}
                >
                  <AvatarSprite avatarId={p.avatarId} size={56} animation="idle" pop />
                  <span className="host-lobby__player-name">{p.name}</span>
                  <span className="host-lobby__kick-x" aria-hidden="true">
                    ✕
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
