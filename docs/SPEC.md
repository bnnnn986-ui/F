# Pixel Party — Product & Technical Spec

A pixel-art **game hub** for group activities (offices, schools, events).
One person opens a game and **creates a room → becomes the host**. Everyone
else joins from their own phone/laptop with a short **room code** or **QR**.
No accounts, no installs. Deployed as a static site on **GitHub Pages**.

Target users: every age (kids → older staff). UI language: **Thai first**
(short English sub-labels are fine for game names). Big touch targets,
one decision per screen, never more than 2 taps to join a room.

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
between rounds, final podium, instant replay.

## Games roadmap (hub cards)

1. **ควิซวิ่งแข่ง · Quiz Race** — *built first (MVP)*. Kahoot-style quiz; every
   correct answer moves your pixel runner forward on a race track.
2. วาดทายคำ · Pixel Draw & Guess — "coming soon" card.
3. เปิดภาพปริศนา · Pixel Reveal — "coming soon" card.
4. บิงโกออฟฟิศ · Office Bingo — "coming soon" card.
5. ใครโกหก · Two Truths & a Lie — "coming soon" card.

## Architecture (built to scale)

```
src/
  app/            router (hash-based, GH Pages safe), app shell
  hub/            hub page, game cards, join-by-code panel
  core/
    net/          Transport interfaces + PeerJS implementation
    room/         generic host-authoritative Room runtime (lobby, players,
                  reconnect, message routing) — game agnostic
    ui/           shared pixel UI components (Button, Panel, Avatar, Timer…)
    sprites/      pixel sprite engine: sprites as palette-indexed strings →
                  canvas / data URL; avatar generator
    audio/        retro SFX (ZzFX), mute toggle
    storage/      safe localStorage helpers
  games/
    registry.ts   list of GameManifest (id, title, desc, players, status,
                  thumbnail, lazy load())
    quiz-race/
      logic/      PURE state machine (reducer) — no DOM, fully unit-tested
      content/    built-in Thai question packs (JSON)
      views/      HostView, PlayerView, Editor
public/assets/pixellab/   drop-in slot for PixelLab-generated PNGs
```

Key rules:
- **Host-authoritative**: the host browser runs the game reducer; players send
  *intents* (`answer`, `ready`…); host broadcasts *per-player views*. Players
  never see correct answers before reveal.
- **Transport is an interface.** v1 = PeerJS (WebRTC P2P, free public signaling
  server, works on static hosting). Later we can swap to a WebSocket server
  (e.g. Colyseus / PartyKit / Supabase Realtime) without touching game code.
  Signaling server is configurable via URL/env so tests use a local PeerServer.
- **Games are plugins** implementing a common `GameModule` contract and are
  lazy-loaded from the registry — adding a game = adding a folder + manifest.
- Protocol messages are versioned and typed (discriminated unions).

## Stack
Vite + TypeScript (strict) + Preact (tiny React-compatible) · PeerJS ·
`qrcode` · ZzFX (retro sounds) · canvas-confetti · @fontsource fonts
(bundled, no external font CDN) · Vitest (unit) · Playwright (e2e) ·
`peer` (local PeerServer for e2e) · GitHub Actions → GitHub Pages.
