import { Emitter } from './emitter';
import type { ClientTransport, HostTransport, PeerId, TransportEvents } from './transport';

/**
 * In-memory transport pair used by unit tests (and storybook-style demos)
 * so the room runtime can be exercised without real WebRTC/PeerJS.
 * `LocalHub` is a tiny shared registry mimicking the PeerJS signaling
 * server: hosts register under an id, clients look them up synchronously.
 */
class LocalHub {
  private hosts = new Map<string, LocalHostTransport>();

  register(id: string, host: LocalHostTransport): void {
    this.hosts.set(id, host);
  }

  unregister(id: string): void {
    this.hosts.delete(id);
  }

  find(id: string): LocalHostTransport | undefined {
    return this.hosts.get(id);
  }
}

export const localHub = new LocalHub();

let nextPeerId = 1;

export class LocalHostTransport extends Emitter<TransportEvents> implements HostTransport {
  private id = '';
  private clients = new Map<PeerId, LocalClientTransport>();

  async open(hostId: string): Promise<PeerId> {
    this.id = hostId;
    localHub.register(hostId, this);
    queueMicrotask(() => this.emit('open', hostId));
    return hostId;
  }

  /** Called by a LocalClientTransport connecting to this host. */
  _acceptClient(client: LocalClientTransport): PeerId {
    const peerId = `local-peer-${nextPeerId++}`;
    this.clients.set(peerId, client);
    queueMicrotask(() => this.emit('peerJoin', peerId));
    return peerId;
  }

  _receiveFromClient(peerId: PeerId, data: unknown): void {
    this.emit('message', peerId, data);
  }

  _clientDisconnected(peerId: PeerId): void {
    this.clients.delete(peerId);
    this.emit('peerLeave', peerId);
  }

  send(peerId: PeerId, data: unknown): void {
    const client = this.clients.get(peerId);
    if (client) queueMicrotask(() => client._receiveFromHost(data));
  }

  broadcast(data: unknown, exclude: PeerId[] = []): void {
    for (const [peerId, client] of this.clients) {
      if (exclude.includes(peerId)) continue;
      queueMicrotask(() => client._receiveFromHost(data));
    }
  }

  disconnectPeer(peerId: PeerId): void {
    const client = this.clients.get(peerId);
    this.clients.delete(peerId);
    if (client) queueMicrotask(() => client._hostDisconnected());
  }

  close(): void {
    localHub.unregister(this.id);
    for (const [, client] of this.clients) client._hostDisconnected();
    this.clients.clear();
  }
}

export class LocalClientTransport extends Emitter<TransportEvents> implements ClientTransport {
  private host: LocalHostTransport | undefined;
  private selfId: PeerId = '';

  async connect(hostId: string): Promise<PeerId> {
    const host = localHub.find(hostId);
    if (!host) {
      const err = { code: 'room-not-found' as const, message: 'room not found' };
      queueMicrotask(() => this.emit('error', err));
      throw new Error(err.message);
    }
    this.host = host;
    this.selfId = host._acceptClient(this);
    queueMicrotask(() => this.emit('open', this.selfId));
    return this.selfId;
  }

  _receiveFromHost(data: unknown): void {
    this.emit('message', this.selfId, data);
  }

  _hostDisconnected(): void {
    this.emit('error', { code: 'host-left', message: 'host left' });
  }

  send(data: unknown): void {
    this.host?._receiveFromClient(this.selfId, data);
  }

  close(): void {
    if (this.host) this.host._clientDisconnected(this.selfId);
    this.host = undefined;
  }
}
