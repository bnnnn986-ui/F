import type { PartyScoreEntry, PartyTeamScoreEntry, RoomPlayer, Team } from './protocol';
import { setItem, getItem } from '../storage/storage';

/** Host-side room snapshot, persisted to localStorage so a host reload can offer to resume the same room. */
export interface HostSnapshot {
  roomCode: string;
  players: RoomPlayer[];
  locked: boolean;
  partyScores: PartyScoreEntry[];
  activeGameId: string | null;
  gameState: unknown;
  savedAt: number;
  teamMode: boolean;
  teams: Team[];
  partyTeamScores: PartyTeamScoreEntry[];
}

export const HOST_SNAPSHOT_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export function isSnapshotFresh(snapshot: HostSnapshot, now = Date.now()): boolean {
  return now - snapshot.savedAt < HOST_SNAPSHOT_MAX_AGE_MS;
}

const SNAPSHOT_KEY = 'pp:hostSnapshot';

export function saveSnapshotToStorage(snapshot: HostSnapshot): void {
  try {
    setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* localStorage can be full/unavailable — losing resume ability is not fatal */
  }
}

export function loadSnapshotFromStorage(): HostSnapshot | null {
  const raw = getItem(SNAPSHOT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HostSnapshot;
  } catch {
    return null;
  }
}

export function clearSnapshotFromStorage(): void {
  try {
    setItem(SNAPSHOT_KEY, '');
  } catch {
    /* ignore */
  }
}
