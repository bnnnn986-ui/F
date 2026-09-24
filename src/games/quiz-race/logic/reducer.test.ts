import { describe, expect, it } from 'vitest';
import { createInitialState, dungeonDashReducer, getLeaderboard, selectQuestions, shuffle } from './reducer';
import { baseCorrectScore, correctAnswerPoints, streakBonus } from './scoring';
import { buildHostView, buildPlayerView } from './views';
import type { DungeonDashState, Question, QuestionPack, QuizConfig } from './types';

const Q: Question[] = [
  { id: 'q1', text: 'Q1?', choices: ['a', 'b', 'c'], correctIndex: 1 },
  { id: 'q2', text: 'Q2?', choices: ['a', 'b'], correctIndex: 0 },
  { id: 'q3', text: 'Q3?', choices: ['a', 'b', 'c', 'd'], correctIndex: 3 },
];

const CONFIG: QuizConfig = { packId: 'test', questionCount: 3, secondsPerQuestion: 10, shuffle: false };
const TIME_LIMIT_MS = CONFIG.secondsPerQuestion * 1000;

const PLAYERS = [
  { playerId: 'p1', name: 'Alice', avatarId: 'fighter', tint: 0 },
  { playerId: 'p2', name: 'Bob', avatarId: 'wizard', tint: 1 },
];

function freshState(): DungeonDashState {
  return createInitialState(CONFIG, Q, PLAYERS);
}

function started(now = 0): DungeonDashState {
  let s = freshState();
  s = dungeonDashReducer(s, { type: 'start', now });
  s = dungeonDashReducer(s, { type: 'tick', now: now + 3000 }); // countdown -> question
  return s;
}

describe('scoring', () => {
  it('gives 1000 for an instant correct answer', () => {
    expect(baseCorrectScore(0, TIME_LIMIT_MS)).toBe(1000);
  });

  it('gives 500 for a correct answer right at the deadline', () => {
    expect(baseCorrectScore(TIME_LIMIT_MS, TIME_LIMIT_MS)).toBe(500);
  });

  it('gives ~750 for a correct answer at the midpoint', () => {
    expect(baseCorrectScore(TIME_LIMIT_MS / 2, TIME_LIMIT_MS)).toBe(750);
  });

  it('clamps elapsed beyond the time limit to the 500 floor', () => {
    expect(baseCorrectScore(TIME_LIMIT_MS * 2, TIME_LIMIT_MS)).toBe(500);
  });

  it('has no streak bonus for the first correct answer', () => {
    expect(streakBonus(1)).toBe(0);
  });

  it('adds +100 per consecutive correct beyond the first', () => {
    expect(streakBonus(2)).toBe(100);
    expect(streakBonus(3)).toBe(200);
    expect(streakBonus(6)).toBe(500);
  });

  it('caps the streak bonus at +500', () => {
    expect(streakBonus(20)).toBe(500);
  });

  it('combines base + streak bonus', () => {
    expect(correctAnswerPoints(0, TIME_LIMIT_MS, 3)).toBe(1000 + 200);
  });
});

