# Pixel Tavern 🍺🎲

*(formerly "Pixel Party" — same project, new D&D-flavoured skin)*

โรงเตี๊ยมเกมปาร์ตี้พิกเซลสำหรับกลุ่ม (ออฟฟิศ/ห้องเรียน/งานอีเวนต์) — เปิดจอใหญ่เครื่องเดียว
เป็น **ผู้คุมเกม (GM)** สร้าง **โรงเตี๊ยม** เดียว นักผจญภัยทุกคนสแกน QR หรือกรอก
**รหัสห้อง** สั้นๆ จากมือถือของตัวเอง เลือกอาชีพนักผจญภัย เข้าร่วมครั้งเดียวแล้วอยู่ใน
โรงเตี๊ยมตลอดงาน — ผู้คุมเกมเลือกภารกิจจากล็อบบี้ทีละภารกิจ (แบบ Jackbox/GameBuddies)
หน้าจอนักผจญภัยจะสลับเข้าเกมอัตโนมัติ เมื่อภารกิจจบก็กลับมาที่โรงเตี๊ยมพร้อมคะแนนสะสม
("ตำนานประจำงาน") แล้วเลือกภารกิจถัดไปได้เลย ไม่ต้องกรอกรหัสซ้ำ ไม่ต้องติดตั้งแอป
ไม่ต้องสมัครสมาชิก เล่นได้ทุกวัย

Deployed as a static site on **GitHub Pages** — no backend server, players
connect peer-to-peer over WebRTC (PeerJS).

## รันโปรเจกต์ในเครื่อง (Run locally)

```bash
npm install
npm run dev       # http://localhost:5173
```

เปิดสองแท็บ/สองอุปกรณ์ในวง LAN เดียวกัน แท็บหนึ่งกด "สร้างโรงเตี๊ยม" อีกแท็บกรอกรหัสห้องเพื่อเข้าร่วม
(ใช้ PeerJS cloud broker สาธารณะโดย default — ต้องมีอินเทอร์เน็ต)

