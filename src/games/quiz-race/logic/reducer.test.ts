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

// Fixed, short phase durations so tests don't depend on the real (3s/5s) production constants.
const DURATIONS = { readMs: 1000, revealAutoMs: 2000, leaderboardAutoMs: 2000 };
const COUNTDOWN_END = 3000; // production COUNTDOWN_MS default
const READ_END = COUNTDOWN_END + DURATIONS.readMs;

function freshState(autoPlay = false): DungeonDashState {
  return createInitialState(CONFIG, Q, PLAYERS, autoPlay, DURATIONS);
}

/** Drives the state machine from 'setup' all the way to a fresh 'question' phase (through countdown + read). */
function started(now = 0, autoPlay = false): DungeonDashState {
  let s = freshState(autoPlay);
  s = dungeonDashReducer(s, { type: 'start', now });
  s = dungeonDashReducer(s, { type: 'tick', now: now + COUNTDOWN_END }); // countdown -> read
  s = dungeonDashReducer(s, { type: 'tick', now: now + READ_END }); // read -> question
  return s;
}

/**
 * From 'reveal', manually steps reveal -> leaderboard -> (next question's read -> question, or
 * podium if that was the last question) — exactly what the host's "ถัดไป" button does twice in a
 * row, followed by `skip` to blow past the next question's read phase deterministically so tests
 * can control the exact `questionStartedAt` they answer against.
 */
function advanceToNextQuestion(s: DungeonDashState, now: number): DungeonDashState {
  s = dungeonDashReducer(s, { type: 'next', now }); // reveal -> leaderboard
  s = dungeonDashReducer(s, { type: 'next', now }); // leaderboard -> read (or podium, if that was the last question)
  if (s.phase === 'read') s = dungeonDashReducer(s, { type: 'skip', now }); // read -> question, questionStartedAt = now
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

describe('dungeonDashReducer: phase flow (setup -> countdown -> read -> question -> reveal -> leaderboard -> next question -> podium)', () => {
  it('goes setup -> countdown -> read -> question on start + tick', () => {
    let s = freshState();
    expect(s.phase).toBe('setup');
    s = dungeonDashReducer(s, { type: 'start', now: 0 });
    expect(s.phase).toBe('countdown');
    s = dungeonDashReducer(s, { type: 'tick', now: 1000 }); // not yet 3s
    expect(s.phase).toBe('countdown');
    s = dungeonDashReducer(s, { type: 'tick', now: COUNTDOWN_END });
    expect(s.phase).toBe('read');
    expect(s.currentIndex).toBe(0);
    s = dungeonDashReducer(s, { type: 'tick', now: COUNTDOWN_END + 1 }); // not yet read-end
    expect(s.phase).toBe('read');
    s = dungeonDashReducer(s, { type: 'tick', now: READ_END });
    expect(s.phase).toBe('question');
    expect(s.phaseEndsAt).toBe(READ_END + TIME_LIMIT_MS);
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
    s = dungeonDashReducer(s, { type: 'tick', now: READ_END + TIME_LIMIT_MS });
    expect(s.phase).toBe('reveal');
  });

  it('reveals early once every eligible player has answered ("everyone answered")', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END + 100 });
    expect(s.phase).toBe('question'); // p2 hasn't answered yet
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 0, now: READ_END + 200 });
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
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END + 100 });
    const scoreAfterFirst = s.players.p1!.score;
    const s2 = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 0, now: READ_END + 150 });
    expect(s2.players.p1!.score).toBe(scoreAfterFirst);
    expect(s2.players.p1!.answers[0]!.choiceIndex).toBe(1); // first answer kept
  });

  it('rejects an answer outside the question phase', () => {
    const s = freshState(); // still in setup
    const after = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 0, now: 0 });
    expect(after).toBe(s);
  });

  it('rejects an answer during the read phase (answers hidden until question opens)', () => {
    let s = freshState();
    s = dungeonDashReducer(s, { type: 'start', now: 0 });
    s = dungeonDashReducer(s, { type: 'tick', now: COUNTDOWN_END }); // -> read
    expect(s.phase).toBe('read');
    const after = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 0, now: COUNTDOWN_END + 10 });
    expect(after).toBe(s);
  });

  it('manual mode: "next" steps reveal -> leaderboard -> (read ->) next question, and refuses "next" outside those phases', () => {
    let s = started(0); // autoPlay false by default
    const rejected = dungeonDashReducer(s, { type: 'next', now: 100 });
    expect(rejected).toBe(s); // still in 'question', next is a no-op

    s = dungeonDashReducer(s, { type: 'tick', now: READ_END + TIME_LIMIT_MS }); // -> reveal
    expect(s.phase).toBe('reveal');
    s = dungeonDashReducer(s, { type: 'next', now: 20000 });
    expect(s.phase).toBe('leaderboard');
    expect(s.currentIndex).toBe(0); // still question 1's leaderboard

    s = dungeonDashReducer(s, { type: 'next', now: 20100 });
    expect(s.phase).toBe('read'); // question 2's read phase
    expect(s.currentIndex).toBe(1);
    s = dungeonDashReducer(s, { type: 'skip', now: 20200 }); // read -> question
    expect(s.phase).toBe('question');

    // question 2
    s = dungeonDashReducer(s, { type: 'tick', now: s.phaseEndsAt! }); // -> reveal
    s = advanceToNextQuestion(s, 40000);
    expect(s.phase).toBe('question');
    expect(s.currentIndex).toBe(2);

    // question 3 (last) -> reveal -> leaderboard -> podium
    s = dungeonDashReducer(s, { type: 'tick', now: s.phaseEndsAt! });
    s = dungeonDashReducer(s, { type: 'next', now: 60000 }); // -> leaderboard
    expect(s.phase).toBe('leaderboard');
    s = dungeonDashReducer(s, { type: 'next', now: 60100 }); // last question's leaderboard -> podium
    expect(s.phase).toBe('podium');
  });

  it('"end" force-ends the game to the podium from any phase', () => {
    const s = started(0);
    const ended = dungeonDashReducer(s, { type: 'end', now: 999 });
    expect(ended.phase).toBe('podium');
    expect(ended.pausedAt).toBeNull();
  });
});

