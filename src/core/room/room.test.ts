import { describe, expect, it, vi } from 'vitest';
import { LocalClientTransport, LocalHostTransport } from '../net/localTransport';
import { RoomHost } from './host';
import { RoomClient } from './client';
import type { GameHost, GameModule } from '../../games/types';

const onIntent = vi.fn();

const fakeGameHost: GameHost = {
  onIntent: (playerId, payload) => onIntent(playerId, payload),
  getHostView: () => ({ ok: true }),
  getPlayerView: () => ({ ok: true }),
};

const fakeModule: GameModule = {
  manifest: {
    id: 'fake-game',
    titleTh: 'เกมทดสอบ',
    titleEn: 'Fake Game',
    descriptionTh: '',
    descriptionEn: '',
    minPlayers: 1,
    maxPlayers: 10,
    durationMinutes: '1',
    tags: [],
    status: 'ready',
    thumbnailSprites: [],
    howToPlayTh: ['a', 'b', 'c'],
  },
  createHost: () => fakeGameHost,
  HostView: () => null,
  PlayerView: () => null,
};

vi.mock('../../games/registry', () => ({
  loadGameModule: vi.fn(async (id: string) => {
    if (id === 'fake-game') return fakeModule;
    throw new Error(`unknown game ${id}`);
  }),
}));

function makeHost(opts: { maxPlayers?: number } = {}) {
  const transport = new LocalHostTransport();
  const host = new RoomHost({ transport, maxPlayers: opts.maxPlayers });
  return { transport, host };
}

function makeClient(playerId: string, name: string, avatarId = 'cat') {
  const transport = new LocalClientTransport();
  const client = new RoomClient({ transport, playerId, name, avatarId });
  return { transport, client };
}

