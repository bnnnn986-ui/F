import { PixelPanel } from '../core/ui/PixelPanel';
import { DecorSprite } from '../core/ui/DecorSprite';
import type { PartyScoreEntry } from '../core/room/protocol';

/** Cumulative-score mini leaderboard, shown in the party lobby once at least one game has ended. */
export function PartyScoreboard({ scores }: { scores: PartyScoreEntry[] }) {
  if (scores.length === 0) return null;
  return (
    <PixelPanel dark className="party-scoreboard">
      <h2>
        <DecorSprite id="trophy" size={28} /> แชมป์ประจำงาน
      </h2>
      <ol className="party-scoreboard__list">
        {scores.map((s, i) => (
          <li key={s.playerId}>
            <span className="party-scoreboard__rank">#{i + 1}</span>
            <span className="party-scoreboard__name">{s.name}</span>
            <span className="party-scoreboard__total">{s.total} คะแนน</span>
          </li>
        ))}
      </ol>
    </PixelPanel>
  );
}