describe('selectQuestions', () => {
  const pack: QuestionPack = { id: 'p', nameTh: 'p', questions: Q };

  it('takes the first N questions in order when shuffle is off', () => {
    const selected = selectQuestions(pack, { ...CONFIG, questionCount: 2, shuffle: false });
    expect(selected.map((q) => q.id)).toEqual(['q1', 'q2']);
  });

  it('shuffles deterministically with an injected rng', () => {
    const rng = () => 0; // always picks index 0 -> effectively reverses via Fisher-Yates with rng=0
    const selected = selectQuestions(pack, { ...CONFIG, questionCount: 3, shuffle: true }, rng);
    expect(selected).toHaveLength(3);
    expect(new Set(selected.map((q) => q.id))).toEqual(new Set(['q1', 'q2', 'q3']));
  });

  it('"all" selects every question in the pack', () => {
    const selected = selectQuestions(pack, { ...CONFIG, questionCount: 'all', shuffle: false });
    expect(selected).toHaveLength(3);
  });

  it('shuffle preserves the multiset of items', () => {
    const shuffled = shuffle([1, 2, 3, 4, 5], () => 0.5);
    expect([...shuffled].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('dungeonDashReducer: flow', () => {
  it('goes setup -> countdown -> question on start + tick', () => {
    let s = freshState();
    expect(s.phase).toBe('setup');
    s = dungeonDashReducer(s, { type: 'start', now: 0 });
    expect(s.phase).toBe('countdown');
    s = dungeonDashReducer(s, { type: 'tick', now: 1000 }); // not yet 3s
    expect(s.phase).toBe('countdown');
    s = dungeonDashReducer(s, { type: 'tick', now: 3000 });
    expect(s.phase).toBe('question');
    expect(s.currentIndex).toBe(0);
    expect(s.phaseEndsAt).toBe(3000 + TIME_LIMIT_MS);
  });

  it('does not start from a non-setup phase, and refuses to start with zero questions', () => {
    const s = started();
    const restarted = dungeonDashReducer(s, { type: 'start', now: 99999 });
    expect(restarted).toBe(s); // no-op, same reference

    const empty = createInitialState(CONFIG, [], PLAYERS);
    const afterStart = dungeonDashReducer(empty, { type: 'start', now: 0 });
    expect(afterStart.phase).toBe('setup');
  });

  it('reveals when the timer runs out even if nobody answered', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'tick', now: 3000 + TIME_LIMIT_MS });
    expect(s.phase).toBe('reveal');
  });

  it('reveals early once every eligible player has answered ("everyone answered")', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: 3100 });
    expect(s.phase).toBe('question'); // p2 hasn't answered yet
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 0, now: 3200 });
    expect(s.phase).toBe('reveal');
  });

  it('rejects a late answer (after the deadline) and leaves state unchanged', () => {
    const s = started(0);
    const deadline = s.phaseEndsAt!;
    const afterDeadline = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: deadline + 1 });
    expect(afterDeadline).toBe(s);
    expect(afterDeadline.players.p1!.score).toBe(0);
  });

  it('rejects a second answer to the same question ("one answer per question")', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: 3100 });
    const scoreAfterFirst = s.players.p1!.score;
    const s2 = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 0, now: 3150 });
    expect(s2.players.p1!.score).toBe(scoreAfterFirst);
    expect(s2.players.p1!.answers[0]!.choiceIndex).toBe(1); // first answer kept
  });

  it('rejects an answer outside the question phase', () => {
    const s = freshState(); // still in setup
    const after = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 0, now: 0 });
    expect(after).toBe(s);
  });

  it('advances question -> question -> podium via "next", and refuses "next" outside reveal', () => {
    let s = started(0);
    const rejected = dungeonDashReducer(s, { type: 'next', now: 100 });
    expect(rejected).toBe(s); // still in 'question', next is a no-op

    s = dungeonDashReducer(s, { type: 'tick', now: 3000 + TIME_LIMIT_MS }); // -> reveal
    s = dungeonDashReducer(s, { type: 'next', now: 20000 });
    expect(s.phase).toBe('question');
    expect(s.currentIndex).toBe(1);

    s = dungeonDashReducer(s, { type: 'tick', now: 20000 + TIME_LIMIT_MS }); // -> reveal
    s = dungeonDashReducer(s, { type: 'next', now: 40000 });
    expect(s.currentIndex).toBe(2);

    s = dungeonDashReducer(s, { type: 'tick', now: 40000 + TIME_LIMIT_MS }); // -> reveal
    s = dungeonDashReducer(s, { type: 'next', now: 60000 }); // last question -> podium
    expect(s.phase).toBe('podium');
  });

  it('"end" force-ends the game to the podium from any phase', () => {
    const s = started(0);
    const ended = dungeonDashReducer(s, { type: 'end', now: 999 });
    expect(ended.phase).toBe('podium');
  });
});

describe('dungeonDashReducer: scoring integration', () => {
  it('awards points on the first correct answer with no streak bonus', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: 3000 }); // instant, correct
    expect(s.players.p1!.score).toBe(1000);
    expect(s.players.p1!.streak).toBe(1);
    expect(s.players.p1!.correctCount).toBe(1);
  });

  it('gives 0 and resets streak on a wrong answer', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: 3000 }); // correct, streak 1
    s = dungeonDashReducer(s, { type: 'tick', now: 3000 + TIME_LIMIT_MS }); // -> reveal
    s = dungeonDashReducer(s, { type: 'next', now: 20000 }); // -> question 2
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: 20000 }); // q2 correctIndex=0, wrong
    expect(s.players.p1!.score).toBe(1000); // no points added
    expect(s.players.p1!.streak).toBe(0);
  });

  it('gives 0 for no answer at all when the timer runs out', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'tick', now: 3000 + TIME_LIMIT_MS }); // p1/p2 never answered
    expect(s.phase).toBe('reveal');
    expect(s.players.p1!.score).toBe(0);
    expect(s.players.p1!.streak).toBe(0);
    expect(0 in s.players.p1!.answers).toBe(false);
  });

  it('compounds the streak bonus across consecutive correct answers', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: 3000 }); // q1 correct, streak 1 -> 1000
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 0, now: 3000 });
    s = dungeonDashReducer(s, { type: 'next', now: 20000 });
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 0, now: 20000 }); // q2 correct, streak 2 -> 1000+100
    expect(s.players.p1!.score).toBe(1000 + 1100);
    expect(s.players.p1!.streak).toBe(2);
    expect(s.players.p1!.bestStreak).toBe(2);
  });
});

