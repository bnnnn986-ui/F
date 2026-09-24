import { correctAnswerPoints } from './scoring';
import {
  COUNTDOWN_MS,
  type DungeonDashAction,
  type DungeonDashState,
  type DungeonPlayerState,
  type Question,
  type QuestionPack,
  type QuizConfig,
} from './types';

/** Fisher-Yates shuffle; takes `rng` so tests can pass a deterministic one. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function selectQuestions(pack: QuestionPack, config: QuizConfig, rng: () => number = Math.random): Question[] {
  const ordered = config.shuffle ? shuffle(pack.questions, rng) : pack.questions;
  const count = config.questionCount === 'all' ? ordered.length : Math.min(config.questionCount, ordered.length);
  return ordered.slice(0, count);
}

function makePlayer(
  playerId: string,
  name: string,
  avatarId: string,
  tint: number,
  isBot: boolean,
  joinedAtIndex: number,
): DungeonPlayerState {
  return {
    playerId,
    name,
    avatarId,
    tint,
    isBot,
    connected: true,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    totalAnswerMs: 0,
    answeredCount: 0,
    joinedAtIndex,
    answers: {},
  };
}

export function createInitialState(
  config: QuizConfig,
  questions: Question[],
  players: Array<{ playerId: string; name: string; avatarId: string; tint: number; isBot?: boolean }>,
): DungeonDashState {
  const playerMap: Record<string, DungeonPlayerState> = {};
  for (const p of players) playerMap[p.playerId] = makePlayer(p.playerId, p.name, p.avatarId, p.tint, p.isBot ?? false, 0);
  return {
    phase: 'setup',
    config,
    questions,
    currentIndex: 0,
    questionStartedAt: null,
    phaseEndsAt: null,
    players: playerMap,
  };
}

/** A player counts toward "everyone answered" only if connected and not a late-joining spectator for this question. */
function isEligible(player: DungeonPlayerState, questionIndex: number): boolean {
  return player.connected && player.joinedAtIndex <= questionIndex;
}

function allEligibleAnswered(state: DungeonDashState): boolean {
  const players = Object.values(state.players);
  const eligible = players.filter((p) => isEligible(p, state.currentIndex));
  if (eligible.length === 0) return false; // nobody to wait for; timer still governs end
  return eligible.every((p) => state.currentIndex in p.answers);
}

function beginQuestion(state: DungeonDashState, now: number): DungeonDashState {
  const timeLimitMs = state.config.secondsPerQuestion * 1000;
  return {
    ...state,
    phase: 'question',
    questionStartedAt: now,
    phaseEndsAt: now + timeLimitMs,
  };
}

function toReveal(state: DungeonDashState): DungeonDashState {
  return { ...state, phase: 'reveal', phaseEndsAt: null };
}

export function dungeonDashReducer(state: DungeonDashState, action: DungeonDashAction): DungeonDashState {
  switch (action.type) {
    case 'start': {
      if (state.phase !== 'setup') return state;
      if (state.questions.length === 0) return state;
      return { ...state, phase: 'countdown', phaseEndsAt: action.now + (action.countdownMs ?? COUNTDOWN_MS) };
    }

    case 'tick': {
      if (state.phase === 'countdown' && state.phaseEndsAt !== null && action.now >= state.phaseEndsAt) {
        return beginQuestion(state, action.now);
      }
      if (state.phase === 'question' && state.phaseEndsAt !== null && action.now >= state.phaseEndsAt) {
        return toReveal(state);
      }
      return state;
    }

    case 'answer': {
      if (state.phase !== 'question' || state.phaseEndsAt === null || state.questionStartedAt === null) return state;
      if (action.now > state.phaseEndsAt) return state; // late answer, rejected
      const player = state.players[action.playerId];
      if (!player) return state;
      if (!isEligible(player, state.currentIndex)) return state; // spectator this round
      if (state.currentIndex in player.answers) return state; // one answer per question

      const question = state.questions[state.currentIndex];
      if (!question) return state;
      const elapsedMs = Math.max(0, action.now - state.questionStartedAt);
      const correct = action.choiceIndex === question.correctIndex;
      const newStreak = correct ? player.streak + 1 : 0;
      const points = correct ? correctAnswerPoints(elapsedMs, state.config.secondsPerQuestion * 1000, newStreak) : 0;

      const updatedPlayer: DungeonPlayerState = {
        ...player,
        score: player.score + points,
        streak: newStreak,
        bestStreak: Math.max(player.bestStreak, newStreak),
        correctCount: player.correctCount + (correct ? 1 : 0),
        totalAnswerMs: player.totalAnswerMs + elapsedMs,
        answeredCount: player.answeredCount + 1,
        answers: { ...player.answers, [state.currentIndex]: { choiceIndex: action.choiceIndex, correct, elapsedMs, points } },
      };

      let nextState: DungeonDashState = {
        ...state,
        players: { ...state.players, [action.playerId]: updatedPlayer },
      };

      if (allEligibleAnswered(nextState)) nextState = toReveal(nextState);
      return nextState;
    }

    case 'next': {
      if (state.phase !== 'reveal') return state;
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.questions.length) {
        return { ...state, phase: 'podium', phaseEndsAt: null };
      }
      return beginQuestion({ ...state, currentIndex: nextIndex }, action.now);
    }

    case 'end': {
      return { ...state, phase: 'podium', phaseEndsAt: null };
    }

    case 'playerJoin': {
      const existing = state.players[action.playerId];
      if (existing) {
        return { ...state, players: { ...state.players, [action.playerId]: { ...existing, connected: true } } };
      }
      // Mid-game late joiner: spectator until the next question.
      const joinedAtIndex = state.phase === 'setup' ? 0 : state.currentIndex + 1;
      const player = makePlayer(action.playerId, action.name, action.avatarId, action.tint, action.isBot, joinedAtIndex);
      return { ...state, players: { ...state.players, [action.playerId]: player } };
    }

    case 'playerLeave': {
      const existing = state.players[action.playerId];
      if (!existing) return state;
      let nextState: DungeonDashState = {
        ...state,
        players: { ...state.players, [action.playerId]: { ...existing, connected: false } },
      };
      if (state.phase === 'question' && allEligibleAnswered(nextState)) nextState = toReveal(nextState);
      return nextState;
    }

    default:
      return state;
  }
}

// ---- Selectors ----

export interface LeaderboardEntry {
  player: DungeonPlayerState;
  rank: number;
}

/** Ranked by score desc, ties broken by total answer time asc (faster wins). */
export function getLeaderboard(state: DungeonDashState): LeaderboardEntry[] {
  const sorted = Object.values(state.players).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.totalAnswerMs - b.totalAnswerMs;
  });
  return sorted.map((player, i) => ({ player, rank: i + 1 }));
}

export function getMaxPossibleScore(state: DungeonDashState): number {
  // 1000 base + up to +500 streak bonus per question, across all questions played so far.
  const questionsPlayed = state.phase === 'podium' ? state.questions.length : state.currentIndex + 1;
  return Math.max(1, questionsPlayed * 1500);
}
