/**
 * Transport-agnostic networking contracts. A `HostTransport` accepts many
 * peers; a `ClientTransport` connects to exactly one host. Everything above
 * this layer (room runtime, games) only talks to these interfaces, so we
 * can swap PeerJS (WebRTC, v1) for a WebSocket server later without
 * touching game code.
 */

export type PeerId = string;

export type TransportEvents = {
  open: (selfId: PeerId) => void;
  peerJoin: (peerId: PeerId) => void;
  peerLeave: (peerId: PeerId) => void;
  message: (peerId: PeerId, data: unknown) => void;
  error: (error: TransportError) => void;
};

export type TransportEventName = keyof TransportEvents;

export interface TransportError {
  code: 'room-not-found' | 'room-full' | 'room-locked' | 'host-left' | 'network' | 'unknown';
  message: string;
}

/** Minimal typed event emitter shared by both transport kinds. */
export interface EventSource<Events extends Record<string, (...args: never[]) => void>> {
  on<K extends keyof Events>(event: K, handler: Events[K]): () => void;
  off<K extends keyof Events>(event: K, handler: Events[K]): void;
}

export interface HostTransport extends EventSource<TransportEvents> {
  /** Starts advertising under the given id (e.g. `pixelparty-v1-ABCDE`). */
  open(hostId: string): Promise<PeerId>;
  send(peerId: PeerId, data: unknown): void;
  broadcast(data: unknown, exclude?: PeerId[]): void;
  disconnectPeer(peerId: PeerId): void;
  close(): void;
}

export interface ClientTransport extends EventSource<TransportEvents> {
  /** Connects to a host previously opened with the given id. */
  connect(hostId: string): Promise<PeerId>;
  send(data: unknown): void;
  close(): void;
}
