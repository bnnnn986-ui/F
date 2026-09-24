import type { GameHost, GameHostContext, GameModule } from '../types';
import { quizRaceManifest } from './manifest';
import { QuizRaceHostView, QuizRacePlayerView } from './views/index';
import { createInitialState, dungeonDashReducer, selectQuestions } from './logic/reducer';
import { buildHostView, buildPlayerView, type HostViewPayload, type PlayerViewPayload } from './logic/views';
import { decideBotAnswer } from './logic/bots';
import { BUILT_IN_PACKS, getBuiltInPack } from './content';
import { loadCustomPacks } from './content/customPacks';
import { DEFAULT_SETUP, type QuizSetup } from './setupConfig';
import type { DungeonDashState, QuizConfig } from './logic/types';

export type QuizHostAction =
  | { type: 'configure'; setup: Partial<QuizSetup> }
  | { type: 'start' }
  | { type: 'next' }
  | { type: 'restart' }
  | { type: 'exitToLobby' };

export type QuizPlayerIntent = { type: 'answer'; choiceIndex: number };

export interface QuizHostViewPayload extends HostViewPayload {
  setup: QuizSetup;
  availablePacks: Array<{ id: string; nameTh: string; questionCount: number }>;
  playerCount: number;
}

export type QuizPlayerViewPayload = PlayerViewPayload;

interface PersistedState {
  state: DungeonDashState;
  setup: QuizSetup;
}

/** e2e test hook: `?fast=1` shortens the 3s countdown to keep tests fast. */
function isFastTestMode(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fast') === '1';
}

function allPacks() {
  return [...BUILT_IN_PACKS, ...loadCustomPacks()];
}

function buildQuestions(setup: QuizSetup) {
  const pack = getBuiltInPack(setup.config.packId) ?? allPacks().find((p) => p.id === setup.config.packId) ?? BUILT_IN_PACKS[0]!;
  const config: QuizConfig = {
    ...setup.config,
    secondsPerQuestion: setup.extraTime ? Math.round(setup.config.secondsPerQuestion * 1.5) : setup.config.secondsPerQuestion,
  };
  return { questions: selectQuestions(pack, config), config };
}

class DungeonDashGameHost implements GameHost<unknown> {
  private ctx: GameHostContext;
  private state: DungeonDashState;
  private setup: QuizSetup;
  private lastScheduledQuestionIndex = -1;
  private botSchedule = new Map<string, { answerAt: number; choiceIndex: number }>();
  private rng: () => number;
  private ended = false;

  constructor(ctx: GameHostContext, restoreState?: unknown, rng: () => number = Math.random) {
    this.ctx = ctx;
    this.rng = rng;
    if (restoreState) {
      const persisted = restoreState as PersistedState;
      this.state = persisted.state;
      this.setup = persisted.setup;
    } else {
      this.setup = DEFAULT_SETUP;
      const { questions, config } = buildQuestions(this.setup);
      const players = ctx.getPlayers().map((p) => ({ playerId: p.playerId, name: p.name, avatarId: p.avatarId, tint: p.tint, isBot: p.isBot }));
      this.state = createInitialState(config, questions, players);
    }
  }

  onPlayerJoin(playerId: string): void {
    const player = this.ctx.getPlayers().find((p) => p.playerId === playerId);
    if (!player) return;
    this.state = dungeonDashReducer(this.state, {
      type: 'playerJoin',
      playerId,
      name: player.name,
      avatarId: player.avatarId,
      tint: player.tint,
      isBot: player.isBot,
      now: Date.now(),
    });
  }

  onPlayerLeave(playerId: string): void {
    this.state = dungeonDashReducer(this.state, { type: 'playerLeave', playerId });
  }

  onIntent(playerId: string, intent: unknown): void {
    const i = intent as QuizPlayerIntent;
    if (i?.type === 'answer' && typeof i.choiceIndex === 'number') {
      this.state = dungeonDashReducer(this.state, { type: 'answer', playerId, choiceIndex: i.choiceIndex, now: Date.now() });
    }
  }

