import type { GameHost, GameHostContext, GameModule } from '../types';
import type { Team } from '../../core/room/protocol';
import { quizRaceManifest } from './manifest';
import { QuizRaceHostView, QuizRacePlayerView } from './views/index';
import { createInitialState, dungeonDashReducer, selectQuestions } from './logic/reducer';
import { buildHostView, buildPlayerView, type HostViewPayload, type PlayerViewPayload, type RunnerView } from './logic/views';
import { decideBotAnswer } from './logic/bots';
import { computeTeamScores, type TeamScore } from './logic/teamScoring';
import { buildAdventureReport, type AdventureReport } from './logic/report';
import { saveReport } from './content/reportHistory';
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
  teamMode: boolean;
  teams: Team[];
  teamScores: TeamScore[] | null;
  runners: EnrichedRunnerView[];
  /** Only populated once phase is 'podium'. */
  report: AdventureReport | null;
}

export type QuizPlayerViewPayload = PlayerViewPayload;

export type EnrichedRunnerView = RunnerView & { teamId: string | null };

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
  return { questions: selectQuestions(pack, config), config, packNameTh: pack.nameTh };
}

class DungeonDashGameHost implements GameHost<unknown> {
  private ctx: GameHostContext;
  private state: DungeonDashState;
  private setup: QuizSetup;
  private packNameTh: string;
  private lastScheduledQuestionIndex = -1;
  private botSchedule = new Map<string, { answerAt: number; choiceIndex: number }>();
  private rng: () => number;
  private ended = false;
  private reportSaved = false;

  constructor(ctx: GameHostContext, restoreState?: unknown, rng: () => number = Math.random) {
    this.ctx = ctx;
    this.rng = rng;
    if (restoreState) {
      const persisted = restoreState as PersistedState;
      this.state = persisted.state;
      this.setup = persisted.setup;
      this.packNameTh = getBuiltInPack(this.setup.config.packId)?.nameTh ?? allPacks().find((p) => p.id === this.setup.config.packId)?.nameTh ?? this.setup.config.packId;
      this.reportSaved = persisted.state.phase === 'podium';
    } else {
      this.setup = DEFAULT_SETUP;
      const { questions, config, packNameTh } = buildQuestions(this.setup);
      this.packNameTh = packNameTh;
      const players = this.playersForReducer();
      this.state = createInitialState(config, questions, players);
    }
  }

  private playersForReducer() {
    return this.ctx.getPlayers().map((p) => ({ playerId: p.playerId, name: p.name, avatarId: p.avatarId, tint: p.tint, isBot: p.isBot }));
  }

  private playerTeamOf = (playerId: string): string | null => {
    return this.ctx.getPlayers().find((p) => p.playerId === playerId)?.teamId ?? null;
  };

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
        const { questions, config, packNameTh } = buildQuestions(this.setup);
        this.packNameTh = packNameTh;
        this.state = createInitialState(config, questions, this.playersForReducer());
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
        const { questions, config, packNameTh } = buildQuestions(this.setup);
        this.packNameTh = packNameTh;
        this.state = createInitialState(config, questions, this.playersForReducer());
        this.lastScheduledQuestionIndex = -1;
        this.botSchedule.clear();
        this.ended = false;
        this.reportSaved = false;
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
    if (before !== this.state.phase) {
      if (this.state.phase === 'podium') this.saveReportOnce();
      this.ctx.requestBroadcast();
    }
  }

  private saveReportOnce(): void {
    if (this.reportSaved) return;
    this.reportSaved = true;
    const teamMode = this.ctx.getTeamMode();
    const teams = teamMode ? this.ctx.getTeams() : null;
    const report = buildAdventureReport(this.state, this.packNameTh, teams, this.playerTeamOf);
    saveReport(report);
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
    this.saveReportOnce();
    const results = Object.values(this.state.players).map((p) => ({ playerId: p.playerId, points: p.score }));
    const teamMode = this.ctx.getTeamMode();
    const teamResults = teamMode
      ? computeTeamScores(this.state, this.ctx.getTeams(), this.playerTeamOf).map((t) => ({ teamId: t.team.id, points: t.avgScore }))
      : undefined;
    this.ctx.endGame(results, teamResults);
  }

  getHostView(): QuizHostViewPayload {
    const teamMode = this.ctx.getTeamMode();
    const teams = this.ctx.getTeams();
    const teamScores = teamMode && teams.length > 0 ? computeTeamScores(this.state, teams, this.playerTeamOf) : null;
    const base = buildHostView(this.state);
    const runners: EnrichedRunnerView[] = base.runners.map((r) => ({ ...r, teamId: this.playerTeamOf(r.playerId) }));
    return {
      ...base,
      runners,
      setup: this.setup,
      availablePacks: allPacks().map((p) => ({ id: p.id, nameTh: p.nameTh, questionCount: p.questions.length })),
      playerCount: this.ctx.getPlayers().filter((p) => !p.isBot).length,
      teamMode,
      teams,
      teamScores,
      report: this.state.phase === 'podium' ? buildAdventureReport(this.state, this.packNameTh, teamMode ? teams : null, this.playerTeamOf) : null,
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
