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

export type DungeonDashPhase = 'setup' | 'countdown' | 'question' | 'reveal' | 'podium';

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
  questionStartedAt: number | null;
  /** Countdown/question deadline (epoch ms, host clock). Null when not timed (setup/reveal/podium). */
  phaseEndsAt: number | null;
  players: Record<string, DungeonPlayerState>;
}

export type DungeonDashAction =
  | { type: 'start'; now: number; countdownMs?: number }
  | { type: 'tick'; now: number }
  | { type: 'answer'; playerId: string; choiceIndex: number; now: number }
  | { type: 'next'; now: number }
  | { type: 'end'; now: number }
  | { type: 'playerJoin'; playerId: string; name: string; avatarId: string; tint: number; isBot: boolean; now: number }
  | { type: 'playerLeave'; playerId: string };

export const COUNTDOWN_MS = 3000;
