/**
 * Whether the update toast should stay hidden right now because a game is
 * in progress (an SW takeover reloads the page, which would yank a player
 * or host out of a round). Combines:
 *  - the player side, read straight from partyClientStore (owned here);
 *  - the host side, which the game-flow track should report via
 *    `setHostGameBusy(true/false)` from PartyHostScreen (see phase4-brief
 *    Track B remaining call sites) — defaults to "not busy" until wired.
 */
import { getPartyClientState, subscribePartyClient } from '../../app/partyClientStore';

let hostBusy = false;
const listeners = new Set<() => void>();

/** Call from the game-flow track's host screen when a game starts/ends. */
export function setHostGameBusy(busy: boolean): void {
  hostBusy = busy;
  listeners.forEach((fn) => fn());
}

export function isUpdateDeferred(): boolean {
  return hostBusy || getPartyClientState().phase === 'in-game';
}

/** Re-evaluates whenever either signal could have changed. */
export function onUpdateGateChange(fn: () => void): () => void {
  listeners.add(fn);
  const unsubClient = subscribePartyClient(() => fn());
  return () => {
    listeners.delete(fn);
    unsubClient();
  };
}
