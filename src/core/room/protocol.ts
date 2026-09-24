/**
 * Versioned, typed wire protocol between RoomHost and RoomClient. Every
 * message carries `v` (protocol version) so we can evolve the shape later
 * without breaking older cached clients loaded from GitHub Pages.
 *
 * Pixel Party uses a single **party room** per host: players join once and
 * stay connected while the host picks games from the party lobby one after
 * another (Jackbox/GameBuddies style), instead of a fresh room per game.
 */
export const PROTOCOL_VERSION = 1;

export type RoomPhase = 'lobby' | 'in-game';

export interface RoomPlayer {
  playerId: string;
  peerId: string;
  name: string;
  avatarId: string;
  /** Outfit hue tint (0-7), see core/sprites/recolor.ts. */
  tint: number;
  connected: boolean;
  isHost: false;
  isBot: boolean;
  score: number;
  joinedAt: number;
}

/** Cumulative points a player earned across games this party. */
export interface PartyScoreEntry {
  playerId: string;
  name: string;
  total: number;
}

export type RoomErrorCode = 'room-not-found' | 'room-full' | 'room-locked' | 'host-left' | 'kicked' | 'network';

export const ROOM_ERROR_MESSAGES_TH: Record<RoomErrorCode, string> = {
  'room-not-found': 'ไม่พบห้อง',
  'room-full': 'ห้องเต็ม',
  'room-locked': 'ห้องถูกล็อก',
  'host-left': 'ผู้คุมเกมออกจากห้องแล้ว',
  kicked: 'คุณถูกเชิญออกจากห้อง',
  network: 'การเชื่อมต่อขัดข้อง กำลังลองใหม่…',
};

// ---- Client -> Host ----

export interface HelloMessage {
  v: 1;
  t: 'hello';
  playerId: string;
  name: string;
  avatarId: string;
  tint: number;
}

export interface GameIntentMessage {
  v: 1;
  t: 'gameIntent';
  payload: unknown;
}

export interface PingMessage {
  v: 1;
  t: 'ping';
}

export type ClientToHostMessage = HelloMessage | GameIntentMessage | PingMessage;

// ---- Host -> Client ----

export interface WelcomeMessage {
  v: 1;
  t: 'welcome';
  playerId: string;
  roomCode: string;
}

/** Full party-room snapshot: player roster, lock state, and current phase/game. */
export interface LobbyMessage {
  v: 1;
  t: 'lobby';
  players: RoomPlayer[];
  locked: boolean;
  phase: RoomPhase;
  activeGameId: string | null;
  partyScores: PartyScoreEntry[];
}

export interface ErrorMessage {
  v: 1;
  t: 'error';
  code: RoomErrorCode;
  message: string;
}

export interface GameStateMessage {
  v: 1;
  t: 'gameState';
  payload: unknown;
}

export interface PongMessage {
  v: 1;
  t: 'pong';
}

/** A non-terminal heads-up for one player, e.g. "we bumped your colour so you're unique." */
export interface NoticeMessage {
  v: 1;
  t: 'notice';
  messageTh: string;
}

export type HostToClientMessage =
  | WelcomeMessage
  | LobbyMessage
  | ErrorMessage
  | GameStateMessage
  | PongMessage
  | NoticeMessage;

/** Structural check shared by both directions: has our version tag + a `t` discriminator. */
function isVersionedMessage(data: unknown): data is { v: 1; t: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { v?: unknown }).v === PROTOCOL_VERSION &&
    typeof (data as { t?: unknown }).t === 'string'
  );
}

export function isClientToHostMessage(data: unknown): data is ClientToHostMessage {
  return isVersionedMessage(data) && ['hello', 'gameIntent', 'ping'].includes(data.t);
}

export function isHostToClientMessage(data: unknown): data is HostToClientMessage {
  return isVersionedMessage(data) && ['welcome', 'lobby', 'error', 'gameState', 'pong', 'notice'].includes(data.t);
}
