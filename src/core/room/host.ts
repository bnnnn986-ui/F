import { Emitter } from '../net/emitter';
import { generateRoomCode, roomCodeToPeerId } from '../net/roomCode';
import type { HostTransport, PeerId } from '../net/transport';
import type { GameHost, GameHostContext, PartyResult } from '../../games/types';
import { loadGameModule } from '../../games/registry';
import {
  PROTOCOL_VERSION,
  type HostToClientMessage,
  type PartyScoreEntry,
  type RoomPhase,
  type RoomPlayer,
  isClientToHostMessage,
} from './protocol';

export interface RoomHostOptions {
  transport: HostTransport;
  maxPlayers?: number;
}

export type RoomHostEvents = {
  lobbyChange: (players: RoomPlayer[], locked: boolean) => void;
  phaseChange: (phase: RoomPhase, gameId: string | null) => void;
  playerKicked: (playerId: string) => void;
};

const DEFAULT_MAX_PLAYERS = 50;

/**
 * Host-authoritative **party room** runtime (one persistent room per host,
 * not one per game — Jackbox/GameBuddies style). Owns the player roster,
 * lobby lock, reconnection-by-playerId, cumulative party scores, and the
 * currently active game (if any), routing opaque game messages to a
 * pluggable `GameHost` that it mounts/unmounts on `startGame`/`endGame`.
 */
export class RoomHost extends Emitter<RoomHostEvents> {
  private transport: HostTransport;
  private maxPlayers: number;
  private game: GameHost | undefined;
  private players = new Map<string, RoomPlayer>(); // keyed by playerId
  private peerToPlayer = new Map<PeerId, string>();
  private locked = false;
  private phase: RoomPhase = 'lobby';
  private activeGameId: string | null = null;
  private partyScores = new Map<string, number>(); // playerId -> cumulative points
  private roomCode = '';

  constructor(opts: RoomHostOptions) {
    super();
    this.transport = opts.transport;
    this.maxPlayers = opts.maxPlayers ?? DEFAULT_MAX_PLAYERS;
    this.transport.on('message', this.handleMessage);
    this.transport.on('peerLeave', this.handlePeerLeave);
  }

  getContext(): GameHostContext {
    return {
      getPlayers: () => this.getPlayers(),
      requestBroadcast: () => this.broadcastGameState(),
      endGame: (results) => this.endGame(results),
    };
  }