### ทดสอบ (Testing)

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest — room runtime, sprite/recolor engine, Dungeon Dash reducer + bots
npm run test:e2e    # playwright — full party flow + reload resilience, local PeerServer
npm run lint
```

`npm run test:e2e` starts a production build (`vite preview`) **and** a
local PeerServer (`npx peer`) automatically via Playwright's `webServer`
config, so it works offline / in sandboxes with no access to the public
PeerJS cloud. The app picks its signaling server from `?signal=host:port`
in the URL (what the e2e tests use) or `VITE_SIGNAL_HOST`/`VITE_SIGNAL_PORT`
at build time; with neither set it falls back to the public PeerJS cloud.
`?fast=1` shortens Dungeon Dash's 3s countdown to keep e2e runs quick.

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
                  and across a page reload (sessionStorage)
  hub/            landing page: hero (tavern banner + d20 mark), "join
                  with code" box, game (quest) catalogue
  core/
    net/          Transport interfaces (Host/Client) + PeerJS impl +
                  an in-memory LocalTransport used by unit tests
    room/         host-authoritative party-room runtime (players, bots,
                  lock, kick-bans, name filter, reconnect, phase
                  lobby/in-game, cumulative party scores, localStorage
                  snapshot for host-reload recovery) + the versioned wire
                  protocol
    ui/           shared pixel UI kit (Button, Panel, Input, Modal, Toast,
                  Timer/CountdownRing, AvatarSprite, D20Spinner,
                  LargeTextToggle, MuteToggle, QR…)
    sprites/      pixel sprite engine (palette-indexed string grids →
                  cached canvases, for decorations + fallback avatars),
                  the hero/polymorph character catalogue, and the
                  hue-shift avatar recolor system
    audio/        ZzFX sound presets + persisted mute toggle
    storage/      safe localStorage helpers, player profile, player id
  games/
    types.ts      the GameModule plugin contract
    registry.ts   GameManifest list + lazy loader for ready games
    quiz-race/    "Dungeon Dash" — the built game (id kept as `quiz-race`):
      logic/      pure reducer (state machine + scoring), pure view
                  projection (host/player), pure seeded-RNG bot policy —
                  all fully unit-tested, no DOM
      content/    3 built-in Thai question packs (JSON, validated) +
                  localStorage-backed custom packs
      setupConfig.ts  host's last-used setup, persisted
      views/      HostView (setup/countdown/question/reveal/podium + race
                  track), PlayerView, in-browser quiz Editor
public/assets/pixellab/
  heroes/         12 hero-class PNGs (primary avatars)
  polymorph/      13 critter PNGs (secondary avatar tab, from Phase 1)
  scenes/         tavern-bg (hub/lobby hero banner), dungeon-bg (race track)
  items/          d20 (brand mark + loading spinner), treasure-chest,
                  trophy, finish-flag
  README.md       how to override any sprite with your own PixelLab PNG
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
`ctx.endGame(results)` (or the host presses "กลับโรงเตี๊ยม"), those results
are tallied into `partyScores` and everyone returns to the lobby together.

**Bots**: the host can add up to 10 "นักผจญภัย NPC" from the lobby — plain
`RoomPlayer` entries with `isBot: true` and no transport. A `GameHost`
treats them like any other player; Dungeon Dash schedules a bot's answer
(correct-chance by difficulty, random delay) through the shared `onTick`
loop using a pure, seeded-RNG decision function (`logic/bots.ts`).

**Reload resilience**: `RoomHost` persists a JSON snapshot (players, party
scores, active game id + its `serialize()`d state) to localStorage on
every meaningful change. A host reload on `#/party/host` detects a fresh
(<30 min) snapshot and offers "กู้คืนห้อง #CODE ต่อไหม?" — restoring re-opens
the *same* PeerJS id, retrying for ~15s while the signaling server frees
it. Players persist `{roomCode, playerId, profile}` to `sessionStorage`
and silently reconnect with the same identity (and score) on reload of
`#/join` or `#/party/play`.

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
  onHostAction?(action: unknown): void;   // host-only control channel (setup, start, next…)
  onTick?(nowMs: number): void;           // shared clock for timers/bot scheduling
  start?(): void;
  getHostView(): View;                    // rendered on the host's (projector) screen
  getPlayerView(playerId: string): View;  // sent to that one player
  serialize?(): unknown;                  // JSON-safe snapshot for reload recovery
  dispose?(): void;
}
interface GameModule {
  manifest: GameManifest;
  createHost(ctx: GameHostContext, restoreState?: unknown): GameHost;
  HostView: ComponentType<{ view: unknown; onHostAction: (a: unknown) => void; onBackToLobby: () => void }>;
  PlayerView: ComponentType<{ view: unknown; sendIntent: (intent: unknown) => void }>;
}
```

### วิธีเพิ่มเกมใหม่ (Adding a new game)

1. Create `src/games/<your-game>/manifest.ts` exporting a `GameManifest`
   (id, Thai/English titles, player range, duration, tags, `status: 'ready'`).
2. Write your host-authoritative logic as a class/factory implementing
   `GameHost` — pure state + `ctx.getPlayers()`/`ctx.endGame(results)`, no
   DOM, so it's easy to unit test (see `games/quiz-race/logic/reducer.test.ts`
   and `core/room/room.test.ts` for the patterns). Implement `serialize()`
   if you want reload recovery to work for your game.
3. Build `HostView` (rendered on the host/projector screen; call
   `onHostAction(...)` for host-only controls) and `PlayerView` (rendered
   on each phone; call `sendIntent(...)` to send player actions back to
   the host) as Preact components.
4. Export a `GameModule` from `src/games/<your-game>/index.ts` and add it
   to `GAME_MANIFESTS` + the `loadGameModule` switch in
   `src/games/registry.ts`.
5. Draw a thumbnail from existing hero/polymorph/item/decor ids
   (`thumbnailSprites`) or add new ones in `core/sprites`.

### PixelLab asset override

All sprites are drawn in code by default (works with zero image assets).
Hero classes, polymorph critters, tavern/dungeon scenes and items now ship
as real PixelLab PNG art in `public/assets/pixellab/`. To override any
sprite (or add a new one) with your own PixelLab PNG without touching
code, see `public/assets/pixellab/README.md`.

## Known limitations

- The other four games (Scroll Sketch, Crystal Reveal, Tavern Bingo,
  Mimic's Lie) are "coming soon" cards only (manifests, no logic).
- Reload recovery is single-room-per-browser (one localStorage snapshot
  key) and best-effort: a host snapshot older than 30 minutes is not
  offered, and restoring re-opens the same PeerJS id with retries for
  ~15s — on a slow/unlucky signaling server it can still fail, in which
  case the host falls back to a fresh room.
- `#/party/play` visited directly with no saved session (no prior
  `#/join` on this device) shows a "you haven't joined a room" state with
  a link back to `#/join`.
- The name filter and bot "fantasy name" pool are small, illustrative word
  lists, not a production-grade moderation system.