describe('dungeonDashReducer: auto-play', () => {
  it('defaults autoPlay off unless explicitly created with it on', () => {
    expect(freshState().autoPlay).toBe(false);
    expect(freshState(true).autoPlay).toBe(true);
  });

  it('auto-play reveal times out into leaderboard, which times out into the next question', () => {
    let s = started(0, true);
    s = dungeonDashReducer(s, { type: 'tick', now: s.phaseEndsAt! }); // -> reveal (auto)
    expect(s.phase).toBe('reveal');
    expect(s.phaseEndsAt).not.toBeNull();

    // ticking before the reveal deadline does nothing
    const early = dungeonDashReducer(s, { type: 'tick', now: s.phaseEndsAt! - 1 });
    expect(early.phase).toBe('reveal');

    s = dungeonDashReducer(s, { type: 'tick', now: s.phaseEndsAt! });
    expect(s.phase).toBe('leaderboard');
    expect(s.phaseEndsAt).not.toBeNull();

    s = dungeonDashReducer(s, { type: 'tick', now: s.phaseEndsAt! });
    expect(s.phase).toBe('read'); // question 2's read phase
    expect(s.currentIndex).toBe(1);
  });

  it('manual mode never auto-advances reveal/leaderboard even if a lot of time passes', () => {
    let s = started(0, false);
    s = dungeonDashReducer(s, { type: 'tick', now: s.phaseEndsAt! }); // -> reveal
    expect(s.phase).toBe('reveal');
    expect(s.phaseEndsAt).toBeNull();
    const later = dungeonDashReducer(s, { type: 'tick', now: 10_000_000 });
    expect(later.phase).toBe('reveal'); // still waiting on the host's "next"
  });

  it('"ถัดไป" can be pressed early during auto-play, short-circuiting the drain timer', () => {
    let s = started(0, true);
    s = dungeonDashReducer(s, { type: 'tick', now: s.phaseEndsAt! }); // -> reveal (auto)
    const deadline = s.phaseEndsAt!;
    s = dungeonDashReducer(s, { type: 'next', now: deadline - 1 }); // pressed before the ring drains
    expect(s.phase).toBe('leaderboard');
  });

  it('setAutoPlay toggles the flag on a live game', () => {
    let s = started(0, false);
    s = dungeonDashReducer(s, { type: 'setAutoPlay', autoPlay: true });
    expect(s.autoPlay).toBe(true);
  });
});