async function flush() {
  // let queued microtasks (LocalTransport delivery) settle
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('RoomHost + RoomClient over LocalTransport', () => {
  it('lets a player join and appear in the lobby', async () => {
    const { host } = makeHost();
    const { roomCode } = await host.open();
    const { client } = makeClient('p1', 'Alice');

    const lobbyEvents: string[][] = [];
    client.on('lobby', (snapshot) => lobbyEvents.push(snapshot.players.map((p) => p.name)));

    await client.connect(roomCode);
    await flush();

    expect(host.getPlayers()).toHaveLength(1);
    expect(host.getPlayers()[0]?.name).toBe('Alice');
    expect(lobbyEvents.at(-1)).toEqual(['Alice']);
  });

  it('dedupes duplicate display names', async () => {
    const { host } = makeHost();
    const { roomCode } = await host.open();
    const { client: c1 } = makeClient('p1', 'Sam');
    const { client: c2 } = makeClient('p2', 'Sam');

    await c1.connect(roomCode);
    await flush();
    await c2.connect(roomCode);
    await flush();

    const names = host.getPlayers().map((p) => p.name).sort();
    expect(names).toEqual(['Sam', 'Sam (2)']);
  });

  it('keeps identity and score on reconnect with the same playerId', async () => {
    const { host } = makeHost();
    const { roomCode } = await host.open();
    const { client, transport } = makeClient('p1', 'Alice');
    await client.connect(roomCode);
    await flush();

    const player = host.getPlayers()[0]!;
    player.score = 42;

    // simulate a dropped connection then a fresh reconnect attempt
    transport.close();
    await flush();
    expect(host.getPlayers()[0]?.connected).toBe(false);

    const { client: client2 } = makeClient('p1', 'Alice');
    await client2.connect(roomCode);
    await flush();

    expect(host.getPlayers()).toHaveLength(1);
    expect(host.getPlayers()[0]?.connected).toBe(true);
    expect(host.getPlayers()[0]?.score).toBe(42);
  });

  it('kicks a player and disconnects them', async () => {
    const { host } = makeHost();
    const { roomCode } = await host.open();
    const { client } = makeClient('p1', 'Alice');
    const errors: string[] = [];
    client.on('error', (code) => errors.push(code));

    await client.connect(roomCode);
    await flush();
    expect(host.getPlayers()).toHaveLength(1);

    host.kickPlayer('p1');
    await flush();

    expect(host.getPlayers()).toHaveLength(0);
    expect(errors).toContain('kicked');
  });

  it('rejects new joins while locked but keeps existing players', async () => {
    const { host } = makeHost();
    const { roomCode } = await host.open();
    const { client: c1 } = makeClient('p1', 'Alice');
    await c1.connect(roomCode);
    await flush();

    host.setLocked(true);

    const { client: c2 } = makeClient('p2', 'Bob');
    const errors: string[] = [];
    c2.on('error', (code) => errors.push(code));
    await c2.connect(roomCode);
    await flush();

    expect(host.getPlayers()).toHaveLength(1);
    expect(errors).toContain('room-locked');
  });

  it('rejects joins beyond maxPlayers', async () => {
    const { host } = makeHost({ maxPlayers: 1 });
    const { roomCode } = await host.open();
    const { client: c1 } = makeClient('p1', 'Alice');
    await c1.connect(roomCode);
    await flush();

    const { client: c2 } = makeClient('p2', 'Bob');
    const errors: string[] = [];
    c2.on('error', (code) => errors.push(code));
    await c2.connect(roomCode);
    await flush();

    expect(host.getPlayers()).toHaveLength(1);
    expect(errors).toContain('room-full');
  });

  it('emits room-not-found for an unknown room code', async () => {
    const { client } = makeClient('p1', 'Alice');
    const errors: string[] = [];
    client.on('error', (code) => errors.push(code));
    await client.connect('ZZZZZ');
    await flush();
    expect(errors).toContain('room-not-found');
  });

  it('delegates game intents to the mounted GameHost', async () => {
    onIntent.mockClear();
    const { host } = makeHost();
    const { roomCode } = await host.open();
    await host.startGame('fake-game');

    const { client } = makeClient('p1', 'Alice');
    await client.connect(roomCode);
    await flush();

    client.sendIntent({ kind: 'answer', choice: 1 });
    await flush();

    expect(onIntent).toHaveBeenCalledWith('p1', { kind: 'answer', choice: 1 });
  });

  it('switches phase to in-game on startGame and back to lobby with tallied scores on endGame', async () => {
    const { host } = makeHost();
    const { roomCode } = await host.open();
    const { client } = makeClient('p1', 'Alice');
    await client.connect(roomCode);
    await flush();

    expect(host.getPhase()).toBe('lobby');

    await host.startGame('fake-game');
    expect(host.getPhase()).toBe('in-game');
    expect(host.getActiveGameId()).toBe('fake-game');

    host.endGame([{ playerId: 'p1', points: 10 }]);
    expect(host.getPhase()).toBe('lobby');
    expect(host.getActiveGameId()).toBeNull();
    expect(host.getPartyScores()).toEqual([{ playerId: 'p1', name: 'Alice', total: 10 }]);
  });

  it('adds bots with unique names up to the max, and removes them', async () => {
    const { host } = makeHost();
    await host.open();

    const bot1 = host.addBot();
    const bot2 = host.addBot();
    expect(bot1?.isBot).toBe(true);
    expect(bot2?.name).not.toBe(bot1?.name);

    for (let i = 0; i < 10; i++) host.addBot();
    const bots = host.getPlayers().filter((p) => p.isBot);
    expect(bots.length).toBeLessThanOrEqual(10);

    host.removeBot(bot1!.playerId);
    expect(host.getPlayers().some((p) => p.playerId === bot1!.playerId)).toBe(false);
  });

  it('bans a kicked playerId from rejoining the same room', async () => {
    const { host } = makeHost();
    const { roomCode } = await host.open();
    const { client } = makeClient('p1', 'Alice');
    await client.connect(roomCode);
    await flush();

    host.kickPlayer('p1');
    await flush();

    const { client: rejoin } = makeClient('p1', 'Alice');
    const errors: string[] = [];
    rejoin.on('error', (code) => errors.push(code));
    await rejoin.connect(roomCode);
    await flush();

    expect(host.getPlayers().find((p) => p.playerId === 'p1')).toBeUndefined();
    expect(errors).toContain('kicked');
  });

  it('replaces a filtered display name and notifies the player', async () => {
    const { host } = makeHost();
    const { roomCode } = await host.open();
    const { client } = makeClient('p1', 'fuckboy');
    const notices: string[] = [];
    client.on('notice', (msg) => notices.push(msg));

    await client.connect(roomCode);
    await flush();

    expect(host.getPlayers()[0]?.name).not.toMatch(/fuck/i);
    expect(notices.length).toBeGreaterThan(0);
  });

  describe('team mode', () => {
    it('assigns every player+bot to a team once team mode is on, and clears teamId when turned off', async () => {
      const { host } = makeHost();
      const { roomCode } = await host.open();
      const { client: c1 } = makeClient('p1', 'Alice');
      const { client: c2 } = makeClient('p2', 'Bob');
      await c1.connect(roomCode);
      await c2.connect(roomCode);
      await flush();
      host.addBot();

      host.setTeamMode(true);
      expect(host.getPlayers().every((p) => p.teamId !== null)).toBe(true);

      host.setTeamMode(false);
      expect(host.getPlayers().every((p) => p.teamId === null)).toBe(true);
    });

    it('assigns a late joiner (and a late bot) to the smallest team', async () => {
      const { host } = makeHost();
      const { roomCode } = await host.open();
      host.setTeamMode(true);
      host.setTeamCount(2);

      const { client: c1 } = makeClient('p1', 'Alice');
      await c1.connect(roomCode);
      await flush();
      const firstTeam = host.getPlayers()[0]!.teamId;

      // Stack 3 more onto the same team so it's clearly the bigger one.
      const { client: c2 } = makeClient('p2', 'Bob');
      await c2.connect(roomCode);
      await flush();
      host.movePlayerToTeam('p2', firstTeam!);

      const bot = host.addBot();
      expect(bot?.teamId).not.toBe(firstTeam); // smallest team is the other one
    });

    it('rebalances evenly on autoBalanceTeams / setTeamCount', async () => {
      const { host } = makeHost();
      await host.open();
      host.setTeamMode(true);
      host.setTeamCount(2);
      for (let i = 0; i < 8; i++) host.addBot();

      const byTeam = new Map<string, number>();
      for (const p of host.getPlayers()) byTeam.set(p.teamId!, (byTeam.get(p.teamId!) ?? 0) + 1);
      const counts = [...byTeam.values()];
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    });

    it('lets a connected player choose their own team via the chooseTeam message', async () => {
      const { host } = makeHost();
      const { roomCode } = await host.open();
      host.setTeamMode(true);
      const teams = host.getTeams();

      const { client } = makeClient('p1', 'Alice');
      await client.connect(roomCode);
      await flush();

      const otherTeam = teams.find((t) => t.id !== host.getPlayers()[0]!.teamId)!;
      client.chooseTeam(otherTeam.id);
      await flush();

      expect(host.getPlayers()[0]!.teamId).toBe(otherTeam.id);
    });

    it('tallies team results from endGame into getPartyTeamScores', async () => {
      const { host } = makeHost();
      await host.open();
      host.setTeamMode(true);
      const teamId = host.getTeams()[0]!.id;

      host.endGame([], [{ teamId, points: 42 }]);
      expect(host.getPartyTeamScores()).toEqual([{ teamId, name: expect.any(String), color: expect.any(String), total: 42 }]);
    });
  });
});
