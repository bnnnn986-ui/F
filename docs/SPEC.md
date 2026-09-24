# Pixel Tavern (formerly Pixel Party) — Product & Technical Spec

A fantasy-tavern-themed **party game hub** for group activities (offices,
schools, events). One person opens the hub and **creates a party room →
becomes the ผู้คุมเกม (GM / host)**. Everyone else joins once from their own
phone/laptop with a short **room code** or **QR**, picks a hero class, and
stays in the tavern lobby while the host picks games (quests) from the
lobby one after another — Jackbox/GameBuddies style, not one room per game.
No accounts, no installs. Deployed as a static site on **GitHub Pages**.

Target users: every age (kids → older staff), friendly D&D flavour — not
scary. UI language: **Thai first** (short English sub-labels are fine for
game names). Big touch targets, one decision per screen, never more than 2
taps to join a room.

## Market reference (what similar products do)

| Product | Model | Games we learn from |
|---|---|---|
| Kahoot | host screen + phones, room PIN | quiz with timer, points by speed, streaks, podium |
| Jackbox | TV + phones, 4-letter room code | Quiplash, Drawful, Trivia Murder Party |
| Gartic Phone / skribbl.io | browser room link | drawing telephone, draw & guess |
| CrowdParty / GameBuddies / PartyPlay | free browser hubs, room code | trivia, bingo, icebreakers, deduction |
| PixReveal | pixel-art guessing, Jackbox-style | reveal-the-pixel-picture guessing |

Takeaways we copy: short room code + QR, big host screen for projector,
phone as controller, lobby with avatars, fast rounds (≤ 20 s), leaderboard
between rounds, final podium, instant replay — plus our own twist: **one
persistent party room** the host reuses across every game of the night,
with a cumulative "ตำนานประจำงาน" (party) leaderboard.

## Games roadmap (hub cards)

1. **ดันเจี้ยนแดช · Dungeon Dash** (was "Quiz Race") — *built first (MVP)*.
   Kahoot-style quiz; every correct answer dashes your hero through a
   torch-lit dungeon corridor toward the treasure chest. See
   `docs/games/quiz-race.md` for full mechanics/scoring (unchanged; only
   the fantasy theming/naming layer is new).
2. ม้วนคัมภีร์ปริศนา · Scroll Sketch (was "Pixel Draw & Guess") — "coming soon".
3. ลูกแก้วพยากรณ์ · Crystal Reveal (was "Pixel Reveal") — "coming soon".
4. บิงโกโรงเตี๊ยม · Tavern Bingo (was "Office Bingo") — "coming soon".
5. มิมิคจอมหลอก · Mimic's Lie (was "Two Truths & a Lie") — "coming soon".

Game **ids stay stable** across the re-theme (e.g. `quiz-race`,
`pixel-draw-guess`) — only display copy/thumbnails changed.

## Characters & recolor system

Players pick a **hero class** (12: fighter/wizard/rogue/cleric/ranger/
dwarf/bard/barbarian/paladin/druid/monk/warlock) or, on a second tab, a
**polymorph** critter (the 13 Phase-1 animals, now a secondary option). An
avatar is `{ base: characterId, tint: 0-7 }`: `core/sprites/recolor.ts`
hue-shifts only the "outfit" pixels of the PixelLab PNG at render time
(skin tones and near-grey/metal/outline pixels are skipped so faces and
armor trim always look natural), so 8 players can each look distinct from
one base PNG — no more art needed for bigger groups. If two connected
players pick the same class+tint, the host auto-bumps the later joiner's
tint and tells them why via a toast.

## Architecture (built to scale)

