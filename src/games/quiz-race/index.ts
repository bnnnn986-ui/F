import type { GameHost, GameHostContext, GameModule } from '../types';
import { quizRaceManifest } from './manifest';
import { QuizRaceHostView, QuizRacePlayerView } from './views';

interface QuizRaceView {
  phase: 'lobby';
  playerCount: number;
}

/**
 * Minimal placeholder host logic so the lobby → "start game" flow works
 * end-to-end in Phase 1. The real host-authoritative reducer (questions,
 * timers, scoring, race track) is a Phase 2 deliverable — see
 * `docs/SPEC.md` § quiz-race.
 */
class QuizRaceGameHost implements GameHost<QuizRaceView> {
  constructor(private ctx: GameHostContext) {}

  onIntent(): void {
    // No intents handled yet; Phase 2 adds `answer` etc.
  }

  getHostView(): QuizRaceView {
    return { phase: 'lobby', playerCount: this.ctx.getPlayers().length };
  }

  getPlayerView(): QuizRaceView {
    return { phase: 'lobby', playerCount: this.ctx.getPlayers().length };
  }
}

export const quizRaceModule: GameModule = {
  manifest: quizRaceManifest,
  createHost: (ctx) => new QuizRaceGameHost(ctx),
  HostView: QuizRaceHostView,
  PlayerView: QuizRacePlayerView,
};
