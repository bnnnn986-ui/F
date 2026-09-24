import { RoomClient } from '../core/room/client';
import { PeerClientTransport } from '../core/net/peerTransport';
import type { PartyScoreEntry, RoomErrorCode, RoomPhase, RoomPlayer } from '../core/room/protocol';
import { playSound } from '../core/audio/audio';
import type { PlayerProfile } from '../core/storage/profile';

export type PartyConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface PartyClientState {
  status: PartyConnectionStatus;
  roomCode: string;
  selfPlayerId: string;
  players: RoomPlayer[];
  locked: boolean;
  phase: RoomPhase;
  activeGameId: string | null;
  partyScores: PartyScoreEntry[];
  gameStatePayload: unknown;
  errorMessage: string;
}

function initialState(): PartyClientState {
  return {
    status: 'idle',
    roomCode: '',
    selfPlayerId: '',
    players: [],
    locked: false,
    phase: 'lobby',
    activeGameId: null,
    partyScores: [],
    gameStatePayload: null,
    errorMessage: '',
  };
}

/**
 * Module-level singleton holding the player's connection to the party
 * room. It intentionally lives outside any single screen component: the
 * player connects once on `#/join/:code`, then the app navigates to
 * `#/party/play` — a route change that would normally unmount/remount
 * components — and this store is what keeps the WebRTC connection and
 * room state alive across that navigation.
 */
let state = initialState();
let client: RoomClient | null = null;
const listeners = new Set<(s: PartyClientState) => void>();

function setState(patch: Partial<PartyClientState>): void {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn(state));
}

export function getPartyClientState(): PartyClientState {
  return state;
}

export function subscribePartyClient(fn: (s: PartyClientState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function joinParty(roomCode: string, profile: PlayerProfile, playerId: string): Promise<void> {
  client?.close();
  setState({ ...initialState(), status: 'connecting', roomCode, selfPlayerId: playerId });

  const transport = new PeerClientTransport();
  const c = new RoomClient({ transport, playerId, name: profile.name, avatarId: profile.avatarId });
  client = c;
  let prevCount = 0;

  c.on('welcome', (pid, code) => {
    setState({ status: 'connected', selfPlayerId: pid, roomCode: code });
  });
  c.on('lobby', (players, locked, phase, activeGameId, partyScores) => {
    if (players.length > prevCount) playSound('join');
    prevCount = players.length;
    setState({ players, locked, phase, activeGameId, partyScores });
  });
  c.on('gameState', (payload) => setState({ gameStatePayload: payload }));
  c.on('error', (_code: RoomErrorCode, messageTh: string) => {
    setState({ status: 'error', errorMessage: messageTh });
  });

  return c.connect(roomCode);
}

export function sendPartyIntent(payload: unknown): void {
  client?.sendIntent(payload);
}

export function leaveParty(): void {
  client?.close();
  client = null;
  setState(initialState());
}