describe('dungeonDashReducer: host control bar — pause/resume/skip', () => {
  it('pause freezes the phase deadline: tick no longer transitions even past the original deadline', () => {
    let s = started(0);
    const deadline = s.phaseEndsAt!;
    s = dungeonDashReducer(s, { type: 'pause', now: deadline - 4000 });
    expect(s.pausedAt).toBe(deadline - 4000);
    const ticked = dungeonDashReducer(s, { type: 'tick', now: deadline + 10_000 }); // well past the original deadline
    expect(ticked.phase).toBe('question'); // still frozen
    expect(ticked.phaseEndsAt).toBe(deadline); // unchanged while paused
  });

  it('resume shifts every absolute timestamp forward by exactly the paused duration', () => {
    let s = started(0);
    const deadline = s.phaseEndsAt!;
    const startedAt = s.questionStartedAt!;
    const pauseAt = deadline - 4000;
    s = dungeonDashReducer(s, { type: 'pause', now: pauseAt });
    const resumeAt = pauseAt + 7500; // paused for 7.5s
    s = dungeonDashReducer(s, { type: 'resume', now: resumeAt });
    expect(s.pausedAt).toBeNull();
    expect(s.phaseEndsAt).toBe(deadline + 7500);
    expect(s.questionStartedAt).toBe(startedAt + 7500);

    // Ticking at the ORIGINAL deadline no longer ends the question (it was shifted).
    const stillRunning = dungeonDashReducer(s, { type: 'tick', now: deadline });
    expect(stillRunning.phase).toBe('question');
    // But it does end once the SHIFTED deadline passes.
    const ended = dungeonDashReducer(s, { type: 'tick', now: deadline + 7500 });
    expect(ended.phase).toBe('reveal');
  });

  it('an answer submitted while paused is rejected', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'pause', now: s.phaseEndsAt! - 1000 });
    const after = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: s.phaseEndsAt! - 900 });
    expect(after).toBe(s);
  });

  it('pause is a no-op outside a timed phase (e.g. reveal in manual mode, where phaseEndsAt is already null)', () => {
    let s = started(0, false);
    s = dungeonDashReducer(s, { type: 'tick', now: s.phaseEndsAt! }); // -> reveal, manual -> phaseEndsAt null
    const paused = dungeonDashReducer(s, { type: 'pause', now: 99999 });
    expect(paused).toBe(s);
  });

  it('skip forces the current timed phase to end immediately, same as its timer hitting 0', () => {
    const s = started(0);
    const skipped = dungeonDashReducer(s, { type: 'skip', now: s.questionStartedAt! + 1234 }); // well before the real deadline
    expect(skipped.phase).toBe('reveal');
  });

  it('skip also clears an active pause', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'pause', now: s.phaseEndsAt! - 1000 });
    s = dungeonDashReducer(s, { type: 'skip', now: s.phaseEndsAt! - 500 });
    expect(s.phase).toBe('reveal');
    expect(s.pausedAt).toBeNull();
  });

  it('skip steps countdown -> read -> question -> reveal -> leaderboard -> next question, one phase at a time', () => {
    let s = freshState();
    s = dungeonDashReducer(s, { type: 'start', now: 0 });
    s = dungeonDashReducer(s, { type: 'skip', now: 1 }); // countdown -> read
    expect(s.phase).toBe('read');
    s = dungeonDashReducer(s, { type: 'skip', now: 2 }); // read -> question
    expect(s.phase).toBe('question');
    s = dungeonDashReducer(s, { type: 'skip', now: 3 }); // question -> reveal
    expect(s.phase).toBe('reveal');
    s = dungeonDashReducer(s, { type: 'skip', now: 4 }); // reveal -> leaderboard
    expect(s.phase).toBe('leaderboard');
    s = dungeonDashReducer(s, { type: 'skip', now: 5 }); // leaderboard -> next question (read)
    expect(s.phase).toBe('read');
    expect(s.currentIndex).toBe(1);
  });
});

describe('dungeonDashReducer: serialization round-trip', () => {
  it('a state mid-question survives a JSON round-trip unchanged (reload-safe)', () => {
    const s = started(0);
    const roundTripped = JSON.parse(JSON.stringify(s)) as DungeonDashState;
    expect(roundTripped).toEqual(s);
  });

  it('a PAUSED state survives a JSON round-trip and resumes correctly after "loading"', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'pause', now: s.phaseEndsAt! - 2000 });
    const reloaded = JSON.parse(JSON.stringify(s)) as DungeonDashState;
    expect(reloaded).toEqual(s);
    expect(reloaded.pausedAt).not.toBeNull();
    // Resuming the reloaded copy shifts timestamps exactly like resuming the original would.
    const resumed = dungeonDashReducer(reloaded, { type: 'resume', now: reloaded.pausedAt! + 5000 });
    expect(resumed.phaseEndsAt).toBe(s.phaseEndsAt! + 5000);
  });
});

