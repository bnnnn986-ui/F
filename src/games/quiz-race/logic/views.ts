import { getLeaderboard, getMaxPossibleScore } from './reducer';
import type { DungeonDashState, DungeonPlayerState } from './types';

/** Question shape sent to clients — deliberately has NO correctIndex. */
export interface SafeQuestion {
  text: string;
  choices: string[];
}

function toSafeQuestion(state: DungeonDashState, index: number): SafeQuestion | null {
  const q = state.questions[index];
  if (!q) return null;
  // During the "read" phase the question text is shown but answers stay hidden
  // (on host AND phones) until answering opens.
  return { text: q.text, choices: state.phase === 'read' ? [] : q.choices };
}

export interface RunnerView {
  playerId: string;
  name: string;
  avatarId: string;
  tint: number;
  connected: boolean;
  score: number;
  streak: number;
  /** 0-1 progress along the race track. */
  progress: number;
}

function buildRunners(state: DungeonDashState): RunnerView[] {
  const maxScore = getMaxPossibleScore(state);
  return Object.values(state.players)
    .sort((a, b) => a.joinedAtIndex - b.joinedAtIndex)
    .map((p) => ({
      playerId: p.playerId,
      name: p.name,
      avatarId: p.avatarId,
      tint: p.tint,
      connected: p.connected,
      score: p.score,
      streak: p.streak,
      progress: Math.min(1, p.score / maxScore),
    }));
}

function answerCounts(state: DungeonDashState, choiceCount: number): number[] {
  const counts = new Array(choiceCount).fill(0);
  for (const p of Object.values(state.players)) {
    const a = p.answers[state.currentIndex];
    if (a) counts[a.choiceIndex] = (counts[a.choiceIndex] ?? 0) + 1;
  }
  return counts;
}

function answerDistribution(state: DungeonDashState): number[] | null {
  const q = state.questions[state.currentIndex];
  if (!q || state.phase !== 'reveal') return null;
  return answerCounts(state, q.choices.length);
}

export interface AnswerVoter {
  playerId: string;
  name: string;
  avatarId: string;
  tint: number;
}

/** Kahoot-style avatar stack per answer option, for the host reveal bar chart. */
function answerVoters(state: DungeonDashState): AnswerVoter[][] | null {
  const q = state.questions[state.currentIndex];
  if (!q || state.phase !== 'reveal') return null;
  const buckets: AnswerVoter[][] = q.choices.map(() => []);
  for (const p of Object.values(state.players).sort((a, b) => a.joinedAtIndex - b.joinedAtIndex)) {
    const a = p.answers[state.currentIndex];
    if (a && buckets[a.choiceIndex]) {
      buckets[a.choiceIndex]!.push({ playerId: p.playerId, name: p.name, avatarId: p.avatarId, tint: p.tint });
    }
  }
  return buckets;
}

export interface PodiumStats {
  mostAccurate: { playerId: string; name: string; correctCount: number; totalQuestions: number } | null;
  fastest: { playerId: string; name: string; avgMs: number } | null;
  longestStreak: { playerId: string; name: string; streak: number } | null;
}

function computePodiumStats(state: DungeonDashState): PodiumStats {
  const players = Object.values(state.players);
  let mostAccurate: PodiumStats['mostAccurate'] = null;
  let fastest: PodiumStats['fastest'] = null;
  let longestStreak: PodiumStats['longestStreak'] = null;

  for (const p of players) {
    if (p.answeredCount === 0) continue;
    if (!mostAccurate || p.correctCount > mostAccurate.correctCount) {
      mostAccurate = { playerId: p.playerId, name: p.name, correctCount: p.correctCount, totalQuestions: state.questions.length };
    }
    const avgMs = p.totalAnswerMs / p.answeredCount;
    if (p.correctCount > 0 && (!fastest || avgMs < fastest.avgMs)) {
      fastest = { playerId: p.playerId, name: p.name, avgMs };
    }
    if (!longestStreak || p.bestStreak > longestStreak.streak) {
      longestStreak = { playerId: p.playerId, name: p.name, streak: p.bestStreak };
    }
  }
  return { mostAccurate, fastest, longestStreak };
}

export interface HostViewPayload {
  phase: DungeonDashState['phase'];
  questionIndex: number;
  totalQuestions: number;
  question: SafeQuestion | null;
  /** Only populated once phase is 'reveal'/'leaderboard' (or 'podium', for the last question shown). */
  revealCorrectIndex: number | null;
  timeLimitMs: number;
  deadlineAt: number | null;
  /** True while the host has paused the game (timers frozen). */
  paused: boolean;
  /** "เดินเกมอัตโนมัติ" — whether reveal/leaderboard auto-advance without the host pressing a button. */
  autoPlay: boolean;
  answeredCount: number;
  eligibleCount: number;
  distribution: number[] | null;
  /** Kahoot-style avatar stack of who picked each option — only populated on 'reveal'. */
  voters: AnswerVoter[][] | null;
  runners: RunnerView[];
  leaderboard: ReturnType<typeof getLeaderboard>;
  podiumStats: PodiumStats | null;
}

