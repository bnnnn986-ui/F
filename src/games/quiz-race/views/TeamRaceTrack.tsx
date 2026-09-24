import { AvatarSprite } from '../../../core/ui/AvatarSprite';
import { ItemSprite } from '../../../core/ui/ItemSprite';
import { EmblemIcon } from '../../../core/ui/Icon';
import type { EmblemName } from '../../../core/sprites/icons';
import type { TeamScore } from '../logic/teamScoring';
import type { EnrichedRunnerView } from '../index';

/** Team-mode race track: one lane per guild, showing its members' mini-avatars running together at the team's average progress. */
export function TeamRaceTrack({
  teamScores,
  runners,
  maxScore,
}: {
  teamScores: TeamScore[];
  runners: EnrichedRunnerView[];
  maxScore: number;
}) {
  const sorted = [...teamScores].sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div className="race-track">
      <div className="race-track__bg" aria-hidden="true" style={{ backgroundImage: "url('assets/pixellab/scenes/dungeon-bg.png')" }} />
      {sorted.map((ts) => {
        const progress = Math.min(1, ts.avgScore / maxScore);
        const members = runners.filter((r) => r.teamId === ts.team.id).slice(0, 6);
        return (
          <div key={ts.team.id} className="race-track__lane">
            <span className="race-track__name" style={{ color: ts.team.color }}>
              <EmblemIcon name={ts.team.emblem as EmblemName} className="pp-icon--sm" /> {ts.team.name} · เฉลี่ย{' '}
              <span className="pixel-num">{ts.avgScore}</span>
            </span>
            <div className="race-track__rail">
              <div className="race-track__runner race-track__runner--team" style={{ left: `${progress * 88}%` }}>
                {members.map((m) => (
                  <AvatarSprite key={m.playerId} avatarId={m.avatarId} tint={m.tint} size={28} animation={progress > 0 ? 'run' : 'idle'} />
                ))}
              </div>
              <div className="race-track__chest">
                <ItemSprite id="treasure-chest" size={30} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