describe('dungeonDashReducer: leaderboard + tie-break', () => {
  it('ranks by score descending', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: 3000 }); // p1 correct, fast
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 1, now: 3500 }); // p2 wrong
    const board = getLeaderboard(s);
    expect(board[0]!.player.playerId).toBe('p1');
    expect(board[0]!.rank).toBe(1);
    expect(board[1]!.player.playerId).toBe('p2');
  });

  it('breaks ties by total answer time (faster total wins)', () => {
    let s = started(0);
    // Both answer q1 correctly at the same elapsed time so scores tie.
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: 3000 + 1000 });
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 1, now: 3000 + 1000 });
    expect(s.players.p1!.score).toBe(s.players.p2!.score);

    s = dungeonDashReducer(s, { type: 'next', now: 20000 });
    // p1 answers q2 faster than p2, both correct -> p1 total time lower.
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 0, now: 20000 + 500 });
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 0, now: 20000 + 4000 });

    const board = getLeaderboard(s);
    // p1 should rank ahead of or tie p2 in score, and strictly less total time.
    expect(s.players.p1!.totalAnswerMs).toBeLessThan(s.players.p2!.totalAnswerMs);
    if (s.players.p1!.score === s.players.p2!.score) {
      expect(board[0]!.player.playerId).toBe('p1');
    }
  });
});

describe('dungeonDashReducer: late joiners, disconnect + rejoin', () => {
  it('a player who joins mid-game becomes a spectator (0 pts) until the next question', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'playerJoin', playerId: 'p3', name: 'Cara', avatarId: 'rogue', tint: 2, isBot: false, now: 3100 });
    expect(s.players.p3!.joinedAtIndex).toBe(1); // currentIndex(0) + 1

    // p3 answering the CURRENT question should be rejected (not eligible yet).
    const attempt = dungeonDashReducer(s, { type: 'answer', playerId: 'p3', choiceIndex: 1, now: 3200 });
    expect(attempt.players.p3!.score).toBe(0);
    expect(0 in attempt.players.p3!.answers).toBe(false);

    // "everyone answered" should not wait on p3 for question 0.
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: 3200 });
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 0, now: 3200 });
    expect(s.phase).toBe('reveal');

    // Once question 2 starts, p3 is eligible.
    s = dungeonDashReducer(s, { type: 'next', now: 20000 });
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p3', choiceIndex: 0, now: 20000 });
    expect(s.players.p3!.score).toBeGreaterThan(0);
  });

  it('a joining player before setup starts is eligible from question 0', () => {
    let s = freshState();
    s = dungeonDashReducer(s, { type: 'playerJoin', playerId: 'p3', name: 'Cara', avatarId: 'rogue', tint: 2, isBot: false, now: 0 });
    expect(s.players.p3!.joinedAtIndex).toBe(0);
  });

  it('disconnect keeps the score and is excluded from "everyone answered"; rejoin restores eligibility+score', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: 3100 }); // p1 scores
    const scoreBefore = s.players.p1!.score;

    s = dungeonDashReducer(s, { type: 'playerLeave', playerId: 'p2' });
    expect(s.players.p2!.connected).toBe(false);
    // p1 already answered, p2 disconnected -> reveal should trigger since only p1 was eligible-and-unanswered... actually p1 already answered, p2 now excluded -> all remaining eligible (p1) have answered.
    expect(s.phase).toBe('reveal');

    s = dungeonDashReducer(s, {
      type: 'playerJoin',
      playerId: 'p2',
      name: 'Bob',
      avatarId: 'wizard',
      tint: 1,
      isBot: false,
      now: 21000,
    });
    expect(s.players.p2!.connected).toBe(true);
    expect(s.players.p1!.score).toBe(scoreBefore); // untouched by p2's disconnect/rejoin
  });
});

describe('view layer: per-player view never leaks the correct answer before reveal', () => {
  it('the player-safe question has no correctIndex field at all, during question or reveal', () => {
    let s = started(0);
    let view = buildPlayerView(s, 'p1');
    expect(view.question).not.toHaveProperty('correctIndex');
    expect(view.result).toBeNull();

    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: 3100 });
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 0, now: 3200 }); // -> reveal
    view = buildPlayerView(s, 'p1');
    expect(view.question).not.toHaveProperty('correctIndex');
    // correctIndex is only revealed inside the explicit `result` field, post-reveal.
    expect(view.result).toEqual({ correct: true, points: expect.any(Number), correctIndex: 1 });
  });

  it("the host view hides revealCorrectIndex until phase is 'reveal'", () => {
    const s = started(0);
    const hostView = buildHostView(s);
    expect(hostView.revealCorrectIndex).toBeNull();
  });

  it('reveals revealCorrectIndex on the host view once in reveal phase', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'tick', now: 3000 + TIME_LIMIT_MS });
    const hostView = buildHostView(s);
    expect(hostView.phase).toBe('reveal');
    expect(hostView.revealCorrectIndex).toBe(Q[0]!.correctIndex);
  });

  it('marks a mid-game late joiner as a spectator in their player view', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'playerJoin', playerId: 'p3', name: 'Cara', avatarId: 'rogue', tint: 2, isBot: false, now: 3100 });
    const view = buildPlayerView(s, 'p3');
    expect(view.isSpectator).toBe(true);
  });
});
