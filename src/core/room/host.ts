import { Emitter } from '../net/emitter';
import { generateRoomCode, roomCodeToPeerId } from '../net/roomCode';
import type { HostTransport, PeerId } from '../net/transport';
import type { GameHost, GameHostContext, PartyResult } from '../../games/types';
import { loadGameModule } from '../../games/registry';
import { HEROES } from '../sprites/heroes';
import { TINT_COUNT } from '../sprites/recolor';
import { sanitizeName } from './nameFilter';
import { saveSnapshotToStorage, type HostSnapshot } from './snapshot';
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
  /** The mounted game's host-screen view changed (ticks, host actions, player intents). */
  gameViewChange: (view: unknown) => void;
};

const DEFAULT_MAX_PLAYERS = 50;
const MAX_BOTS = 10;
const TICK_MS = 400;
const SNAPSHOT_MIN_INTERVAL_MS = 3000;
const RESTORE_RETRY_MS = 1500;
const RESTORE_RETRY_ATTEMPTS = 10; // ~15s total

const BOT_NAME_POOL = [
  'ก็อบลินจอมซน', 'เอลฟ์หลงทาง', 'มังกรตัวจิ๋ว', 'ผีดิบขี้อาย', 'สไลม์จอมกวน',
  'โครงกระดูกขี้ลืม', 'นางฟ้าจอมป่วน', 'ยักษ์ใจดี', 'แม่มดฝึกหัด', 'อสูรกายตัวน้อย',
];

/**
 * Host-authoritative **party room** runtime (one persistent room per host,
 * not one per game — Jackbox/GameBuddies style). Owns the player roster
 * (including host-side bots), lobby lock, reconnection-by-playerId,
 * kick-bans, cumulative party scores, and the currently active game (if
 * any), routing opaque game messages to a pluggable `GameHost` that it
 * mounts/unmounts on `startGame`/`endGame`. Persists a resumable snapshot
 * to localStorage so a host page reload can offer to restore the room.
 */
export class RoomHost extends Emitter<RoomHostEvents> {
  private transport: HostTransport;
  private maxPlayers: number;
  private game: GameHost | undefined;
  private players = new Map<string, RoomPlayer>(); // keyed by playerId
  private peerToPlayer = new Map<PeerId, string>();
  private bannedPlayerIds = new Set<string>();
  private locked = false;
  private phase: RoomPhase = 'lobby';
  private activeGameId: string | null = null;
  private partyScores = new Map<string, number>(); // playerId -> cumulative points
  private roomCode = '';
  private tickTimer: ReturnType<typeof setInterval> | undefined;
  private lastSnapshotSaveAt = 0;

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

