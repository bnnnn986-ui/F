import type { Team } from '../../../core/room/protocol';
import type { DungeonDashState } from './types';

/**
 * Team ("guild") score = the AVERAGE of member points, computed fresh each
 * time from the individual per-player scores already tracked by the
 * reducer — fair for uneven team sizes, and keeps the core reducer
 * completely unaware of teams (individual scoring stays the single source
 * of truth, which the report also needs).
 */
export interface TeamScore {
  team: Team;
  memberCount: number;
  /** Average of member scores so far, rounded to the nearest point for display. */
  avgScore: number;
  /** Highest individual scorer on the team ("MVP ของกิลด์"). */
  mvpPlayerId: string | null;
}

export function computeTeamScores(
  state: DungeonDashState,
  teams: Team[],
  playerTeamOf: (playerId: string) => string | null,
): TeamScore[] {
  const byTeam = new Map<string, string[]>(); // teamId -> playerIds
  for (const player of Object.values(state.players)) {
    const teamId = playerTeamOf(player.playerId);
    if (!teamId) continue;
    const list = byTeam.get(teamId) ?? [];
    list.push(player.playerId);
    byTeam.set(teamId, list);
  }

  return teams.map((team) => {
    const memberIds = byTeam.get(team.id) ?? [];
    const members = memberIds.map((id) => state.players[id]).filter((p): p is NonNullable<typeof p> => !!p);
    const totalScore = members.reduce((sum, p) => sum + p.score, 0);
    const avgScore = members.length > 0 ? Math.round(totalScore / members.length) : 0;
    let mvp: (typeof members)[number] | null = null;
    for (const m of members) {
      if (!mvp || m.score > mvp.score) mvp = m;
    }
    return { team, memberCount: members.length, avgScore, mvpPlayerId: mvp?.playerId ?? null };
  });
}

/** Team-mode "progress" for the race track: average score / max possible, same scale as individual progress. */
export function teamProgress(teamScore: TeamScore, maxPossibleScore: number): number {
  return Math.min(1, teamScore.avgScore / maxPossibleScore);
}
