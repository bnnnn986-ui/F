import { PixelPanel } from '../core/ui/PixelPanel';
import { ItemSprite } from '../core/ui/ItemSprite';
import type { PartyScoreEntry, PartyTeamScoreEntry } from '../core/room/protocol';

/** Cumulative-score mini leaderboard, shown in the party lobby once at least one game has ended. */
export function PartyScoreboard({
  scores,
  teamScores = [],
}: {
  scores: PartyScoreEntry[];
  teamScores?: PartyTeamScoreEntry[];
}) {
  if (scores.length === 0 && teamScores.length === 0) return null;
  return (
    <PixelPanel dark className="party-scoreboard">
      <h2>
        <ItemSprite id="trophy" size={28} /> ตำนานประจำงาน
      </h2>

      {teamScores.length > 0 && (
        <>
          <p className="party-scoreboard__subhead">คะแนนกิลด์</p>
          <ol className="party-scoreboard__list">
            {teamScores.map((s, i) => (
              <li key={s.teamId}>
                <span className="party-scoreboard__rank">#{i + 1}</span>
                <span className="party-scoreboard__name" style={{ color: s.color }}>
                  {s.name}
                </span>
                <span className="party-scoreboard__total">{s.total} คะแนน</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {scores.length > 0 && (
        <>
          {teamScores.length > 0 && <p className="party-scoreboard__subhead">คะแนนนักผจญภัย</p>}
          <ol className="party-scoreboard__list">
            {scores.map((s, i) => (
              <li key={s.playerId}>
                <span className="party-scoreboard__rank">#{i + 1}</span>
                <span className="party-scoreboard__name">{s.name}</span>
                <span className="party-scoreboard__total">{s.total} คะแนน</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </PixelPanel>
  );
}
