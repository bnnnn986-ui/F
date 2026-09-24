/**
 * Pure scoring helpers (see docs/games/quiz-race.md § Scoring).
 * - Correct: round(1000 * (1 - 0.5 * elapsed/timeLimit)), clamped 500-1000.
 * - Streak bonus: +100 per consecutive correct beyond the first, capped at +500.
 * - Wrong / no answer: 0 (streak resets, handled by the reducer).
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function baseCorrectScore(elapsedMs: number, timeLimitMs: number): number {
  const e = clamp(elapsedMs, 0, timeLimitMs);
  const raw = Math.round(1000 * (1 - 0.5 * (e / timeLimitMs)));
  return clamp(raw, 500, 1000);
}

/** `streakAfterThisAnswer` includes this answer (e.g. 3rd correct in a row = 3). */
export function streakBonus(streakAfterThisAnswer: number): number {
  if (streakAfterThisAnswer < 2) return 0;
  return Math.min((streakAfterThisAnswer - 1) * 100, 500);
}

export function correctAnswerPoints(elapsedMs: number, timeLimitMs: number, streakAfterThisAnswer: number): number {
  return baseCorrectScore(elapsedMs, timeLimitMs) + streakBonus(streakAfterThisAnswer);
}
