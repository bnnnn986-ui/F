/**
 * Generic team ("guild") support for the room runtime. Kept game-agnostic
 * here — any game can read `RoomPlayer.teamId` / the room's `teams` list
 * via `GameHostContext` and do its own team-aware scoring (see
 * `games/quiz-race/logic/teamScoring.ts` for the Dungeon Dash example).
 */

export interface Team {
  id: string;
  name: string;
  /** CSS colour for the team banner/swatch. */
  color: string;
  /** Which avatar recolor tint (0-7) this team's colour corresponds to, for "ใช้สีทีม". */
  tint: number;
  /**
   * The `EmblemName` (from `core/sprites/icons.ts`) to render as this
   * team's heraldic shield — kept as a plain string here so this module
   * stays free of sprite/canvas deps; UI renders it via `<EmblemIcon>`.
   */
  emblem: string;
}

/** Up to 6 teams; ids are stable so player assignments survive a team-count change that keeps a team. */
export const DEFAULT_TEAM_POOL: Team[] = [
  { id: 'team-red', name: 'กิลด์มังกรแดง', color: '#e8552f', tint: 4, emblem: 'dragon' },
  { id: 'team-blue', name: 'กิลด์หมาป่าฟ้า', color: '#3a8fd4', tint: 1, emblem: 'wolf' },
  { id: 'team-green', name: 'กิลด์นกฮูกเขียว', color: '#4fae5e', tint: 5, emblem: 'owl' },
  { id: 'team-gold', name: 'กิลด์สิงโตทอง', color: '#e8b23d', tint: 7, emblem: 'lion' },
  { id: 'team-purple', name: 'กิลด์งูม่วง', color: '#9d5bd6', tint: 2, emblem: 'snake' },
  { id: 'team-pink', name: 'กิลด์กระต่ายชมพู', color: '#e85b9e', tint: 3, emblem: 'rabbit' },
];

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 6;

/** Builds `count` teams (2-6) from the front of the default pool. */
export function createTeams(count: number): Team[] {
  const clamped = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, count));
  return DEFAULT_TEAM_POOL.slice(0, clamped).map((t) => ({ ...t }));
}

/** The team with the fewest current members (ties broken by pool order) — used for late joiners/bots. */
export function smallestTeam(teams: Team[], assignment: ReadonlyMap<string, string>): Team {
  const counts = new Map<string, number>(teams.map((t) => [t.id, 0]));
  for (const teamId of assignment.values()) {
    if (counts.has(teamId)) counts.set(teamId, (counts.get(teamId) ?? 0) + 1);
  }
  let best = teams[0]!;
  let bestCount = counts.get(best.id) ?? 0;
  for (const t of teams) {
    const c = counts.get(t.id) ?? 0;
    if (c < bestCount) {
      best = t;
      bestCount = c;
    }
  }
  return best;
}

/**
 * Rebuilds a full assignment for `playerIds` across `teams` as evenly as
 * possible ("สุ่มแบ่งทีม"). Deterministic given `rng`, so it's unit-testable.
 */
export function balancedAssign(
  playerIds: string[],
  teams: Team[],
  rng: () => number = Math.random,
): Map<string, string> {
  const shuffled = [...playerIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  const assignment = new Map<string, string>();
  shuffled.forEach((playerId, i) => {
    const team = teams[i % teams.length]!;
    assignment.set(playerId, team.id);
  });
  return assignment;
}

export function getTeam(teams: Team[], teamId: string | null | undefined): Team | undefined {
  return teams.find((t) => t.id === teamId);
}