  /** Opens a fresh room with a newly generated code. */
  async open(): Promise<{ roomCode: string; peerId: PeerId }> {
    let code = generateRoomCode();
    // Extremely unlikely collision loop guard (public peer ids can clash).
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const peerId = await this.transport.open(roomCodeToPeerId(code));
        this.roomCode = code;
        return { roomCode: code, peerId };
      } catch {
        code = generateRoomCode();
      }
    }
    const peerId = await this.transport.open(roomCodeToPeerId(code));
    this.roomCode = code;
    return { roomCode: code, peerId };
  }

  /**
   * Re-opens a room under its ORIGINAL code after a host page reload,
   * rehydrating players/scores/game state from a snapshot this same room
   * saved before it went away. The signaling server may still be holding
   * the old peer id for a few seconds after the tab closed, so this
   * retries with a short backoff for ~15s before giving up.
   */
  async restoreFromSnapshot(snapshot: HostSnapshot): Promise<{ roomCode: string; peerId: PeerId }> {
    this.roomCode = snapshot.roomCode;
    this.locked = snapshot.locked;
    this.players.clear();
    for (const p of snapshot.players) {
      // peerId is stale (from the previous session); real clients will
      // re-`hello` and get reattached by playerId once they reconnect.
      this.players.set(p.playerId, { ...p, peerId: p.isBot ? p.peerId : '', connected: p.isBot });
    }
    this.partyScores = new Map(snapshot.partyScores.map((s) => [s.playerId, s.total]));

    let lastError: unknown;
    for (let attempt = 0; attempt < RESTORE_RETRY_ATTEMPTS; attempt++) {
      try {
        const peerId = await this.transport.open(roomCodeToPeerId(snapshot.roomCode));
        await this.finishRestore(snapshot);
        return { roomCode: snapshot.roomCode, peerId };
      } catch (err) {
        lastError = err;
        await new Promise((resolve) => setTimeout(resolve, RESTORE_RETRY_MS));
      }
    }
    throw lastError instanceof Error ? lastError : new Error('restore failed');
  }

  private async finishRestore(snapshot: HostSnapshot): Promise<void> {
    if (snapshot.activeGameId) {
      const module = await loadGameModule(snapshot.activeGameId);
      this.activeGameId = snapshot.activeGameId;
      this.phase = 'in-game';
      this.game = module.createHost(this.getContext(), snapshot.gameState);
      this.startTickLoop();
    } else {
      this.phase = 'lobby';
    }
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

  getRoomCode(): string {
    return this.roomCode;
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

  /** Adds a host-side NPC player (no transport) with a random hero+tint and fantasy name. */
  addBot(): RoomPlayer | null {
    const botCount = this.getPlayers().filter((p) => p.isBot).length;
    if (botCount >= MAX_BOTS) return null;
    const hero = HEROES[Math.floor(Math.random() * HEROES.length)]!;
    const tint = Math.floor(Math.random() * TINT_COUNT);
    const usedNames = new Set(this.getPlayers().map((p) => p.name));
    const name = BOT_NAME_POOL.find((n) => !usedNames.has(n)) ?? `${BOT_NAME_POOL[0]} ${botCount + 1}`;
    const playerId = `bot-${Math.random().toString(36).slice(2, 10)}`;
    const bot: RoomPlayer = {
      playerId,
      peerId: playerId,
      name,
      avatarId: hero.id,
      tint,
      connected: true,
      isHost: false,
      isBot: true,
      score: 0,
      joinedAt: Date.now(),
    };
    this.players.set(playerId, bot);
    this.game?.onPlayerJoin?.(playerId);
    this.broadcastLobby();
    return bot;
  }

  removeBot(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player?.isBot) return;
    this.players.delete(playerId);
    this.game?.onPlayerLeave?.(playerId);
    this.broadcastLobby();
  }

  /** Loads a game module, mounts its host logic, and switches the room into `in-game`. */
  async startGame(gameId: string): Promise<void> {
    const module = await loadGameModule(gameId);
    this.activeGameId = gameId;
    this.phase = 'in-game';
    this.game = module.createHost(this.getContext());
    this.game.start?.();
    this.startTickLoop();
    this.broadcastLobby();
    this.broadcastGameState();
    this.emit('phaseChange', this.phase, this.activeGameId);
  }

  /** Forwards a host-only control action (setup config, start, next, …) to the mounted game. */
  sendHostAction(action: unknown): void {
    this.game?.onHostAction?.(action);
    this.broadcastGameState();
    this.persistSnapshot(true);
  }

  /**
   * Ends the current game (called by the game via `ctx.endGame()`, or
   * forced by the host pressing "กลับโรงเตี๊ยม"): tallies `results` into
   * the party scoreboard and returns everyone to the lobby.
   */
  endGame(results: PartyResult[] = []): void {
    for (const r of results) {
      this.partyScores.set(r.playerId, (this.partyScores.get(r.playerId) ?? 0) + r.points);
    }
    this.stopTickLoop();
    this.game?.dispose?.();
    this.game = undefined;
    this.phase = 'lobby';
    this.activeGameId = null;
    this.broadcastLobby();
    this.persistSnapshot(true);
    this.emit('phaseChange', this.phase, this.activeGameId);
  }

  /** Kicks a player and permanently bans their playerId from rejoining this room. */
  kickPlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    this.players.delete(playerId);
    this.bannedPlayerIds.add(playerId);
    if (!player.isBot) {
      this.peerToPlayer.delete(player.peerId);
      this.send(player.peerId, { v: PROTOCOL_VERSION, t: 'error', code: 'kicked', message: 'kicked' });
      this.transport.disconnectPeer(player.peerId);
    }
    this.game?.onPlayerLeave?.(playerId);
    this.emit('playerKicked', playerId);
    this.broadcastLobby();
  }

  /** Builds a JSON-serializable snapshot for localStorage-based reload recovery. */
  getSnapshot(): HostSnapshot {
    return {
      roomCode: this.roomCode,
      players: this.getPlayers(),
      locked: this.locked,
      partyScores: this.getPartyScores(),
      activeGameId: this.activeGameId,
      gameState: this.game?.serialize?.() ?? null,
      savedAt: Date.now(),
    };
  }

  private persistSnapshot(force = false): void {
    if (!this.roomCode) return;
    const now = Date.now();
    if (!force && now - this.lastSnapshotSaveAt < SNAPSHOT_MIN_INTERVAL_MS) return;
    this.lastSnapshotSaveAt = now;
    saveSnapshotToStorage(this.getSnapshot());
  }

  private startTickLoop(): void {
    this.stopTickLoop();
    this.tickTimer = setInterval(() => {
      this.game?.onTick?.(Date.now());
      this.broadcastGameState();
      this.persistSnapshot();
    }, TICK_MS);
  }

  private stopTickLoop(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = undefined;
  }

  close(): void {
    this.stopTickLoop();
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
    this.persistSnapshot();
  }

  private broadcastGameState(): void {
    if (!this.game) return;
    for (const player of this.players.values()) {
      if (!player.connected || player.isBot) continue;
      const payload = this.game.getPlayerView(player.playerId);
      this.send(player.peerId, { v: PROTOCOL_VERSION, t: 'gameState', payload });
    }
    this.emit('gameViewChange', this.game.getHostView());
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
      this.handleHello(peerId, data.playerId, data.name, data.avatarId, data.tint);
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
      this.broadcastGameState();
      return;
    }
  };

  private handleHello(peerId: PeerId, playerId: string, rawName: string, avatarId: string, tint: number): void {
    const existing = this.players.get(playerId);

    if (this.bannedPlayerIds.has(playerId)) {
      this.send(peerId, { v: PROTOCOL_VERSION, t: 'error', code: 'kicked', message: 'kicked' });
      this.transport.disconnectPeer(peerId);
      return;
    }
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

    const { name: filteredName, wasFiltered: nameWasFiltered } = sanitizeName(rawName);

    // If another connected player already has the same character+colour,
    // auto-bump this one's tint so everyone stays visually unique, and let
    // them know why via a toast (see NoticeMessage).
    const resolvedTint = this.resolveUniqueTint(playerId, avatarId, tint);
    const tintWasBumped = resolvedTint !== tint;

    if (existing) {
      // Reconnect (or restored-snapshot rehydration): same playerId, new peerId — keep score/join order.
      this.peerToPlayer.delete(existing.peerId);
      existing.peerId = peerId;
      existing.connected = true;
      existing.name = this.dedupeName(filteredName, playerId);
      existing.avatarId = avatarId;
      existing.tint = resolvedTint;
      this.peerToPlayer.set(peerId, playerId);
    } else {
      const player: RoomPlayer = {
        playerId,
        peerId,
        name: this.dedupeName(filteredName),
        avatarId,
        tint: resolvedTint,
        connected: true,
        isHost: false,
        isBot: false,
        score: 0,
        joinedAt: Date.now(),
      };
      this.players.set(playerId, player);
      this.peerToPlayer.set(peerId, playerId);
      this.game?.onPlayerJoin?.(playerId);
    }

    this.send(peerId, { v: PROTOCOL_VERSION, t: 'welcome', playerId, roomCode: this.roomCode });
    if (nameWasFiltered) {
      this.send(peerId, {
        v: PROTOCOL_VERSION,
        t: 'notice',
        messageTh: `ชื่อของคุณไม่เหมาะสม เราเปลี่ยนชื่อให้เป็น "${filteredName}" แทน`,
      });
    } else if (tintWasBumped) {
      this.send(peerId, {
        v: PROTOCOL_VERSION,
        t: 'notice',
        messageTh: 'มีคนเลือกสีตัวละครนี้ไปแล้ว เราเปลี่ยนสีให้คุณเพื่อให้ไม่ซ้ำใคร',
      });
    }
    this.broadcastLobby();
    if (this.phase === 'in-game') this.broadcastGameState();
  }

  /** Finds a tint that isn't already used by another connected player with the same avatarId. */
  private resolveUniqueTint(playerId: string, avatarId: string, tint: number): number {
    const taken = new Set(
      [...this.players.values()]
        .filter((p) => p.playerId !== playerId && p.connected && p.avatarId === avatarId)
        .map((p) => p.tint),
    );
    if (!taken.has(tint)) return tint;
    for (let i = 0; i < TINT_COUNT; i++) {
      const candidate = (tint + i) % TINT_COUNT;
      if (!taken.has(candidate)) return candidate;
    }
    return tint;
  }

  private handlePeerLeave = (peerId: PeerId): void => {
    const playerId = this.peerToPlayer.get(peerId);
    if (!playerId) return;
    const player = this.players.get(playerId);
    if (player) player.connected = false;
    this.peerToPlayer.delete(peerId);
    this.game?.onPlayerLeave?.(playerId);
    this.broadcastLobby();
  };
}