```
src/
  app/            router (hash-based, GH Pages safe), party-room screens
                  (host / join / play), partyClientStore (keeps the
                  player's connection alive across #/join → #/party/play)
  hub/            hub page, game cards, join-by-code panel
  core/
    net/          Transport interfaces + PeerJS implementation
    room/         generic host-authoritative party-room runtime (lobby,
                  players, bots, kick-bans, name filter, reconnect,
                  phase lobby/in-game, cumulative party scores, host-side
                  localStorage snapshot for reload recovery) — game agnostic
    ui/           shared pixel UI components (Button, Panel, Avatar, Timer,
                  D20 spinner, large-text toggle…)
    sprites/      pixel sprite engine: sprites as palette-indexed strings →
                  canvas/data URL (decorations + fallback avatars); real
                  PixelLab PNG heroes/polymorphs + the hue-shift recolorer
    audio/        retro SFX (ZzFX), mute toggle
    storage/      safe localStorage helpers
  games/
    registry.ts   list of GameManifest (id, title, desc, players, status,
                  thumbnail, lazy load())
    quiz-race/     "Dungeon Dash" — the built game:
      logic/      PURE state machine (reducer) — no DOM, fully unit-tested;
                  plus pure view-projection (never leaks the correct answer
                  before reveal) and a pure, seeded-RNG bot-answer policy
      content/    built-in Thai question packs (JSON) + custom-pack storage
      views/      HostView (setup/countdown/question/reveal/podium + race
                  track), PlayerView, in-browser quiz Editor
public/assets/pixellab/
  heroes/         12 hero PNGs (primary avatars)
  polymorph/      13 critter PNGs (secondary avatar tab)
  scenes/         tavern-bg (hub/lobby), dungeon-bg (race track)
  items/          d20 (brand mark/spinner), treasure-chest, trophy, finish-flag
```

Key rules:
- **One party room per host**, not one room per game: `RoomHost` tracks a
  `phase` (`'lobby' | 'in-game'`), the `activeGameId`, and cumulative
  `partyScores`. The host picks a game from the lobby; `GameHost`s are
  mounted/unmounted by `startGame`/`endGame`, and a game reports its final
  standings back via `ctx.endGame(results)`, which tallies into
  `partyScores` and returns everyone to the lobby together.
- **Host-authoritative**: the host browser runs the game reducer; players
  send *intents* (`answer`…); host broadcasts *per-player views* built by a
  pure projection function. Players never see correct answers before reveal.
- **Bots ("นักผจญภัย NPC")**: host-side players with no transport
  (`RoomPlayer.isBot`), added/removed from the party lobby (max 10). A
  game's `GameHost` sees them like any other player via `ctx.getPlayers()`
  and drives their behaviour itself (Dungeon Dash: a pure, seeded-RNG
  decision function per difficulty, scheduled through the shared `onTick`
  loop) — no bot-specific wiring needed in the room runtime.
- **Reload resilience**: the room runtime persists a JSON snapshot
  (players, party scores, active game + its `serialize()`d state) to
  localStorage on every meaningful change; a host reload offers to restore
  the same room code (retrying the PeerJS `open()` for ~15s while the
  signaling server frees the old id). Players persist their own session
  (room code + playerId + profile) to sessionStorage and silently
  reconnect on reload.
- **Transport is an interface.** v1 = PeerJS (WebRTC P2P, free public signaling
  server, works on static hosting). Later we can swap to a WebSocket server
  (e.g. Colyseus / PartyKit / Supabase Realtime) without touching game code.
  Signaling server is configurable via URL/env so tests use a local PeerServer.
- **Games are plugins** implementing a common `GameModule` contract
  (`createHost(ctx, restoreState?)`, `HostView`, `PlayerView`) and are
  lazy-loaded from the registry — adding a game = adding a folder + manifest.
- Protocol messages are versioned and typed (discriminated unions).
- Display names are passed through a small profanity filter
  (`core/room/nameFilter.ts`); a hit is swapped for a random fantasy name
  and the player is told via toast, not rejected.

## Stack
Vite + TypeScript (strict) + Preact (tiny React-compatible) · PeerJS ·
`qrcode` · ZzFX (retro sounds) · canvas-confetti · @fontsource fonts
(bundled, no external font CDN; pixel display font is Latin/number-only —
Thai and anything with parentheses always renders in Kanit) · Vitest
(unit) · Playwright (e2e) · `peer` (local PeerServer for e2e) · GitHub
Actions → GitHub Pages.
