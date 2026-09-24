import { RoomClient } from '../core/room/client';
import { PeerClientTransport } from '../core/net/peerTransport';
import type { PartyScoreEntry, RoomErrorCode, RoomPhase, RoomPlayer } from '../core/room/protocol';
import { playSound } from '../core/audio/audio';
import type { PlayerProfile } from '../core/storage/profile';
import { showToast } from '../core/ui/toast';

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
  /** True only for the very first auto-reconnect attempt after a page reload, so the UI can show a distinct message. */
  isResuming: boolean;
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
    isResuming: false,
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

// ---- Reload resilience: remember the session so a page reload can silently rejoin. ----

interface SavedSession {
  roomCode: string;
  playerId: string;
  profile: PlayerProfile;
}

const SESSION_KEY = 'pp:session';

function saveSession(session: SavedSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function loadSavedSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

function clearSavedSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function joinParty(roomCode: string, profile: PlayerProfile, playerId: string, isResuming = false): Promise<void> {
  client?.close();
  setState({ ...initialState(), status: 'connecting', roomCode, selfPlayerId: playerId, isResuming });
  saveSession({ roomCode, playerId, profile });

  const transport = new PeerClientTransport();
  const c = new RoomClient({ transport, playerId, name: profile.name, avatarId: profile.avatarId, tint: profile.tint });
  client = c;
  let prevCount = 0;

  c.on('welcome', (pid, code) => {
    setState({ status: 'connected', selfPlayerId: pid, roomCode: code, isResuming: false });
  });
  c.on('lobby', (players, locked, phase, activeGameId, partyScores) => {
    if (players.length > prevCount) playSound('join');
    prevCount = players.length;
    setState({ players, locked, phase, activeGameId, partyScores });
  });
  c.on('gameState', (payload) => setState({ gameStatePayload: payload }));
  c.on('error', (_code: RoomErrorCode, messageTh: string) => {
    setState({ status: 'error', errorMessage: messageTh, isResuming: false });
    clearSavedSession();
  });
  c.on('notice', (messageTh) => showToast(messageTh));

  return c.connect(roomCode);
}

export function sendPartyIntent(payload: unknown): void {
  client?.sendIntent(payload);
}

export function leaveParty(): void {
  client?.close();
  client = null;
  clearSavedSession();
  setState(initialState());
}
