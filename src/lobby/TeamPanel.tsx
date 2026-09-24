import { PixelPanel } from '../core/ui/PixelPanel';
import { PixelButton } from '../core/ui/PixelButton';
import { AvatarSprite } from '../core/ui/AvatarSprite';
import { EmblemIcon } from '../core/ui/Icon';
import type { EmblemName } from '../core/sprites/icons';
import type { RoomPlayer, Team } from '../core/room/protocol';
import { MAX_TEAMS, MIN_TEAMS } from '../core/room/teams';

/**
 * Host-side team ("guild") controls: on/off toggle, team count, auto-balance,
 * and a per-team roster where tapping a player cycles them to the next team
 * (a tap-friendly stand-in for drag-and-drop, which doesn't work well on phones).
 */
export function TeamPanel({
  teamMode,
  teams,
  players,
  onSetTeamMode,
  onSetTeamCount,
  onAutoBalance,
  onCyclePlayerTeam,
}: {
  teamMode: boolean;
  teams: Team[];
  players: RoomPlayer[];
  onSetTeamMode: (on: boolean) => void;
  onSetTeamCount: (count: number) => void;
  onAutoBalance: () => void;
  onCyclePlayerTeam: (playerId: string, nextTeamId: string) => void;
}) {
  return (
    <PixelPanel className="team-panel">
      <div className="team-panel__header">
        <h2>โหมดกิลด์ (Team mode)</h2>
        <label className="quiz-setup__toggle">
          <input type="checkbox" checked={teamMode} onChange={(e) => onSetTeamMode((e.target as HTMLInputElement).checked)} />
          เปิดโหมดทีม
        </label>
      </div>

      {teamMode && (
        <>
          <div className="team-panel__controls">
            <span className="quiz-setup__label">จำนวนกิลด์:</span>
            <div className="quiz-setup__chip-row">
              {Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => i + MIN_TEAMS).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`quiz-setup__chip ${teams.length === n ? 'is-active' : ''}`}
                  onClick={() => onSetTeamCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <PixelButton variant="secondary" onClick={onAutoBalance}>
              สุ่มแบ่งทีม
            </PixelButton>
          </div>

          <div className="team-panel__grid">
            {teams.map((team) => {
              const members = players.filter((p) => p.teamId === team.id);
              return (
                <div key={team.id} className="team-panel__team" style={{ borderColor: team.color }}>
                  <p className="team-panel__team-name" style={{ color: team.color }}>
                    <EmblemIcon name={team.emblem as EmblemName} className="pp-icon--md" /> {team.name} ({members.length})
                  </p>
                  <div className="team-panel__members">
                    {members.map((p) => (
                      <button
                        key={p.playerId}
                        type="button"
                        className="team-panel__member"
                        title={`แตะเพื่อย้าย ${p.name} ไปกิลด์ถัดไป`}
                        onClick={() => {
                          const idx = teams.findIndex((t) => t.id === team.id);
                          const next = teams[(idx + 1) % teams.length]!;
                          onCyclePlayerTeam(p.playerId, next.id);
                        }}
                      >
                        <AvatarSprite avatarId={p.avatarId} tint={p.tint} size={36} animation="idle" />
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </PixelPanel>
  );
}
