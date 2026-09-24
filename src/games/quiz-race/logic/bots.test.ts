import { describe, expect, it } from 'vitest';
import { decideBotAnswer } from './bots';
import type { Question } from './types';

const Q: Question = { id: 'q1', text: '?', choices: ['a', 'b', 'c', 'd'], correctIndex: 2 };
const TIME_LIMIT_MS = 20000;

/** Simple deterministic seeded PRNG (mulberry32) so bot tests are reproducible. */
function seededRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('decideBotAnswer', () => {
  it('is deterministic for a given rng sequence', () => {
    const a = decideBotAnswer(Q, 'normal', TIME_LIMIT_MS, seededRng(42));
    const b = decideBotAnswer(Q, 'normal', TIME_LIMIT_MS, seededRng(42));
    expect(a).toEqual(b);
  });

  it('always answers correctly when rng always returns 0 (below any chance threshold)', () => {
    const decision = decideBotAnswer(Q, 'easy', TIME_LIMIT_MS, () => 0);
    expect(decision.choiceIndex).toBe(Q.correctIndex);
  });

  it('always answers incorrectly when rng always returns just under 1 (above any chance threshold)', () => {
    const decision = decideBotAnswer(Q, 'hard', TIME_LIMIT_MS, () => 0.999);
    expect(decision.choiceIndex).not.toBe(Q.correctIndex);
    expect(decision.choiceIndex).toBeGreaterThanOrEqual(0);
    expect(decision.choiceIndex).toBeLessThan(Q.choices.length);
  });

  it('keeps the delay within [2000ms, timeLimit-2000ms]', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { delayMs } = decideBotAnswer(Q, 'normal', TIME_LIMIT_MS, seededRng(seed));
      expect(delayMs).toBeGreaterThanOrEqual(2000);
      expect(delayMs).toBeLessThanOrEqual(TIME_LIMIT_MS - 2000);
    }
  });

  it('roughly matches the configured correct-chance over many trials', () => {
    const rng = seededRng(7);
    let correct = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      if (decideBotAnswer(Q, 'hard', TIME_LIMIT_MS, rng).choiceIndex === Q.correctIndex) correct++;
    }
    const rate = correct / trials;
    expect(rate).toBeGreaterThan(0.75);
    expect(rate).toBeLessThan(0.95);
  });

  it('never picks an out-of-range choice even for a 2-choice question', () => {
    const twoChoice: Question = { id: 'q2', text: '?', choices: ['a', 'b'], correctIndex: 0 };
    for (let seed = 0; seed < 30; seed++) {
      const { choiceIndex } = decideBotAnswer(twoChoice, 'easy', TIME_LIMIT_MS, seededRng(seed));
      expect(choiceIndex === 0 || choiceIndex === 1).toBe(true);
    }
  });
});
