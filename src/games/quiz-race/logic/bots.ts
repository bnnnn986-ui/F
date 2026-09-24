import type { Question } from './types';

export type BotDifficulty = 'easy' | 'normal' | 'hard';

export const BOT_CORRECT_CHANCE: Record<BotDifficulty, number> = {
  easy: 0.4,
  normal: 0.65,
  hard: 0.85,
};

export interface BotDecision {
  choiceIndex: number;
  /** Delay from question start, in ms. */
  delayMs: number;
}

/**
 * Pure decision function for one bot answering one question — given a
 * difficulty, question and rng, returns which choice it'll pick and how
 * long it'll "think" before locking it in. `rng` is injected so tests are
 * deterministic.
 */
export function decideBotAnswer(
  question: Question,
  difficulty: BotDifficulty,
  timeLimitMs: number,
  rng: () => number = Math.random,
): BotDecision {
  const correctChance = BOT_CORRECT_CHANCE[difficulty];
  const willBeCorrect = rng() < correctChance;

  let choiceIndex = question.correctIndex;
  if (!willBeCorrect && question.choices.length > 1) {
    const wrongIndices = question.choices.map((_, i) => i).filter((i) => i !== question.correctIndex);
    choiceIndex = wrongIndices[Math.floor(rng() * wrongIndices.length)] ?? question.correctIndex;
  }

  const minDelay = 2000;
  const maxDelay = Math.max(minDelay + 500, timeLimitMs - 2000);
  const delayMs = minDelay + rng() * (maxDelay - minDelay);

  return { choiceIndex, delayMs };
}