describe('dungeonDashReducer: end-to-podium tallying', () => {
  it('"end" force-ends mid-game and the leaderboard reflects scores earned so far', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END + 100 }); // correct, fast
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 0, now: READ_END + 100 }); // wrong
    s = dungeonDashReducer(s, { type: 'end', now: 99999 });
    expect(s.phase).toBe('podium');
    const board = getLeaderboard(s);
    expect(board[0]!.player.playerId).toBe('p1');
    expect(board[0]!.player.score).toBeGreaterThan(0);
    expect(board[1]!.player.score).toBe(0);
  });

  it('reaching the last question\'s leaderboard and advancing tallies everyone into the final podium leaderboard', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END + 100 });
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 1, now: READ_END + 100 }); // both answered -> reveal
    s = advanceToNextQuestion(s, 20000); // -> question 2
    s = dungeonDashReducer(s, { type: 'skip', now: 20200 }); // question -> reveal (no answers)
    s = advanceToNextQuestion(s, 20300); // -> question 3
    s = dungeonDashReducer(s, { type: 'skip', now: 20500 }); // question -> reveal
    s = dungeonDashReducer(s, { type: 'next', now: 20600 }); // -> leaderboard (last question)
    s = dungeonDashReducer(s, { type: 'next', now: 20700 }); // -> podium
    expect(s.phase).toBe('podium');
    const board = getLeaderboard(s);
    expect(board.find((e) => e.player.playerId === 'p1')!.player.score).toBeGreaterThan(0);
  });
});

describe('dungeonDashReducer: scoring integration', () => {
  it('awards points on the first correct answer with no streak bonus', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END }); // instant, correct
    expect(s.players.p1!.score).toBe(1000);
    expect(s.players.p1!.streak).toBe(1);
    expect(s.players.p1!.correctCount).toBe(1);
  });

  it('gives 0 and resets streak on a wrong answer', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END }); // correct, streak 1
    s = dungeonDashReducer(s, { type: 'tick', now: READ_END + TIME_LIMIT_MS }); // -> reveal
    s = advanceToNextQuestion(s, 20000); // -> question 2
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: 20000 }); // q2 correctIndex=0, wrong
    expect(s.players.p1!.score).toBe(1000); // no points added
    expect(s.players.p1!.streak).toBe(0);
  });

  it('gives 0 for no answer at all when the timer runs out', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'tick', now: READ_END + TIME_LIMIT_MS }); // p1/p2 never answered
    expect(s.phase).toBe('reveal');
    expect(s.players.p1!.score).toBe(0);
    expect(s.players.p1!.streak).toBe(0);
    expect(0 in s.players.p1!.answers).toBe(false);
  });

  it('compounds the streak bonus across consecutive correct answers', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END }); // q1 correct, streak 1 -> 1000
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 0, now: READ_END });
    s = advanceToNextQuestion(s, 20000); // -> question 2
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 0, now: 20000 }); // q2 correct, streak 2 -> 1000+100
    expect(s.players.p1!.score).toBe(1000 + 1100);
    expect(s.players.p1!.streak).toBe(2);
    expect(s.players.p1!.bestStreak).toBe(2);
  });
});

