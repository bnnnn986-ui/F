import { getJSON, setJSON } from '../../core/storage/storage';
import type { QuizConfig } from './logic/types';
import type { BotDifficulty } from './logic/bots';

export interface QuizSetup {
  config: QuizConfig;
  difficulty: BotDifficulty;
  extraTime: boolean; // accessibility: x1.5 time per question
}

const KEY = 'pp:quizrace:setup';

export const DEFAULT_SETUP: QuizSetup = {
  config: { packId: 'general', questionCount: 10, secondsPerQuestion: 20, shuffle: true },
  difficulty: 'normal',
  extraTime: false,
};

export function loadQuizSetup(): QuizSetup {
  return getJSON<QuizSetup>(KEY, DEFAULT_SETUP);
}

export function saveQuizSetup(setup: QuizSetup): void {
  setJSON(KEY, setup);
}
