import { PixelPanel } from '../core/ui/PixelPanel';
import { AvatarSprite } from '../core/ui/AvatarSprite';
import type { RoomPlayer } from '../core/room/protocol';

export function PlayerLobby({ self, players }: { self: RoomPlayer | undefined; players: RoomPlayer[] }) {
  const others = players.filter((p) => p.playerId !== self?.playerId);

  return (
    <div className="player-lobby">
      <PixelPanel className="player-lobby__self">
        <AvatarSprite avatarId={self?.avatarId ?? 'fighter'} tint={self?.tint ?? 0} size={96} animation="idle" />
        <p className="player-lobby__name">{self?.name ?? '...'}</p>
        <p className="player-lobby__waiting">รอผู้คุมเกมเริ่มภารกิจ…</p>
      </PixelPanel>

      <PixelPanel dark className="player-lobby__others">
        <h2>นักผจญภัยคนอื่น ({others.length})</h2>
        {others.length === 0 ? (
          <p className="player-lobby__empty">ยังไม่มีใครเข้าร่วมเพิ่ม</p>
        ) : (
          <ul className="player-lobby__list">
            {others.map((p) => (
              <li key={p.playerId} className={!p.connected ? 'is-disconnected' : ''}>
                <AvatarSprite avatarId={p.avatarId} tint={p.tint} size={40} animation="idle" />
                <span>
                  {p.name}
                  {p.isBot && <span className="npc-badge">NPC</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PixelPanel>
    </div>
  );
}
