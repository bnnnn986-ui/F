import { correctAnswerPoints } from './scoring';
import {
  COUNTDOWN_MS,
  LEADERBOARD_AUTO_MS,
  READ_MS,
  REVEAL_AUTO_MS,
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
  autoPlay = false,
  phaseDurations?: { readMs?: number; revealAutoMs?: number; leaderboardAutoMs?: number },
): DungeonDashState {
  const playerMap: Record<string, DungeonPlayerState> = {};
  for (const p of players) playerMap[p.playerId] = makePlayer(p.playerId, p.name, p.avatarId, p.tint, p.isBot ?? false, 0);
  return {
    phase: 'setup',
    config,
    questions,
    currentIndex: 0,
    autoPlay,
    readMs: phaseDurations?.readMs ?? READ_MS,
    revealAutoMs: phaseDurations?.revealAutoMs ?? REVEAL_AUTO_MS,
    leaderboardAutoMs: phaseDurations?.leaderboardAutoMs ?? LEADERBOARD_AUTO_MS,
    questionStartedAt: null,
    phaseEndsAt: null,
    pausedAt: null,
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

function toRead(state: DungeonDashState, now: number): DungeonDashState {
  return { ...state, phase: 'read', questionStartedAt: null, phaseEndsAt: now + READ_MS };
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

/** Auto-play gets a timed deadline (so `tick` can advance it); manual mode waits for the host's "next". */
function toReveal(state: DungeonDashState, now: number): DungeonDashState {
  return { ...state, phase: 'reveal', phaseEndsAt: state.autoPlay ? now + REVEAL_AUTO_MS : null };
}

function toLeaderboard(state: DungeonDashState, now: number): DungeonDashState {
  return { ...state, phase: 'leaderboard', phaseEndsAt: state.autoPlay ? now + LEADERBOARD_AUTO_MS : null };
}

function toNextQuestionOrPodium(state: DungeonDashState, now: number): DungeonDashState {
  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.questions.length) {
    return { ...state, phase: 'podium', phaseEndsAt: null };
  }
  return toRead({ ...state, currentIndex: nextIndex }, now);
}

export function dungeonDashReducer(state: DungeonDashState, action: DungeonDashAction): DungeonDashState {
  switch (action.type) {
    case 'start': {
      if (state.phase !== 'setup') return state;
      if (state.questions.length === 0) return state;
      return { ...state, phase: 'countdown', phaseEndsAt: action.now + (action.countdownMs ?? COUNTDOWN_MS) };
    }

    case 'tick': {
      if (state.pausedAt !== null) return state; // frozen: absolute timestamps only move again on 'resume'
      const now = action.now;
      if (state.phase === 'countdown' && state.phaseEndsAt !== null && now >= state.phaseEndsAt) {
        return toRead(state, now);
      }
      if (state.phase === 'read' && state.phaseEndsAt !== null && now >= state.phaseEndsAt) {
        return beginQuestion(state, now);
      }
      if (state.phase === 'question' && state.phaseEndsAt !== null && now >= state.phaseEndsAt) {
        return toReveal(state, now);
      }
      if (state.phase === 'reveal' && state.autoPlay && state.phaseEndsAt !== null && now >= state.phaseEndsAt) {
        return toLeaderboard(state, now);
      }
      if (state.phase === 'leaderboard' && state.autoPlay && state.phaseEndsAt !== null && now >= state.phaseEndsAt) {
        return toNextQuestionOrPodium(state, now);
      }
      return state;
    }

    case 'answer': {
      if (state.pausedAt !== null) return state; // paused: no answering while frozen
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

      if (allEligibleAnswered(nextState)) nextState = toReveal(nextState, action.now);
      return nextState;
    }

    case 'next': {
      if (state.phase === 'reveal') return toLeaderboard(state, action.now);
      if (state.phase === 'leaderboard') return toNextQuestionOrPodium(state, action.now);
      return state;
    }

    case 'end': {
      return { ...state, phase: 'podium', phaseEndsAt: null, pausedAt: null };
    }

    case 'skip': {
      // Force the current timed phase to end immediately, exactly like its timer hitting 0.
      const now = action.now;
      const s: DungeonDashState = state.pausedAt !== null ? { ...state, pausedAt: null } : state;
      switch (s.phase) {
        case 'countdown':
          return toRead(s, now);
        case 'read':
          return beginQuestion(s, now);
        case 'question':
          return toReveal(s, now);
        case 'reveal':
          return toLeaderboard(s, now);
        case 'leaderboard':
          return toNextQuestionOrPodium(s, now);
        default:
          return s;
      }
    }

    case 'pause': {
      if (state.pausedAt !== null) return state; // already paused
      if (state.phaseEndsAt === null) return state; // nothing timed running right now
      return { ...state, pausedAt: action.now };
    }

    case 'resume': {
      if (state.pausedAt === null) return state;
      const delta = action.now - state.pausedAt;
      return {
        ...state,
        pausedAt: null,
        phaseEndsAt: state.phaseEndsAt !== null ? state.phaseEndsAt + delta : null,
        questionStartedAt: state.questionStartedAt !== null ? state.questionStartedAt + delta : null,
      };
    }

    case 'setAutoPlay': {
      return { ...state, autoPlay: action.autoPlay };
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
      if (state.phase === 'question' && allEligibleAnswered(nextState)) nextState = toReveal(nextState, action.now);
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
