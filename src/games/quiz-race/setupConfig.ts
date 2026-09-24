import { getJSON, setJSON } from '../../core/storage/storage';
import type { QuizConfig } from './logic/types';
import type { BotDifficulty } from './logic/bots';

export interface QuizSetup {
  config: QuizConfig;
  difficulty: BotDifficulty;
  extraTime: boolean; // accessibility: x1.5 time per question
  /**
   * "เดินเกมอัตโนมัติ" — null means "use the default for this viewport"
   * (see `defaultAutoPlay()` in `index.ts`); an explicit true/false is the
   * host's own choice and always wins.
   */
  autoPlay: boolean | null;
}

const KEY = 'pp:quizrace:setup';

export const DEFAULT_SETUP: QuizSetup = {
  config: { packId: 'general', questionCount: 10, secondsPerQuestion: 20, shuffle: true },
  difficulty: 'normal',
  extraTime: false,
  autoPlay: null,
};

export function loadQuizSetup(): QuizSetup {
  return getJSON<QuizSetup>(KEY, DEFAULT_SETUP);
}

export function saveQuizSetup(setup: QuizSetup): void {
  setJSON(KEY, setup);
}
