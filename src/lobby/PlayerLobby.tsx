import { PixelPanel } from '../core/ui/PixelPanel';
import { PixelButton } from '../core/ui/PixelButton';
import { AvatarSprite } from '../core/ui/AvatarSprite';
import { EmblemIcon, Icon } from '../core/ui/Icon';
import type { EmblemName } from '../core/sprites/icons';
import type { RoomPlayer, Team } from '../core/room/protocol';
import { getTeam } from '../core/room/teams';
import { shareJoinLink } from '../core/device/share';
import { InstallButton } from '../core/pwa/InstallButton';

export function PlayerLobby({
  self,
  players,
  teamMode = false,
  teams = [],
  onChooseTeam,
  joinUrl,
  roomCode,
}: {
  self: RoomPlayer | undefined;
  players: RoomPlayer[];
  teamMode?: boolean;
  teams?: Team[];
  onChooseTeam?: (teamId: string) => void;
  /** Present on the party lobby screen — lets a player invite others too, not just the host. */
  joinUrl?: string;
  roomCode?: string;
}) {
  const others = players.filter((p) => p.playerId !== self?.playerId);
  const myTeam = teamMode ? getTeam(teams, self?.teamId) : undefined;

  return (
    <div className="player-lobby">
      <PixelPanel className="player-lobby__self">
        <AvatarSprite avatarId={self?.avatarId ?? 'fighter'} tint={self?.tint ?? 0} size={96} animation="idle" />
        <p className="player-lobby__name">{self?.name ?? '...'}</p>
        {myTeam && (
          <p className="player-lobby__team" style={{ color: myTeam.color }}>
            <EmblemIcon name={myTeam.emblem as EmblemName} className="pp-icon--md" /> {myTeam.name}
          </p>
        )}
        <p className="player-lobby__waiting">รอผู้คุมเกมเริ่มภารกิจ…</p>
        {joinUrl && (
          <div className="player-lobby__self-actions">
            <PixelButton variant="secondary" size="sm" onClick={() => shareJoinLink(joinUrl, roomCode)}>
              <Icon name="horn" className="pp-icon--sm" /> ชวนเพื่อน
            </PixelButton>
            <InstallButton compact />
          </div>
        )}
      </PixelPanel>

      {teamMode && teams.length > 0 && onChooseTeam && (
        <PixelPanel className="player-lobby__team-picker">
          <p className="quiz-setup__label">เลือกกิลด์ของคุณ</p>
          <div className="quiz-setup__chip-row">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                className={`quiz-setup__chip ${self?.teamId === team.id ? 'is-active' : ''}`}
                style={self?.teamId === team.id ? { background: team.color, color: '#fff' } : undefined}
                onClick={() => onChooseTeam(team.id)}
              >
                <EmblemIcon name={team.emblem as EmblemName} className="pp-icon--sm" /> {team.name}
              </button>
            ))}
          </div>
        </PixelPanel>
      )}

      <PixelPanel dark className="player-lobby__others">
        <h2>นักผจญภัยคนอื่น ({others.length})</h2>
        {others.length === 0 ? (
          <p className="player-lobby__empty">ยังไม่มีใครเข้าร่วมเพิ่ม</p>
        ) : (
          <ul className="player-lobby__list">
            {others.map((p) => {
              const team = teamMode ? getTeam(teams, p.teamId) : undefined;
              return (
                <li key={p.playerId} className={!p.connected ? 'is-disconnected' : ''}>
                  <AvatarSprite avatarId={p.avatarId} tint={p.tint} size={40} animation="idle" />
                  <span>
                    {p.name}
                    {p.isBot && <span className="npc-badge">NPC</span>}
                    {team && (
                      <span className="npc-badge" style={{ background: team.color, color: '#fff' }}>
                        <EmblemIcon name={team.emblem as EmblemName} className="pp-icon--sm" />
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </PixelPanel>
    </div>
  );
}
