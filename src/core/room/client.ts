import { Emitter } from '../net/emitter';
import { roomCodeToPeerId } from '../net/roomCode';
import type { ClientTransport } from '../net/transport';
import {
  PROTOCOL_VERSION,
  ROOM_ERROR_MESSAGES_TH,
  type PartyScoreEntry,
  type PartyTeamScoreEntry,
  type RoomErrorCode,
  type RoomPhase,
  type RoomPlayer,
  type Team,
  isHostToClientMessage,
} from './protocol';

/** The party-room snapshot pushed on every `lobby` event — see protocol.ts's `LobbyMessage`. */
export interface LobbySnapshot {
  players: RoomPlayer[];
  locked: boolean;
  phase: RoomPhase;
  activeGameId: string | null;
  partyScores: PartyScoreEntry[];
  teamMode: boolean;
  teams: Team[];
  partyTeamScores: PartyTeamScoreEntry[];
}

export type RoomClientEvents = {
  welcome: (playerId: string, roomCode: string) => void;
  lobby: (snapshot: LobbySnapshot) => void;
  gameState: (payload: unknown) => void;
  error: (code: RoomErrorCode, messageTh: string) => void;
  notice: (messageTh: string) => void;
  connecting: () => void;
  reconnecting: (attempt: number) => void;
};

export interface RoomClientOptions {
  transport: ClientTransport;
  playerId: string;
  name: string;
  avatarId: string;
  tint?: number;
  /** Max auto-reconnect attempts before giving up (exponential backoff). */
  maxReconnectAttempts?: number;
}

const BASE_BACKOFF_MS = 500;

/**
 * Client-side connection to a party room: connects by room code once,
 * sends `hello`, and stays connected across the whole party (lobby +
 * every game the host starts) — players never re-enter a code. Exposes
 * lobby/game state as events and auto-reconnects with backoff on
 * transient network drops (but not on terminal errors like room-not-found).
 */
export class RoomClient extends Emitter<RoomClientEvents> {
  private transport: ClientTransport;
  private playerId: string;
  private name: string;
  private avatarId: string;
  private tint: number;
  private roomCode = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private closedByUser = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(opts: RoomClientOptions) {
    super();
    this.transport = opts.transport;
    this.playerId = opts.playerId;
    this.name = opts.name;
    this.avatarId = opts.avatarId;
    this.tint = opts.tint ?? 0;
    this.maxReconnectAttempts = opts.maxReconnectAttempts ?? 5;
  }

  async connect(roomCode: string): Promise<void> {
    this.roomCode = roomCode;
    this.closedByUser = false;
    this.wireTransport();
    this.emit('connecting');
    try {
      await this.transport.connect(roomCodeToPeerId(roomCode));
      this.transport.send({
        v: PROTOCOL_VERSION,
        t: 'hello',
        playerId: this.playerId,
        name: this.name,
        avatarId: this.avatarId,
        tint: this.tint,
      });
      this.reconnectAttempts = 0;
    } catch {
      this.emit('error', 'room-not-found', ROOM_ERROR_MESSAGES_TH['room-not-found']);
    }
  }

  sendIntent(payload: unknown): void {
    this.transport.send({ v: PROTOCOL_VERSION, t: 'gameIntent', payload });
  }

  /** Self-selects a team from the party lobby (only takes effect while team mode is on). */
  chooseTeam(teamId: string): void {
    this.transport.send({ v: PROTOCOL_VERSION, t: 'chooseTeam', teamId });
  }

  updateProfile(name: string, avatarId: string, tint: number): void {
    this.name = name;
    this.avatarId = avatarId;
    this.tint = tint;
    this.transport.send({ v: PROTOCOL_VERSION, t: 'hello', playerId: this.playerId, name, avatarId, tint });
  }

  close(): void {
    this.closedByUser = true;
    clearTimeout(this.reconnectTimer);
    this.transport.close();
  }

  private wireTransport(): void {
    this.transport.on('message', this.handleMessage);
    this.transport.on('error', this.handleError);
  }

  private handleMessage = (_peerId: string, data: unknown): void => {
    if (!isHostToClientMessage(data)) return;
    switch (data.t) {
      case 'welcome':
        this.emit('welcome', data.playerId, data.roomCode);
        break;
      case 'lobby':
        this.emit('lobby', {
          players: data.players,
          locked: data.locked,
          phase: data.phase,
          activeGameId: data.activeGameId,
          partyScores: data.partyScores,
          teamMode: data.teamMode,
          teams: data.teams,
          partyTeamScores: data.partyTeamScores,
        });
        break;
      case 'gameState':
        this.emit('gameState', data.payload);
        break;
      case 'error':
        this.handleTerminalError(data.code);
        break;
      case 'notice':
        this.emit('notice', data.messageTh);
        break;
      case 'pong':
        break;
    }
  };

  private handleTerminalError = (code: RoomErrorCode): void => {
    this.closedByUser = true; // don't auto-reconnect after a terminal server error
    this.emit('error', code, ROOM_ERROR_MESSAGES_TH[code]);
  };

  private handleError = (err: { code: string; message: string }): void => {
    const code = (err.code as RoomErrorCode) in ROOM_ERROR_MESSAGES_TH ? (err.code as RoomErrorCode) : 'network';
    if (this.closedByUser) return;
    if (code === 'room-not-found') {
      this.emit('error', code, ROOM_ERROR_MESSAGES_TH[code]);
      return;
    }
    // host-left / network: attempt reconnect with backoff.
    this.attemptReconnect();
  };

  private attemptReconnect(): void {
    if (this.closedByUser) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', 'host-left', ROOM_ERROR_MESSAGES_TH['host-left']);
      return;
    }
    this.reconnectAttempts++;
    this.emit('reconnecting', this.reconnectAttempts);
    const delay = BASE_BACKOFF_MS * 2 ** (this.reconnectAttempts - 1);
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.roomCode).catch(() => undefined);
    }, delay);
  }
}
