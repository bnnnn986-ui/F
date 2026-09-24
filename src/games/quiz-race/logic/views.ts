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
  return { text: q.text, choices: q.choices };
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

function answerDistribution(state: DungeonDashState): number[] | null {
  const q = state.questions[state.currentIndex];
  if (!q || state.phase !== 'reveal') return null;
  const counts = new Array(q.choices.length).fill(0);
  for (const p of Object.values(state.players)) {
    const a = p.answers[state.currentIndex];
    if (a) counts[a.choiceIndex] = (counts[a.choiceIndex] ?? 0) + 1;
  }
  return counts;
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
  /** Only populated once phase is 'reveal' (or 'podium', for the last question shown). */
  revealCorrectIndex: number | null;
  timeLimitMs: number;
  deadlineAt: number | null;
  answeredCount: number;
  eligibleCount: number;
  distribution: number[] | null;
  runners: RunnerView[];
  leaderboard: ReturnType<typeof getLeaderboard>;
  podiumStats: PodiumStats | null;
}

export function buildHostView(state: DungeonDashState): HostViewPayload {
  const q = state.questions[state.currentIndex];
  const eligible = Object.values(state.players).filter((p) => p.connected && p.joinedAtIndex <= state.currentIndex);
  const answeredCount = eligible.filter((p) => state.currentIndex in p.answers).length;

  return {
    phase: state.phase,
    questionIndex: state.currentIndex,
    totalQuestions: state.questions.length,
    question: toSafeQuestion(state, state.currentIndex),
    revealCorrectIndex: state.phase === 'reveal' || state.phase === 'podium' ? (q?.correctIndex ?? null) : null,
    timeLimitMs: state.config.secondsPerQuestion * 1000,
    deadlineAt: state.phaseEndsAt,
    answeredCount,
    eligibleCount: eligible.length,
    distribution: answerDistribution(state),
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
  result: { correct: boolean; points: number; correctIndex: number } | null;
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

  const revealResult =
    state.phase === 'reveal' && currentAnswer && q
      ? { correct: currentAnswer.correct, points: currentAnswer.points, correctIndex: q.correctIndex }
      : null;

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
