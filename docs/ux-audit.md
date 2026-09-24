# UX audit — Phase 4, Track C

Screen-by-screen pass over the whole app: hub, join/setup, lobby, in-game
(host + player), podium/report, and the device/PWA chrome around them.
Screenshots taken at 1920×1080, 1440×900, 390×844 (also emulated as iPhone
SE / iPhone 13), 360×740, and Pixel 7, saved under
`scratchpad/shots/phase4/trackC/` during this pass (not committed — they're
throwaway review artifacts, regenerate with the snippets below if needed).

Design-system changes that apply everywhere (listed once, referenced below):
- **Spacing/type tokens** added to `core/ui/theme.css` (`--pp-space-1..8`,
  `--pp-text-xs..3xl`, `--pp-btn-h-sm/md/lg`, `--pp-icon-sm/md/lg`) and wired
  into `PixelButton` (`size="sm|md|lg"`, exact 36/48/64px heights; `big` is
  now an alias for `lg`) and `.host-actions-row` (equal-width button groups).
- **`.pixel-avatar`** (and every sprite wrapper that used it) lost its boxed
  background/border and gained a small pixel-ellipse drop shadow under the
  feet (`::after` radial-gradient) — avatars now read as characters
  standing on the ground, not icons in a frame.
- **Avatar-picker cells**: selection now shows a gold outline **glow**
  (`box-shadow` in `--pp-gold-glow`), not just a flat border/tint.
- **Hub "coming soon" cards**: thumbnails now compose real PixelLab heroes
  + an item per game (e.g. Scroll Sketch → bard + wizard + d20; Tavern
  Bingo → dwarf + cleric + trophy) instead of arbitrary polymorph-critter
  placeholders, and the whole disabled card is desaturated
  (`grayscale(0.85)`) under the existing "เร็วๆ นี้" ribbon.

## Hub (`hub/HubPage.tsx`)
- **Issue**: "สร้างโรงเตี๊ยม" had no offline guard (join already did) — a
  host with no connection would tap it and hit an opaque PeerJS failure a
  few seconds later.
  **Fix**: `useOnlineStatus()` disables the button and shows
  `OFFLINE_MESSAGE_TH` under it, matching the join panel.
- **Issue**: "coming soon" thumbnails used unrelated critter sprites (see
  above). **Fix**: themed hero+item composites, desaturated.
- Install button and mute/haptics/large-text toggles already present in the
  header; left as-is (already compact, no emoji).

## Join / room code + avatar picker (`hub/JoinPanel.tsx`, `lobby/PlayerForm.tsx`, `lobby/AvatarPicker.tsx`)
- **Issue**: selected avatar-picker cell was hard to spot at a glance (flat
  tint only). **Fix**: gold glow (see above).
- **Issue**: avatar sprite sat in a boxed panel that fought with the
  character's own silhouette. **Fix**: transparent `.pixel-avatar` + ground
  shadow (see above) — same fix reused by every avatar anywhere
  (host roster, player lobby, leaderboard, podium, race track).
- Works down to 360px without horizontal scroll; inputs already ≥16px.

## Host lobby (`lobby/HostLobby.tsx`)
- **Issue**: no "Kahoot-style" hero header — just a small room-code panel
  with modest type, no join-URL text, small QR, narrow (900px) column with
  large amounts of unused width on wide/projector viewports.
  **Fix**: rebuilt as a centred header: "เข้าร่วมที่ `<host>/<path>`" line,
  a huge `pixel-num`/Jersey-10 room code (`clamp(3rem, 10vw, 7rem)`) next to
  the QR at matching height, QR is now a button ("tap to enlarge") that
  opens a fullscreen overlay version sized to the viewport; action buttons
  (copy link / **share** / lock) moved into one consistent
  `.host-actions-row` group below. Container widened to 1200px max.
- **New**: "แชร์" (Web Share, `shareJoinLink`) button next to copy-link —
  Track B's `shareJoinLink` helper was implemented but never wired in.
- **New**: "โฮสต์ร่วมเล่นด้วย" toggle panel — see "Host-plays" section below.
- Player roster grid unchanged structurally (already chip-like: avatar +
  name + kick), now benefits from the transparent-avatar fix.
- **Known gap**: the header is still a centred card, not edge-to-edge —
  on 1920×1080 there's dead space left/right of the panel. True
  edge-to-edge projector chrome (background art filling the gutters) is
  not done; tracked as follow-up, not attempted further this pass to keep
  the room for the higher-priority items below.

## Host in-game screens — question / read / reveal / leaderboard (`games/quiz-race/views/HostView.tsx`, `quizrace.css`)
- **Issue**: reveal bars were described as "true bars" in the Track A
  commit but the "ดูอันดับ" control sat in a large empty block on the left
  with no explicit alignment. **Fix**: wrapped in `.quiz-next-row` with
  `justify-content: flex-end` (bottom-right on desktop, full-width on
  narrow screens) instead of an implicit static position.
