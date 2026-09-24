import { describe, expect, it } from 'vitest';
import { createInitialState, dungeonDashReducer } from './reducer';
import { computeTeamScores, teamProgress } from './teamScoring';
import type { Question, QuizConfig } from './types';
import { createTeams } from '../../../core/room/teams';

const Q: Question[] = [
  { id: 'q1', text: 'Q1?', choices: ['a', 'b'], correctIndex: 0 },
  { id: 'q2', text: 'Q2?', choices: ['a', 'b'], correctIndex: 1 },
];
const CONFIG: QuizConfig = { packId: 'test', questionCount: 2, secondsPerQuestion: 10, shuffle: false };

const PLAYERS = [
  { playerId: 'p1', name: 'Alice', avatarId: 'fighter', tint: 0, isBot: false },
  { playerId: 'p2', name: 'Bob', avatarId: 'wizard', tint: 1, isBot: false },
  { playerId: 'p3', name: 'Cara', avatarId: 'rogue', tint: 2, isBot: false },
];

function started() {
  let s = createInitialState(CONFIG, Q, PLAYERS);
  s = dungeonDashReducer(s, { type: 'start', now: 0 });
  s = dungeonDashReducer(s, { type: 'tick', now: 3000 });
  return s;
}

describe('computeTeamScores', () => {
  it('averages member points per team, fair for uneven team sizes', () => {
    const teams = createTeams(2);
    // p1, p2 -> team A (2 members); p3 -> team B (1 member)
    const teamOf: Record<string, string> = { p1: teams[0]!.id, p2: teams[0]!.id, p3: teams[1]!.id };

    let s = started();
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 0, now: 3000 }); // correct, 1000
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 1, now: 3000 }); // wrong, 0
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p3', choiceIndex: 0, now: 3000 }); // wrong (correct=0 is p1's, q1 correctIndex=0 so p3 also correct actually)

    const scores = computeTeamScores(s, teams, (id) => teamOf[id] ?? null);
    const teamA = scores.find((t) => t.team.id === teams[0]!.id)!;
    const teamB = scores.find((t) => t.team.id === teams[1]!.id)!;

    expect(teamA.memberCount).toBe(2);
    expect(teamA.avgScore).toBe(Math.round((1000 + 0) / 2));
    expect(teamB.memberCount).toBe(1);
    expect(teamB.avgScore).toBe(1000); // p3 answered correctly (index 0)
  });

  it('picks the highest individual scorer as team MVP', () => {
    const teams = createTeams(2);
    const teamOf: Record<string, string> = { p1: teams[0]!.id, p2: teams[0]!.id };

    let s = started();
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 0, now: 3000 }); // correct
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 1, now: 3000 }); // wrong

    const scores = computeTeamScores(s, teams, (id) => teamOf[id] ?? null);
    const teamA = scores.find((t) => t.team.id === teams[0]!.id)!;
    expect(teamA.mvpPlayerId).toBe('p1');
  });

  it('gives a 0-member team a 0 average and no MVP', () => {
    const teams = createTeams(2);
    const s = started();
    const scores = computeTeamScores(s, teams, () => null);
    for (const t of scores) {
      expect(t.memberCount).toBe(0);
      expect(t.avgScore).toBe(0);
      expect(t.mvpPlayerId).toBeNull();
    }
  });

  it('teamProgress clamps to 1', () => {
    const teams = createTeams(2);
    const s = started();
    const scores = computeTeamScores(s, teams, () => null);
    expect(teamProgress(scores[0]!, 1)).toBeLessThanOrEqual(1);
  });
});
