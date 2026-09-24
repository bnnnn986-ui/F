# ควิซวิ่งแข่ง · Quiz Race — Game Spec

Kahoot-style quiz where each player's pixel runner races along a track.
Target: 2–50 players, 5–15 minutes, all ages.

## Roles & screens
- **Host screen** (laptop/projector): shows question, answer tiles, timer,
  race track with every runner, answer distribution, leaderboard, podium.
  Host controls: start, skip/next, pause, end game, settings.
- **Player screen** (phone): shows the question text + 2–4 big coloured
  answer tiles with a pixel shape icon (▲ ◆ ● ■) so remote players
  (video call) can play without seeing the host screen. Then feedback.

## Game flow (host state machine)
`lobby → setup → countdown(3s) → question(N s) → reveal → leaderboard → … → podium`

1. **Setup** (host only, before start): choose question pack (built-in Thai
   packs or custom), number of questions (5/10/15/all), time per question
   (10/20/30 s), shuffle on/off. Remember last choice.
2. **Countdown**: "3-2-1-GO!" pixel animation + sfx, question number.
3. **Question**: text (+ optional emoji/pixel image), answers, timer bar,
   live "ตอบแล้ว 7/12" counter. Player taps once — answer locks, phone shows
   "ล็อกคำตอบแล้ว!" with a waiting animation. Ends when timer hits 0 OR
   everyone answered.
4. **Reveal**: correct tile highlighted, others dimmed, bar chart of how many
   picked each. Runners animate forward by points gained. Phone: big
   ✓ ถูก / ✗ ผิด, points earned, streak flame, current rank.
5. **Leaderboard** (top 5, animated re-ordering, "+ขึ้น 2 อันดับ"). Host taps
   "ถัดไป" (auto-advance optional after 8 s).
6. **Podium**: top 3 on pixel podium with crown, confetti, fanfare; full
   ranking list; stats (most accurate, fastest answer, longest streak).
   Host: "เล่นอีกครั้ง" (same players, reset scores) / "กลับหน้าหลัก".
   Player phone shows own rank and a fun title.

## Scoring (pure, unit-tested)
- Correct: `round(1000 * (1 - 0.5 * elapsed / timeLimit))` → 500–1000.
- Streak bonus: +100 per consecutive correct beyond the first, cap +500.
- Wrong / no answer: 0, streak resets.
- Answer time measured on the HOST (receive time − question start), so
  clients can't cheat; answers after deadline rejected; one answer per question.
- Ties broken by total answer time.

## Track visual
Horizontal lanes (host screen), one per player (≤ 12 visible lanes; beyond
that show top 10 + "และอีก N คน"), pixel ground tiles, finish flag, runner
position = score / maxPossibleScore. Runners play run animation while
moving, idle otherwise. Name tag above each runner.

## Content
- 3 built-in Thai packs × ≥ 15 questions: ความรู้รอบตัว (general),
  สนุกในออฟฟิศ (office fun / light), ประเทศไทยของเรา (Thailand) — family
  friendly, factual, 2–4 answers each, one correct.
- **Quiz editor** (host): create/edit/delete custom packs in the browser
  (localStorage), import/export JSON, validate. Simple form UI.

## Edge cases
- Player joins mid-game → becomes spectator until next question, gets 0 for
  missed questions. Player disconnects → keeps score, lane greyed, can rejoin.
- Host refresh → game lost (v1), show clear message to players.
- 0 players answered → still reveal.
- Late answers ignored.
