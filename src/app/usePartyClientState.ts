import { useEffect, useState } from 'preact/hooks';
import { getPartyClientState, subscribePartyClient, type PartyClientState } from './partyClientStore';

/** Subscribes a component to the singleton party-client store (see partyClientStore.ts). */
export function usePartyClientState(): PartyClientState {
  const [state, setState] = useState<PartyClientState>(getPartyClientState());
  useEffect(() => subscribePartyClient(setState), []);
  return state;
}
