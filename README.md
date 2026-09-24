# Pixel Party 🎉

ปาร์ตี้เกมพิกเซลสำหรับกลุ่ม (ออฟฟิศ/ห้องเรียน/งานอีเวนต์) — เปิดจอใหญ่เครื่องเดียว
เป็น **โฮสต์** สร้าง **ห้องปาร์ตี้** เดียว ผู้เล่นทุกคนสแกน QR หรือกรอก **รหัสห้อง**
สั้นๆ จากมือถือของตัวเอง เข้าร่วมครั้งเดียวแล้วอยู่ในห้องตลอดงาน — โฮสต์เลือกเกม
จากล็อบบี้ทีละเกม (แบบ Jackbox/GameBuddies) หน้าจอผู้เล่นจะสลับเข้าเกมอัตโนมัติ
เมื่อเกมจบก็กลับมาที่ล็อบบี้พร้อมคะแนนสะสม แล้วเลือกเกมถัดไปได้เลย ไม่ต้องกรอกรหัสซ้ำ
ไม่ต้องติดตั้งแอป ไม่ต้องสมัครสมาชิก เล่นได้ทุกวัย

Deployed as a static site on **GitHub Pages** — no backend server, players
connect peer-to-peer over WebRTC (PeerJS).

## รันโปรเจกต์ในเครื่อง (Run locally)

```bash
npm install
npm run dev       # http://localhost:5173
```

เปิดสองแท็บ/สองอุปกรณ์ในวง LAN เดียวกัน แท็บหนึ่งกด "สร้างห้องปาร์ตี้" อีกแท็บกรอกรหัสห้องเพื่อเข้าร่วม
(ใช้ PeerJS cloud broker สาธารณะโดย default — ต้องมีอินเทอร์เน็ต)

### ทดสอบ (Testing)

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest — unit tests for room runtime + sprite engine
npm run test:e2e     # playwright — full host+join flow, local PeerServer
npm run lint
```

`npm run test:e2e` starts a production build (`vite preview`) **and** a
local PeerServer (`npx peer`) automatically via Playwright's `webServer`
config, so it works offline / in sandboxes with no access to the public
PeerJS cloud. The app picks its signaling server from `?signal=host:port`
in the URL (what the e2e tests use) or `VITE_SIGNAL_HOST`/`VITE_SIGNAL_PORT`
at build time; with neither set it falls back to the public PeerJS cloud.

### Build & preview

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

1. Push to `main` (or run the workflow manually).
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. `.github/workflows/deploy.yml` runs typecheck + unit tests + build, then
   deploys `dist/` via `actions/deploy-pages`. The site works at
   `https://<user>.github.io/<repo>/` because the Vite build uses a
   relative `base` and the app uses hash-based routing (`#/...`) — no
   server-side rewrites needed.

## สถาปัตยกรรม (Architecture)

```
src/
  app/            hash router, party-room screens (host / join / play),
                  the party-client singleton store that keeps a player
                  connected across the #/join → #/party/play navigation
  hub/            landing page: hero, "join with code" box, game catalogue
  core/
    net/          Transport interfaces (Host/Client) + PeerJS impl +
                  an in-memory LocalTransport used by unit tests
    room/         host-authoritative party-room runtime (players, lock,
                  reconnect, phase lobby/in-game, cumulative party scores)
                  + the versioned wire protocol
    ui/           shared pixel UI kit (Button, Panel, Input, Modal, Toast,
                  Timer/CountdownRing, AvatarSprite, MuteToggle, QR…)
    sprites/      pixel sprite engine (palette-indexed string grids →
                  cached canvases) + the procedural avatar builder + a
                  PixelLab PNG-override lookup
    audio/        ZzFX sound presets + persisted mute toggle
    storage/      safe localStorage helpers, player profile, player id
  games/
    types.ts      the GameModule plugin contract
    registry.ts   GameManifest list + lazy loader for ready games
    quiz-race/    Phase-1 placeholder (manifest wired end-to-end; the real
                  quiz reducer + race track land in Phase 2)
public/assets/pixellab/
  avatars/        real PixelLab PNG avatar art (primary), see README.md there
  README.md       how to override any sprite with a PixelLab PNG
```

### Party room model