export function buildHostView(state: DungeonDashState): HostViewPayload {
  const q = state.questions[state.currentIndex];
  const eligible = Object.values(state.players).filter((p) => p.connected && p.joinedAtIndex <= state.currentIndex);
  const answeredCount = eligible.filter((p) => state.currentIndex in p.answers).length;
  const answerRevealed = state.phase === 'reveal' || state.phase === 'leaderboard' || state.phase === 'podium';

  return {
    phase: state.phase,
    questionIndex: state.currentIndex,
    totalQuestions: state.questions.length,
    question: toSafeQuestion(state, state.currentIndex),
    revealCorrectIndex: answerRevealed ? (q?.correctIndex ?? null) : null,
    timeLimitMs: state.config.secondsPerQuestion * 1000,
    deadlineAt: state.phaseEndsAt,
    paused: state.pausedAt !== null,
    autoPlay: state.autoPlay,
    answeredCount,
    eligibleCount: eligible.length,
    distribution: answerDistribution(state),
    voters: answerVoters(state),
    runners: buildRunners(state),
    leaderboard: getLeaderboard(state),
    podiumStats: state.phase === 'podium' ? computePodiumStats(state) : null,
  };
}

export interface PlayerViewPayload {
  phase: DungeonDashState['phase'];
  questionIndex: number;
  totalQuestions: number;
  question: SafeQuestion | null;
  deadlineAt: number | null;
  timeLimitMs: number;
  isSpectator: boolean;
  hasAnswered: boolean;
  lockedChoiceIndex: number | null;
  /** This player's own result for the question just revealed — never present before 'reveal'. */
  result: {
    correct: boolean;
    points: number;
    correctIndex: number;
    /** Kahoot-style "คนส่วนใหญ่ตอบ … (60%)" — the choice picked by the most players, and its share. */
    majorityChoiceIndex: number | null;
    majorityPercent: number;
  } | null;
  rank: number | null;
  totalPlayers: number;
  score: number;
  streak: number;
  podiumStats: PodiumStats | null;
  podiumTitleTh: string | null;
}

const PODIUM_TITLES_TH = [
  'จ้าวดันเจี้ยน!',
  'นักผจญภัยดาวรุ่ง!',
  'วีรบุรุษอันดับ 3!',
  'นักสู้ผู้ไม่ย่อท้อ',
  'ยังไงก็มีของรางวัลใจ',
];

function podiumTitle(rank: number): string {
  return PODIUM_TITLES_TH[Math.min(rank - 1, PODIUM_TITLES_TH.length - 1)] ?? 'นักผจญภัย';
}

export function buildPlayerView(state: DungeonDashState, playerId: string): PlayerViewPayload {
  const player: DungeonPlayerState | undefined = state.players[playerId];
  const board = getLeaderboard(state);
  const rankEntry = board.find((e) => e.player.playerId === playerId);
  const isSpectator = player ? player.joinedAtIndex > state.currentIndex : false;
  const currentAnswer = player?.answers[state.currentIndex] ?? null;
  const q = state.questions[state.currentIndex];

  const revealResult = (() => {
    if (state.phase !== 'reveal' || !currentAnswer || !q) return null;
    const counts = answerCounts(state, q.choices.length);
    const total = counts.reduce((a, b) => a + b, 0);
    let majorityChoiceIndex: number | null = null;
    let max = -1;
    counts.forEach((c, i) => {
      if (c > max) {
        max = c;
        majorityChoiceIndex = i;
      }
    });
    const majorityPercent = total > 0 && majorityChoiceIndex !== null ? Math.round(((counts[majorityChoiceIndex] ?? 0) / total) * 100) : 0;
    return {
      correct: currentAnswer.correct,
      points: currentAnswer.points,
      correctIndex: q.correctIndex,
      majorityChoiceIndex: total > 0 ? majorityChoiceIndex : null,
      majorityPercent,
    };
  })();

  return {
    phase: state.phase,
    questionIndex: state.currentIndex,
    totalQuestions: state.questions.length,
    question: toSafeQuestion(state, state.currentIndex),
    deadlineAt: state.phaseEndsAt,
    timeLimitMs: state.config.secondsPerQuestion * 1000,
    isSpectator,
    hasAnswered: currentAnswer !== null,
    lockedChoiceIndex: currentAnswer?.choiceIndex ?? null,
    result: revealResult,
    rank: rankEntry?.rank ?? null,
    totalPlayers: board.length,
    score: player?.score ?? 0,
    streak: player?.streak ?? 0,
    podiumStats: state.phase === 'podium' ? computePodiumStats(state) : null,
    podiumTitleTh: state.phase === 'podium' && rankEntry ? podiumTitle(rankEntry.rank) : null,
  };
}