  onHostAction(action: unknown): void {
    const a = action as QuizHostAction;
    switch (a.type) {
      case 'configure': {
        if (this.state.phase !== 'setup') return;
        this.setup = { ...this.setup, ...a.setup, config: { ...this.setup.config, ...a.setup.config } };
        const { questions, config } = buildQuestions(this.setup);
        const players = this.ctx.getPlayers().map((p) => ({ playerId: p.playerId, name: p.name, avatarId: p.avatarId, tint: p.tint, isBot: p.isBot }));
        this.state = createInitialState(config, questions, players);
        break;
      }
      case 'start':
        this.state = dungeonDashReducer(this.state, { type: 'start', now: Date.now(), countdownMs: isFastTestMode() ? 300 : undefined });
        break;
      case 'next':
        this.lastScheduledQuestionIndex = -1;
        this.state = dungeonDashReducer(this.state, { type: 'next', now: Date.now() });
        break;
      case 'restart': {
        const { questions, config } = buildQuestions(this.setup);
        const players = this.ctx.getPlayers().map((p) => ({ playerId: p.playerId, name: p.name, avatarId: p.avatarId, tint: p.tint, isBot: p.isBot }));
        this.state = createInitialState(config, questions, players);
        this.lastScheduledQuestionIndex = -1;
        this.botSchedule.clear();
        this.ended = false;
        break;
      }
      case 'exitToLobby':
        this.finishAndExit();
        break;
    }
  }

  onTick(now: number): void {
    const before = this.state.phase;
    this.state = dungeonDashReducer(this.state, { type: 'tick', now });
    if (this.state.phase === 'question') this.runBots(now);
    if (before !== this.state.phase) this.ctx.requestBroadcast();
  }

  private runBots(now: number): void {
    if (this.lastScheduledQuestionIndex !== this.state.currentIndex) {
      this.lastScheduledQuestionIndex = this.state.currentIndex;
      this.botSchedule.clear();
      const question = this.state.questions[this.state.currentIndex];
      const startedAt = this.state.questionStartedAt ?? now;
      if (question) {
        const bots = this.ctx.getPlayers().filter((p) => p.isBot);
        for (const bot of bots) {
          const decision = decideBotAnswer(question, this.setup.difficulty, this.state.config.secondsPerQuestion * 1000, this.rng);
          this.botSchedule.set(bot.playerId, { answerAt: startedAt + decision.delayMs, choiceIndex: decision.choiceIndex });
        }
      }
    }
    for (const [playerId, sched] of this.botSchedule) {
      if (now >= sched.answerAt) {
        this.state = dungeonDashReducer(this.state, { type: 'answer', playerId, choiceIndex: sched.choiceIndex, now });
      }
    }
  }

  private finishAndExit(): void {
    if (this.ended) return;
    this.ended = true;
    const results = Object.values(this.state.players).map((p) => ({ playerId: p.playerId, points: p.score }));
    this.ctx.endGame(results);
  }

  getHostView(): QuizHostViewPayload {
    return {
      ...buildHostView(this.state),
      setup: this.setup,
      availablePacks: allPacks().map((p) => ({ id: p.id, nameTh: p.nameTh, questionCount: p.questions.length })),
      playerCount: this.ctx.getPlayers().filter((p) => !p.isBot).length,
    };
  }

  getPlayerView(playerId: string): QuizPlayerViewPayload {
    return buildPlayerView(this.state, playerId);
  }

  serialize(): unknown {
    return { state: this.state, setup: this.setup } satisfies PersistedState;
  }
}

export const quizRaceModule: GameModule = {
  manifest: quizRaceManifest,
  createHost: (ctx, restoreState) => new DungeonDashGameHost(ctx, restoreState),
  HostView: QuizRaceHostView,
  PlayerView: QuizRacePlayerView,
};