One **party room** per host (not one room per game). The room has a
`phase`: `'lobby'` (host is picking a game / players are waiting) or
`'in-game'` (a `GameHost` is mounted). Players `hello` once with a
persisted `playerId`; reconnects with the same id keep their identity and
score. The host picks a game from the lobby's game-card grid and presses
start — `RoomHost.startGame(gameId)` lazy-loads that game's module, mounts
its `GameHost`, and broadcasts the new phase; every connected player's
screen switches into the game automatically. When the game calls
`ctx.endGame(results)` (or the host presses "กลับล็อบบี้"), those results
are tallied into `partyScores` and everyone returns to the lobby together.

### Key interfaces

```ts
// core/net/transport.ts
interface HostTransport extends EventSource<TransportEvents> {
  open(hostId: string): Promise<PeerId>;
  send(peerId: PeerId, data: unknown): void;
  broadcast(data: unknown, exclude?: PeerId[]): void;
  disconnectPeer(peerId: PeerId): void;
  close(): void;
}
interface ClientTransport extends EventSource<TransportEvents> {
  connect(hostId: string): Promise<PeerId>;
  send(data: unknown): void;
  close(): void;
}

// core/room/protocol.ts
type RoomPhase = 'lobby' | 'in-game';
interface LobbyMessage {
  v: 1; t: 'lobby';
  players: RoomPlayer[]; locked: boolean;
  phase: RoomPhase; activeGameId: string | null;
  partyScores: PartyScoreEntry[];
}

// games/types.ts
interface GameHostContext {
  getPlayers(): RoomPlayer[];
  requestBroadcast(): void;
  endGame(results?: PartyResult[]): void; // tallies points, returns to lobby
}
interface GameHost<View = unknown> {
  onPlayerJoin?(playerId: string): void;
  onPlayerLeave?(playerId: string): void;
  onIntent(playerId: string, intent: unknown): void;
  start?(): void;
  getHostView(): View;               // rendered on the host's (projector) screen
  getPlayerView(playerId: string): View; // sent to that one player
  dispose?(): void;
}
interface GameModule {
  manifest: GameManifest;
  createHost(ctx: GameHostContext): GameHost;
  HostView: ComponentType<{ view: unknown; onBackToLobby: () => void }>;
  PlayerView: ComponentType<{ view: unknown; sendIntent: (intent: unknown) => void }>;
}
```

### วิธีเพิ่มเกมใหม่ (Adding a new game)

1. Create `src/games/<your-game>/manifest.ts` exporting a `GameManifest`
   (id, Thai/English titles, player range, duration, tags, `status: 'ready'`).
2. Write your host-authoritative logic as a class/factory implementing
   `GameHost` — pure state + `ctx.getPlayers()`/`ctx.endGame(results)`, no
   DOM, so it's easy to unit test (see `core/room/room.test.ts` for the
   pattern with `LocalTransport`).
3. Build `HostView` (rendered on the host/projector screen) and
   `PlayerView` (rendered on each phone; call `sendIntent(...)` to send
   player actions back to the host) as Preact components.
4. Export a `GameModule` from `src/games/<your-game>/index.ts` and add it
   to `GAME_MANIFESTS` + the `loadGameModule` switch in
   `src/games/registry.ts`.
5. Draw a thumbnail from existing sprite/decor ids (`thumbnailSprites`) or
   add new ones in `core/sprites`.

### PixelLab asset override

All sprites are drawn in code by default (works with zero image assets),
and avatars now ship with real PixelLab PNG art in
`public/assets/pixellab/avatars/`. To override any sprite (including
future avatars/decorations) with your own PixelLab PNG without touching
code, see `public/assets/pixellab/README.md`.

## Known limitations (Phase 1)

- Quiz Race's manifest/lobby/game-switch flow is fully wired, but the
  actual quiz reducer (questions, timer, scoring, race track) is a
  placeholder — that's the Phase 2 deliverable.
- The other four games are "coming soon" cards only (manifests, no logic).
- Refreshing the host tab or the `#/party/play` tab loses the in-memory
  room/connection state (by design for Phase 1 — WebRTC connections don't
  survive a reload); reconnect-by-playerId only covers transient network
  drops while the tab stays open.
- `#/party/play` visited directly (no prior `#/join`) shows a "you haven't
  joined a room" state with a link back to `#/join`.