- **Issue**: the generic host control bar (pause/skip/end) was visible in
  **every** phase, including setup and podium, where it doesn't apply.
  **Fix**: `HostControlBar` takes the mounted game's `phase` and returns
  `null` outside `countdown/read/question/reveal/leaderboard`.
- **Issue**: on phones the control bar's icon-only buttons crowded the
  top-right corner and covered content. **Fix**: below 640px it collapses
  to a single "เมนูโฮสต์" button in the thumb zone (bottom-right, safe-area
  aware) that opens a bottom sheet with the same actions at full width.
- **New**: a small room-code badge appears top-left during
  countdown/…/leaderboard (not setup) — Jackbox-style "what room am I in"
  reminder, safe-area aware.
- **Known gap**: the question/reveal card is still a centred ~960px column
  with visible letterboxing on 1920×1080/1440×900, not a true full-bleed
  16:9 layout (`clamp(...)`-scaled to the whole viewport). The race track
  is full-width already, but the question card above it is not. This is
  the largest remaining Track C item — flagged for a follow-up pass;
  everything above it (bars, control bar, room code, avatars) is done and
  independent of it.

## Host-plays: "โฮสต์ร่วมเล่นด้วย" (new)
- Toggle lives in the host lobby (`PixelPanel` under the roster). Default
  is **ON** on narrow viewports (`< 640px`) and **OFF** on wide ones
  (`core/storage/hostPlays.ts`, `defaultHostPlays()`), an explicit choice
  always wins and persists.
- When it turns on (including the automatic first prompt on a phone-width
  create-room flow), a `PlayerForm` modal ("ร่วมเล่นในนามใคร?") asks for
  name + avatar, then `RoomHost.addLocalPlayer()` adds the host as a real
  `RoomPlayer` (not a bot) driven by direct calls instead of a transport.
