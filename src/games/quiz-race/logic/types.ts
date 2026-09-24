/** Pure types for the Dungeon Dash (quiz-race) state machine. No DOM, fully unit-testable. */

export interface Question {
  id: string;
  text: string;
  /** 2-4 answers. */
  choices: string[];
  correctIndex: number;
}

export interface QuestionPack {
  id: string;
  nameTh: string;
  questions: Question[];
}

export type DungeonDashPhase = 'setup' | 'countdown' | 'read' | 'question' | 'reveal' | 'leaderboard' | 'podium';

export interface QuizConfig {
  packId: string;
  /** Number of questions to play, or 'all'. */
  questionCount: number | 'all';
  secondsPerQuestion: number;
  shuffle: boolean;
}

export interface AnswerRecord {
  choiceIndex: number;
  correct: boolean;
  elapsedMs: number;
  points: number;
}

export interface DungeonPlayerState {
  playerId: string;
  name: string;
  avatarId: string;
  tint: number;
  isBot: boolean;
  connected: boolean;
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  /** Sum of elapsed-ms for every answered question — used for the "fastest" stat and tie-break. */
  totalAnswerMs: number;
  answeredCount: number;
  /** Question index this player joined at; they're a spectator (excluded, 0 pts) for earlier questions. */
  joinedAtIndex: number;
  /** answers[questionIndex] = record. */
  answers: Record<number, AnswerRecord>;
}

export interface DungeonDashState {
  phase: DungeonDashPhase;
  config: QuizConfig;
  questions: Question[]; // selected + (optionally) shuffled play order
  currentIndex: number;
  /** "เดินเกมอัตโนมัติ" — auto-advances reveal -> leaderboard -> next without the host pressing a button. */
  autoPlay: boolean;
  /** Phase durations (ms) — normally the `*_MS` constants; overridable (e.g. `?fast=1` in e2e) at creation time. */
  readMs: number;
  revealAutoMs: number;
  leaderboardAutoMs: number;
  questionStartedAt: number | null;
  /** Countdown/read/question deadline, and (auto-play only) reveal/leaderboard deadline — epoch ms, host clock. Null when not timed. */
  phaseEndsAt: number | null;
  /**
   * Epoch ms (host clock) the game was paused at, or null when running.
   * On resume, every absolute timestamp above is shifted forward by the
   * elapsed pause duration, so remaining time is preserved exactly and the
   * whole thing is reload-safe (just two more plain timestamps to persist).
   */
  pausedAt: number | null;
  players: Record<string, DungeonPlayerState>;
}

export type DungeonDashAction =
  | { type: 'start'; now: number; countdownMs?: number }
  | { type: 'tick'; now: number }
  | { type: 'answer'; playerId: string; choiceIndex: number; now: number }
  | { type: 'next'; now: number }
  | { type: 'end'; now: number }
  | { type: 'skip'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'setAutoPlay'; autoPlay: boolean }
  | { type: 'playerJoin'; playerId: string; name: string; avatarId: string; tint: number; isBot: boolean; now: number }
  | { type: 'playerLeave'; playerId: string; now: number };

export const COUNTDOWN_MS = 3000;
/** Read phase: the question text (no answers) shown for a few seconds before answering opens. */
export const READ_MS = 3000;
/** Auto-play only: how long the reveal / leaderboard phases linger before auto-advancing. */
export const REVEAL_AUTO_MS = 5000;
export const LEADERBOARD_AUTO_MS = 5000;
