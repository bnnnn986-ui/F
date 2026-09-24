import Peer, { type DataConnection } from 'peerjs';
import { Emitter } from './emitter';
import type { ClientTransport, HostTransport, PeerId, TransportError, TransportEvents } from './transport';

/**
 * Signaling server config, resolved once at module load from (in order):
 * 1. `?signal=host:port` in the URL (used by e2e tests / local dev),
 * 2. `VITE_SIGNAL_HOST` / `VITE_SIGNAL_PORT` build-time env,
 * 3. PeerJS's default public cloud broker (production default).
 */
export interface SignalConfig {
  host?: string;
  port?: number;
  path?: string;
  secure?: boolean;
}

export function resolveSignalConfig(): SignalConfig {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const signal = params.get('signal');
    if (signal) {
      const [host, portStr] = signal.split(':');
      const port = portStr ? Number(portStr) : 443;
      return { host, port, path: '/', secure: port === 443 };
    }
  }
  const envHost = import.meta.env?.VITE_SIGNAL_HOST as string | undefined;
  if (envHost) {
    const port = Number(import.meta.env?.VITE_SIGNAL_PORT ?? 443);
    return { host: envHost, port, path: '/', secure: port === 443 };
  }
  return {}; // PeerJS default public cloud
}

/** Local/test signaling has no TURN/STUN infra reachable, so skip ICE servers. */
function isLocalSignal(cfg: SignalConfig): boolean {
  return cfg.host === 'localhost' || cfg.host === '127.0.0.1';
}

function toTransportError(err: { type?: string; message?: string } | Error): TransportError {
  const type = 'type' in err ? err.type : undefined;
  const message = err.message ?? 'unknown transport error';
  switch (type) {
    case 'peer-unavailable':
      return { code: 'room-not-found', message };
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return { code: 'network', message };
    default:
      return { code: 'unknown', message };
  }
}

function makePeer(id: string | undefined, cfg: SignalConfig): Peer {
  const options: ConstructorParameters<typeof Peer>[1] = {
    ...(cfg.host ? { host: cfg.host } : {}),
    ...(cfg.port ? { port: cfg.port } : {}),
    ...(cfg.path ? { path: cfg.path } : {}),
    ...(cfg.secure !== undefined ? { secure: cfg.secure } : {}),
    debug: 0,
  };
  if (isLocalSignal(cfg)) {
    options.config = { iceServers: [] };
  }
  return id ? new Peer(id, options) : new Peer(options);
}

export class PeerHostTransport extends Emitter<TransportEvents> implements HostTransport {
  private peer: Peer | undefined;
  private connections = new Map<PeerId, DataConnection>();

  async open(hostId: string): Promise<PeerId> {
    const cfg = resolveSignalConfig();
    return new Promise((resolve, reject) => {
      const peer = makePeer(hostId, cfg);
      this.peer = peer;
      peer.on('open', (id) => {
        this.emit('open', id);
        resolve(id);
      });
      peer.on('connection', (conn) => this.attachConnection(conn));
      peer.on('error', (err) => {
        const te = toTransportError(err);
        this.emit('error', te);
        reject(new Error(te.message));
      });
    });
  }

  private attachConnection(conn: DataConnection): void {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.emit('peerJoin', conn.peer);
    });
    conn.on('data', (data) => this.emit('message', conn.peer, data));
    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.emit('peerLeave', conn.peer);
    });
    conn.on('error', () => {
      this.connections.delete(conn.peer);
      this.emit('peerLeave', conn.peer);
    });
  }

  send(peerId: PeerId, data: unknown): void {
    this.connections.get(peerId)?.send(data);
  }

  broadcast(data: unknown, exclude: PeerId[] = []): void {
    for (const [peerId, conn] of this.connections) {
      if (exclude.includes(peerId)) continue;
      conn.send(data);
    }
  }

  disconnectPeer(peerId: PeerId): void {
    this.connections.get(peerId)?.close();
    this.connections.delete(peerId);
  }

  close(): void {
    for (const conn of this.connections.values()) conn.close();
    this.connections.clear();
    this.peer?.destroy();
  }
}

export class PeerClientTransport extends Emitter<TransportEvents> implements ClientTransport {
  private peer: Peer | undefined;
  private conn: DataConnection | undefined;

  async connect(hostId: string): Promise<PeerId> {
    const cfg = resolveSignalConfig();
    return new Promise((resolve, reject) => {
      const peer = makePeer(undefined, cfg);
      this.peer = peer;
      peer.on('open', (selfId) => {
        const conn = peer.connect(hostId, { reliable: true });
        this.conn = conn;
        conn.on('open', () => {
          this.emit('open', selfId);
          resolve(selfId);
        });
        conn.on('data', (data) => this.emit('message', hostId, data));
        conn.on('close', () => this.emit('error', { code: 'host-left', message: 'host left' }));
        conn.on('error', (err) => {
          const te = toTransportError(err);
          this.emit('error', te);
          reject(new Error(te.message));
        });
      });
      peer.on('error', (err) => {
        const te = toTransportError(err);
        this.emit('error', te);
        reject(new Error(te.message));
      });
    });
  }

  send(data: unknown): void {
    this.conn?.send(data);
  }

  close(): void {
    this.conn?.close();
    this.peer?.destroy();
  }
}