- During a game, the host's own answer UI (`activeModule.PlayerView`) is
  rendered inside `.host-embedded-player`, fed by
  `RoomHost.getLocalPlayerView()` — which is a **direct pass-through to
  the same `GameHost.getPlayerView(playerId)`** every remote phone gets.
  That routing is what makes "never reveals the correct answer before
  reveal" a structural guarantee rather than a UI convention: quiz-race's
  `buildPlayerView` is unit-tested (`logic/reducer.test.ts`, "view layer:
  … never leaks the correct answer") to never attach `correctIndex` before
  reveal, and the host's embedded view goes through the exact same
  function. Covered by a new `RoomHost` unit test
  (`core/room/room.test.ts`) asserting `getLocalPlayerView()` calls that
  same `getPlayerView(playerId)`, plus a new e2e
  (`e2e/mobile-host-plays.spec.ts`, iPhone 13 emulation) that plays a full
  host-plays round to the podium and checks the embedded tiles carry no
  "locked/correct" marker before the host answers.
- `defaultAutoPlay()` in `games/quiz-race/index.ts` now reads
  "โฮสต์ร่วมเล่นด้วย" instead of raw viewport width, per the brief
  ("autoplay defaults ON iff host-plays is ON").
- **Known gap**: the local player isn't persisted across a host page
  reload (the room snapshot doesn't carry `localPlayerId` yet) — after a
  host reload they'd need to re-toggle. Documented as a v1 limitation,
  consistent with the existing "host refresh → game lost (v1)" note in
  `docs/games/quiz-race.md`.

## Player in-game screen (`games/quiz-race/views/PlayerView.tsx`)
- **Issue**: on a phone the question screen left visible empty space above
  the question (content was vertically centred in a `min-height:100vh`
  column) instead of starting at the top with the primary action in the
  thumb zone. **Fix**: a `.screen-center--game` variant (`justify-content:
  flex-start`, safe-area top padding) plus `flex:1` on the question column
  so the 2×2 answer grid grows to fill the remaining height instead of
  leaving a gap at the bottom.
- **New**: answer tiles are an explicit 2×2 CSS grid filling available
  height in portrait (`≤480px` width, `≥500px` height), 4-in-a-row in
  landscape (`orientation: landscape and max-height: 480px`), matching the
  brief's phone layout spec (previously they just wrapped via
  `flex-wrap`).
- **New**: `haptic('lock')` on answer lock-in, `haptic('correct'|'wrong')`
  on the reveal result — Track B's `haptic()` helper existed but was never
  called from the game itself (only the mute/haptics toggle wired it).
- `touch-action: manipulation` and `overscroll-behavior: none` added to
  the question screen/tiles for game-screen viewport hygiene.

## Player lobby (`lobby/PlayerLobby.tsx`)
- **New**: "ชวนเพื่อน" (Web Share) button and a subtle
  `<InstallButton compact />` under the player's own card — both were
  implemented (Track B) but not present anywhere in the player lobby.

## Podium (host) (`games/quiz-race/views/HostView.tsx` `PodiumHost`)
- **Issue**: the 3 stat callouts ("แม่นยำที่สุด", "ตอบไวที่สุด",
  "สตรีคยาวที่สุด") were `auto-fit` panels of inconsistent width/shape;
  the full ranking was a plain unstyled `<ol>`; the button row mixed one
  `big` (64px) primary with two default-size secondaries.
  **Fix**: 3 equal `.quiz-podium__stat-card`s in one row (stacking to 1
  column only under 480px), the ranking is now a real `<table>` (rank /
  name / score columns, zebra striping, right-aligned score), and the
  action row is a single consistent size (`variant="primary"` still marks
  the one primary action, "กลับโรงเตี๊ยม", but no longer a different
  height than its siblings).

## Host control bar / mobile sheet, wake lock, update gate
- **New**: `useWakeLock(active)` wired on both `PartyHostScreen` (lobby +
  in-game) and `PartyPlayScreen` (connected) — Track B's hook existed but
  had no call site.
- **New**: `setHostGameBusy(true/false)` called from `PartyHostScreen` on
  `phaseChange`/unmount so the PWA update toast correctly defers while a
  host is running a game (previously always reported "not busy" from the
  host side, per the helper's own doc comment).

## Design-system sweep
- Buttons: `PixelButton` now has a real `size` prop (`sm`/`md`/`lg` =
  36/48/64px) instead of only a boolean `big`; every `.host-actions-row`
  lays out its children as an equal-width group. Existing call sites were
  left on their current variant/size choices except where explicitly
  called out above (podium action row); a full repo-wide re-pass of every
  button's size/one-primary-per-screen is not complete — flagged as
  follow-up.
- Icon sizes: `--pp-icon-sm/md/lg` tokens added (`pp-icon--lg` = 24px new);
  most existing call sites already used `--sm`/`--md` consistently, so
  they were left alone rather than mass-edited without visual review.

## Addendum: PM review pass (after the first screenshot round)
The PM reviewed the first batch of 1920×1080/1440×900/390×844 screenshots
and flagged four concrete issues, all addressed:
1. **Host lobby on ≥1280px was a narrow centred column with dead space on
   both sides.** Fixed: `.host-lobby-layout` switches to a 2-column CSS
   grid at `≥1280px` — left = join header (URL + huge code + QR, now
   280px) + player roster, right = bot/report actions, party scoreboard,
   team panel, game picker, start button. "คัดลอกลิงก์เข้าร่วม" shortened
   to "คัดลอกลิงก์" so the 3-button action row stays one line / equal
   height. **New `core/ui/Toggle.tsx`** — a pixel-styled switch (real
   `<input type=checkbox>` underneath for a11y, custom track/thumb) —
   replaces the unstyled native checkboxes for "โฮสต์ร่วมเล่นด้วย" and
   "เปิดโหมดทีม".
2. **Reveal bars were fixed ~80px boxes, card capped at ~950px on a 1920
   screen.** Fixed: `.quiz-question-host` drops its `max-width` at
   `≥1280px` (full width, matching the already-full-width race track);
   `.quiz-reveal-bars` height is now `clamp(320px, 40vh, 560px)` on wide
   screens (`clamp(220px, 32vh, 420px)` on smaller ones) so each bar's
   height is genuinely proportional to its vote count within a real chart
   area, not a fixed box; stub height for a 0-count bar bumped to 8px.
   Race-track runners scale up to 64px (1x native PixelLab resolution, an
   integer multiple) on `≥1280px` screens instead of staying fixed at 36px.
3. **Player answer-tile content (shape + label) sat at the top of each
   tall 2×2 tile instead of centred.** Root cause: the label `<span>`
   inherited `flex: 1` from the base (row-layout) plaque style, so in the
   column layout it grew to fill the tile and kept its text top-anchored
   inside that box. Fixed: the 2×2/landscape-4-up overrides now also set
   `flex: none` on the label and bump its and the shape's size slightly.
4. **Room-code badge during games was too small to read.** Fixed: now a
   labelled "รหัสห้อง `<CODE>`" pill (label + `pixel-num` code), 20px on
   phones, 28px Jersey-10 on `≥900px`.

## Not done this pass (tracked, not silently dropped)
1. Full edge-to-edge projector layout for the host lobby header and the
   question/reveal card (both now use the full viewport width and a real
   2-column/full-bleed layout on ≥1280px — see the addendum above — but
   there's still visible dark margin around the card itself rather than
   background art filling the gutters).
2. Local (host-plays) player identity surviving a host-side page reload.
3. A repo-wide icon-size/button-size consistency pass beyond the screens
   explicitly touched above.