  async open(): Promise<{ roomCode: string; peerId: PeerId }> {
    let code = generateRoomCode();
    let peerId: PeerId;
    // Extremely unlikely collision loop guard (public peer ids can clash).
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        peerId = await this.transport.open(roomCodeToPeerId(code));
        this.roomCode = code;
        return { roomCode: code, peerId };
      } catch {
        code = generateRoomCode();
      }
    }
    peerId = await this.transport.open(roomCodeToPeerId(code));
    this.roomCode = code;
    return { roomCode: code, peerId };
  }

  getPlayers(): RoomPlayer[] {
    return [...this.players.values()].sort((a, b) => a.joinedAt - b.joinedAt);
  }

  getPhase(): RoomPhase {
    return this.phase;
  }

  getActiveGameId(): string | null {
    return this.activeGameId;
  }

  getPartyScores(): PartyScoreEntry[] {
    return [...this.partyScores.entries()]
      .map(([playerId, total]) => ({ playerId, name: this.players.get(playerId)?.name ?? '?', total }))
      .sort((a, b) => b.total - a.total);
  }

  isLocked(): boolean {
    return this.locked;
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
    this.broadcastLobby();
  }

  /** Loads a game module, mounts its host logic, and switches the room into `in-game`. */
  async startGame(gameId: string): Promise<void> {
    const module = await loadGameModule(gameId);
    this.activeGameId = gameId;
    this.phase = 'in-game';
    this.game = module.createHost(this.getContext());
    this.game.start?.();
    this.broadcastLobby();
    this.broadcastGameState();
    this.emit('phaseChange', this.phase, this.activeGameId);
  }

  /**
   * Ends the current game (called by the game via `ctx.endGame()`, or
   * forced by the host pressing "กลับล็อบบี้"): tallies `results` into the
   * party scoreboard and returns everyone to the lobby.
   */
  endGame(results: PartyResult[] = []): void {
    for (const r of results) {
      this.partyScores.set(r.playerId, (this.partyScores.get(r.playerId) ?? 0) + r.points);
    }
    this.game?.dispose?.();
    this.game = undefined;
    this.phase = 'lobby';
    this.activeGameId = null;
    this.broadcastLobby();
    this.emit('phaseChange', this.phase, this.activeGameId);
  }

  kickPlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    this.players.delete(playerId);
    this.peerToPlayer.delete(player.peerId);
    this.send(player.peerId, { v: PROTOCOL_VERSION, t: 'error', code: 'kicked', message: 'kicked' });
    this.transport.disconnectPeer(player.peerId);
    this.game?.onPlayerLeave?.(playerId);
    this.emit('playerKicked', playerId);
    this.broadcastLobby();
  }

  close(): void {
    this.transport.off('message', this.handleMessage);
    this.transport.off('peerLeave', this.handlePeerLeave);
    this.transport.close();
    this.game?.dispose?.();
  }

  private send(peerId: PeerId, msg: HostToClientMessage): void {
    this.transport.send(peerId, msg);
  }

  private broadcast(msg: HostToClientMessage, exclude: PeerId[] = []): void {
    this.transport.broadcast(msg, exclude);
  }

  private broadcastLobby(): void {
    const msg: HostToClientMessage = {
      v: PROTOCOL_VERSION,
      t: 'lobby',
      players: this.getPlayers(),
      locked: this.locked,
      phase: this.phase,
      activeGameId: this.activeGameId,
      partyScores: this.getPartyScores(),
    };
    this.broadcast(msg);
    this.emit('lobbyChange', this.getPlayers(), this.locked);
  }

  private broadcastGameState(): void {
    if (!this.game) return;
    for (const player of this.players.values()) {
      if (!player.connected) continue;
      const payload = this.game.getPlayerView(player.playerId);
      this.send(player.peerId, { v: PROTOCOL_VERSION, t: 'gameState', payload });
    }
  }

  /** Ensures display names are unique in the room by appending a suffix. */
  private dedupeName(name: string, exceptPlayerId?: string): string {
    const trimmed = name.trim().slice(0, 20) || 'Player';
    const taken = new Set(
      [...this.players.values()].filter((p) => p.playerId !== exceptPlayerId).map((p) => p.name),
    );
    if (!taken.has(trimmed)) return trimmed;
    let suffix = 2;
    while (taken.has(`${trimmed} (${suffix})`)) suffix++;
    return `${trimmed} (${suffix})`;
  }

  private handleMessage = (peerId: PeerId, data: unknown): void => {
    if (!isClientToHostMessage(data)) return;
    if (data.t === 'hello') {
      this.handleHello(peerId, data.playerId, data.name, data.avatarId);
      return;
    }
    if (data.t === 'ping') {
      this.send(peerId, { v: PROTOCOL_VERSION, t: 'pong' });
      return;
    }
    if (data.t === 'gameIntent') {
      const playerId = this.peerToPlayer.get(peerId);
      if (!playerId) return;
      this.game?.onIntent(playerId, data.payload);
      return;
    }
  };

  private handleHello(peerId: PeerId, playerId: string, name: string, avatarId: string): void {
    const existing = this.players.get(playerId);

    if (!existing && this.locked) {
      this.send(peerId, { v: PROTOCOL_VERSION, t: 'error', code: 'room-locked', message: 'room locked' });
      this.transport.disconnectPeer(peerId);
      return;
    }
    if (!existing && this.players.size >= this.maxPlayers) {
      this.send(peerId, { v: PROTOCOL_VERSION, t: 'error', code: 'room-full', message: 'room full' });
      this.transport.disconnectPeer(peerId);
      return;
    }

    if (existing) {
      // Reconnect: same playerId, new peerId — keep score/join order.
      this.peerToPlayer.delete(existing.peerId);
      existing.peerId = peerId;
      existing.connected = true;
      existing.name = this.dedupeName(name, playerId);
      existing.avatarId = avatarId;
      this.peerToPlayer.set(peerId, playerId);
    } else {
      const player: RoomPlayer = {
        playerId,
        peerId,
        name: this.dedupeName(name),
        avatarId,
        connected: true,
        isHost: false,
        score: 0,
        joinedAt: Date.now(),
      };
      this.players.set(playerId, player);
      this.peerToPlayer.set(peerId, playerId);
      this.game?.onPlayerJoin?.(playerId);
    }

    this.send(peerId, { v: PROTOCOL_VERSION, t: 'welcome', playerId, roomCode: this.roomCode });
    this.broadcastLobby();
    if (this.phase === 'in-game') this.broadcastGameState();
  }

  private handlePeerLeave = (peerId: PeerId): void => {
    const playerId = this.peerToPlayer.get(peerId);
    if (!playerId) return;
    const player = this.players.get(playerId);
    if (player) player.connected = false;
    this.peerToPlayer.delete(peerId);
    this.broadcastLobby();
  };
}
