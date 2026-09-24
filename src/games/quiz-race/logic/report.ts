import type { Team } from '../../../core/room/protocol';
import { computeTeamScores } from './teamScoring';
import type { DungeonDashState } from './types';

export interface QuestionReportRow {
  index: number;
  text: string;
  correctChoiceText: string;
  correctCount: number;
  totalAnswered: number;
  percentCorrect: number; // 0-100, of totalAnswered
  distribution: number[]; // count per choice index
  avgResponseMs: number | null;
  isHardest: boolean; // < 50% correct (only among questions that got ≥1 answer)
}

export interface PlayerAnswerCell {
  questionIndex: number;
  choiceIndex: number | null;
  correct: boolean;
  elapsedMs: number | null;
  points: number;
}

export interface PlayerReportRow {
  playerId: string;
  name: string;
  isBot: boolean;
  teamName: string | null;
  rank: number;
  score: number;
  correctCount: number;
  totalQuestions: number;
  accuracyPct: number; // correctCount / totalQuestions * 100
  avgResponseMs: number | null; // average over answered questions only
  longestStreak: number;
  unansweredCount: number;
  answers: PlayerAnswerCell[];
}

export interface TeamReportRow {
  teamId: string;
  teamName: string;
  color: string;
  memberCount: number;
  avgScore: number;
  mvpName: string | null;
}

export interface AdventureReport {
  generatedAt: number;
  packNameTh: string;
  playerCount: number;
  questionCount: number;
  avgAccuracyPct: number;
  avgResponseMs: number | null;
  questions: QuestionReportRow[];
  players: PlayerReportRow[];
  teams: TeamReportRow[] | null;
}

/**
 * Pure state → report projection. Takes the same `DungeonDashState` the
 * reducer produces (already has every answer recorded), plus optional team
 * context, and builds a fully-computed, JSON-serializable report — no DOM,
 * fully unit-testable.
 */
export function buildAdventureReport(
  state: DungeonDashState,
  packNameTh: string,
  teams: Team[] | null = null,
  playerTeamOf: (playerId: string) => string | null = () => null,
): AdventureReport {
  const players = Object.values(state.players);
  const questionCount = state.questions.length;

  const questionRows: QuestionReportRow[] = state.questions.map((q, index) => {
    const answers = players.map((p) => p.answers[index]).filter((a): a is NonNullable<typeof a> => !!a);
    const totalAnswered = answers.length;
    const correctCount = answers.filter((a) => a.correct).length;
    const percentCorrect = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const distribution = new Array(q.choices.length).fill(0);
    for (const a of answers) distribution[a.choiceIndex] = (distribution[a.choiceIndex] ?? 0) + 1;
    const avgResponseMs = totalAnswered > 0 ? Math.round(answers.reduce((s, a) => s + a.elapsedMs, 0) / totalAnswered) : null;
    return {
      index,
      text: q.text,
      correctChoiceText: q.choices[q.correctIndex] ?? '',
      correctCount,
      totalAnswered,
      percentCorrect,
      distribution,
      avgResponseMs,
      isHardest: totalAnswered > 0 && percentCorrect < 50,
    };
  });

  const rankedByScore = [...players].sort((a, b) => b.score - a.score || a.totalAnswerMs - b.totalAnswerMs);

  const playerRows: PlayerReportRow[] = rankedByScore.map((p, i) => {
    const answers: PlayerAnswerCell[] = state.questions.map((_, index) => {
      const a = p.answers[index];
      return a
        ? { questionIndex: index, choiceIndex: a.choiceIndex, correct: a.correct, elapsedMs: a.elapsedMs, points: a.points }
        : { questionIndex: index, choiceIndex: null, correct: false, elapsedMs: null, points: 0 };
    });
    const teamId = playerTeamOf(p.playerId);
    const team = teams?.find((t) => t.id === teamId) ?? null;
    return {
      playerId: p.playerId,
      name: p.name,
      isBot: p.isBot,
      teamName: team?.name ?? null,
      rank: i + 1,
      score: p.score,
      correctCount: p.correctCount,
      totalQuestions: questionCount,
      accuracyPct: questionCount > 0 ? Math.round((p.correctCount / questionCount) * 100) : 0,
      avgResponseMs: p.answeredCount > 0 ? Math.round(p.totalAnswerMs / p.answeredCount) : null,
      longestStreak: p.bestStreak,
      unansweredCount: questionCount - p.answeredCount,
      answers,
    };
  });

  const avgAccuracyPct =
    playerRows.length > 0 ? Math.round(playerRows.reduce((s, p) => s + p.accuracyPct, 0) / playerRows.length) : 0;
  const responseSamples = playerRows.filter((p) => p.avgResponseMs !== null).map((p) => p.avgResponseMs as number);
  const avgResponseMs = responseSamples.length > 0 ? Math.round(responseSamples.reduce((s, v) => s + v, 0) / responseSamples.length) : null;

  let teamRows: TeamReportRow[] | null = null;
  if (teams && teams.length > 0) {
    const teamScores = computeTeamScores(state, teams, playerTeamOf);
    teamRows = teamScores
      .map((ts) => ({
        teamId: ts.team.id,
        teamName: ts.team.name,
        color: ts.team.color,
        memberCount: ts.memberCount,
        avgScore: ts.avgScore,
        mvpName: ts.mvpPlayerId ? (state.players[ts.mvpPlayerId]?.name ?? null) : null,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }

  return {
    generatedAt: Date.now(),
    packNameTh,
    playerCount: players.length,
    questionCount,
    avgAccuracyPct,
    avgResponseMs,
    questions: questionRows,
    players: playerRows,
    teams: teamRows,
  };
}
