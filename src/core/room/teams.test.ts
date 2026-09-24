import { describe, expect, it } from 'vitest';
import { balancedAssign, createTeams, smallestTeam } from './teams';

describe('createTeams', () => {
  it('clamps to 2-6 teams', () => {
    expect(createTeams(1)).toHaveLength(2);
    expect(createTeams(4)).toHaveLength(4);
    expect(createTeams(9)).toHaveLength(6);
  });

  it('gives every team a distinct id, tint and colour', () => {
    const teams = createTeams(6);
    expect(new Set(teams.map((t) => t.id)).size).toBe(6);
    expect(new Set(teams.map((t) => t.tint)).size).toBe(6);
    expect(new Set(teams.map((t) => t.color)).size).toBe(6);
  });
});

describe('balancedAssign', () => {
  it('assigns every player to some team', () => {
    const teams = createTeams(3);
    const players = Array.from({ length: 10 }, (_, i) => `p${i}`);
    const assignment = balancedAssign(players, teams, () => 0.5);
    expect(assignment.size).toBe(10);
    for (const p of players) expect(teams.some((t) => t.id === assignment.get(p))).toBe(true);
  });

  it('splits players evenly (within 1) across teams', () => {
    const teams = createTeams(2);
    const players = Array.from({ length: 9 }, (_, i) => `p${i}`);
    const assignment = balancedAssign(players, teams, () => 0.3);
    const counts = teams.map((t) => [...assignment.values()].filter((id) => id === t.id).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('is deterministic for a fixed rng', () => {
    const teams = createTeams(2);
    const players = ['a', 'b', 'c', 'd'];
    const a = balancedAssign(players, teams, () => 0.1);
    const b = balancedAssign(players, teams, () => 0.1);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });
});

describe('smallestTeam', () => {
  it('picks the team with the fewest members for a late joiner', () => {
    const teams = createTeams(2);
    const assignment = new Map([
      ['a', teams[0]!.id],
      ['b', teams[0]!.id],
      ['c', teams[1]!.id],
    ]);
    expect(smallestTeam(teams, assignment).id).toBe(teams[1]!.id);
  });

  it('falls back to the first team when all are empty', () => {
    const teams = createTeams(3);
    expect(smallestTeam(teams, new Map()).id).toBe(teams[0]!.id);
  });
});