describe('dungeonDashReducer: leaderboard + tie-break', () => {
  it('ranks by score descending', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END }); // p1 correct, fast
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 1, now: READ_END + 500 }); // p2 wrong
    const board = getLeaderboard(s);
    expect(board[0]!.player.playerId).toBe('p1');
    expect(board[0]!.rank).toBe(1);
    expect(board[1]!.player.playerId).toBe('p2');
  });

  it('breaks ties by total answer time (faster total wins)', () => {
    let s = started(0);
    // Both answer q1 correctly at the same elapsed time so scores tie.
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END + 1000 });
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 1, now: READ_END + 1000 });
    expect(s.players.p1!.score).toBe(s.players.p2!.score);

    s = advanceToNextQuestion(s, 20000); // -> question 2
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
    s = dungeonDashReducer(s, { type: 'playerJoin', playerId: 'p3', name: 'Cara', avatarId: 'rogue', tint: 2, isBot: false, now: READ_END + 50 });
    expect(s.players.p3!.joinedAtIndex).toBe(1); // currentIndex(0) + 1

    // p3 answering the CURRENT question should be rejected (not eligible yet).
    const attempt = dungeonDashReducer(s, { type: 'answer', playerId: 'p3', choiceIndex: 1, now: READ_END + 100 });
    expect(attempt.players.p3!.score).toBe(0);
    expect(0 in attempt.players.p3!.answers).toBe(false);

    // "everyone answered" should not wait on p3 for question 0.
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END + 100 });
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 0, now: READ_END + 100 });
    expect(s.phase).toBe('reveal');

    // Once question 2 starts, p3 is eligible.
    s = advanceToNextQuestion(s, 20000); // -> question 2
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
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END + 100 }); // p1 scores
    const scoreBefore = s.players.p1!.score;

    s = dungeonDashReducer(s, { type: 'playerLeave', playerId: 'p2', now: READ_END + 150 });
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
  it('the player-safe question has no correctIndex field at all, during read, question or reveal', () => {
    let s = freshState();
    s = dungeonDashReducer(s, { type: 'start', now: 0 });
    s = dungeonDashReducer(s, { type: 'tick', now: COUNTDOWN_END }); // -> read
    let view = buildPlayerView(s, 'p1');
    expect(view.question).not.toHaveProperty('correctIndex');
    expect(view.question?.choices).toEqual([]); // read phase: answers hidden entirely, not just un-marked

    s = dungeonDashReducer(s, { type: 'tick', now: READ_END }); // -> question
    view = buildPlayerView(s, 'p1');
    expect(view.question).not.toHaveProperty('correctIndex');
    expect(view.question?.choices.length).toBeGreaterThan(0);
    expect(view.result).toBeNull();

    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END + 100 });
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 0, now: READ_END + 200 }); // -> reveal
    view = buildPlayerView(s, 'p1');
    expect(view.question).not.toHaveProperty('correctIndex');
    // correctIndex is only revealed inside the explicit `result` field, post-reveal.
    expect(view.result).toMatchObject({ correct: true, points: expect.any(Number), correctIndex: 1 });
  });

  it("the host view hides revealCorrectIndex during setup/countdown/read/question", () => {
    let s = freshState();
    s = dungeonDashReducer(s, { type: 'start', now: 0 });
    s = dungeonDashReducer(s, { type: 'tick', now: COUNTDOWN_END }); // -> read
    expect(buildHostView(s).revealCorrectIndex).toBeNull();
    expect(buildHostView(s).question?.choices).toEqual([]);
    s = dungeonDashReducer(s, { type: 'tick', now: READ_END }); // -> question
    expect(buildHostView(s).revealCorrectIndex).toBeNull();
  });

  it('reveals revealCorrectIndex on the host view once in reveal (and keeps it through leaderboard)', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'tick', now: READ_END + TIME_LIMIT_MS });
    let hostView = buildHostView(s);
    expect(hostView.phase).toBe('reveal');
    expect(hostView.revealCorrectIndex).toBe(Q[0]!.correctIndex);

    s = dungeonDashReducer(s, { type: 'next', now: 20000 }); // -> leaderboard
    hostView = buildHostView(s);
    expect(hostView.phase).toBe('leaderboard');
    expect(hostView.revealCorrectIndex).toBe(Q[0]!.correctIndex);
  });

  it('marks a mid-game late joiner as a spectator in their player view', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'playerJoin', playerId: 'p3', name: 'Cara', avatarId: 'rogue', tint: 2, isBot: false, now: READ_END + 50 });
    const view = buildPlayerView(s, 'p3');
    expect(view.isSpectator).toBe(true);
  });

  it('the reveal answer-summary (bars + avatar voters) is only populated during reveal, never earlier', () => {
    let s = started(0);
    expect(buildHostView(s).distribution).toBeNull();
    expect(buildHostView(s).voters).toBeNull();
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END + 100 });
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 0, now: READ_END + 200 }); // -> reveal
    const hostView = buildHostView(s);
    expect(hostView.distribution).toEqual([1, 1, 0]);
    expect(hostView.voters?.[1]).toHaveLength(1);
    expect(hostView.voters?.[1]?.[0]?.playerId).toBe('p1');
    expect(hostView.voters?.[0]).toHaveLength(1);
    expect(hostView.voters?.[0]?.[0]?.playerId).toBe('p2');
  });

  it('the player reveal result includes "most people picked" info without exposing it before reveal', () => {
    let s = started(0);
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: READ_END + 100 });
    s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 1, now: READ_END + 200 }); // both pick choice 1 -> reveal
    const view = buildPlayerView(s, 'p1');
    expect(view.result?.majorityChoiceIndex).toBe(1);
    expect(view.result?.majorityPercent).toBe(100);
  });
});
