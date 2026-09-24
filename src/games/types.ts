import type { ComponentType } from 'preact';
import type { RoomPlayer } from '../core/room/protocol';

export type GameStatus = 'ready' | 'soon';

export interface GameManifest {
  id: string;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  minPlayers: number;
  maxPlayers: number;
  durationMinutes: string; // e.g. "5-10"
  tags: string[];
  status: GameStatus;
  /** Sprite/decor ids used to draw the card thumbnail. */
  thumbnailSprites: string[];
  /** Three short steps shown in the "how to play" modal. */
  howToPlayTh: [string, string, string];
}

/** One player's result at the end of a game round, reported back to the party room. */
export interface PartyResult {
  playerId: string;
  points: number;
}

/** Everything a game's host-side logic needs from the room runtime. */
export interface GameHostContext {
  getPlayers(): RoomPlayer[];
  /** Ask the room runtime to pull fresh per-player views and broadcast them. */
  requestBroadcast(): void;
  /**
   * Ends the current game: adds `results` to each player's cumulative party
   * score and returns the room to the party lobby, where the host can pick
   * the next game. Call with no results (or an empty array) to just bail
   * out without awarding points.
   */
  endGame(results?: PartyResult[]): void;
}

/**
 * Host-authoritative game logic. The room runtime owns networking and the
 * lobby/party-score bookkeeping; a `GameHost` only reacts to player intents
 * and produces views, and calls `ctx.endGame()` when the round is over.
 */
export interface GameHost<View = unknown> {
  onPlayerJoin?(playerId: string): void;
  onPlayerLeave?(playerId: string): void;
  onIntent(playerId: string, intent: unknown): void;
  /** Host-only control channel (setup config, start round, next question, force end…) — never reachable by players. */
  onHostAction?(action: unknown): void;
  /**
   * Called frequently (a few times a second) while the game is mounted, so
   * games that need their own clock (question timers, bot "thinking" delays)
   * don't each need to run their own setInterval — the room runtime drives
   * one shared loop for all of them.
   */
  onTick?(nowMs: number): void;
  start?(): void;
  /** View rendered on the host's own screen (projector). */
  getHostView(): View;
  /** View sent to a specific player (never reveals other players' secrets). */
  getPlayerView(playerId: string): View;
  /** Plain, JSON-serializable snapshot of this game's state, for host-reload recovery. */
  serialize?(): unknown;
  dispose?(): void;
}

export interface GameModule {
  manifest: GameManifest;
  /** `restoreState`, when given, is a value this same module previously returned from `serialize()`. */
  createHost(ctx: GameHostContext, restoreState?: unknown): GameHost;
  HostView: ComponentType<{ view: unknown; onHostAction: (action: unknown) => void; onBackToLobby: () => void }>;
  PlayerView: ComponentType<{ view: unknown; sendIntent: (intent: unknown) => void }>;
}
