import { describe, expect, it } from 'vitest';
import { createInitialState, dungeonDashReducer } from './reducer';
import { buildAdventureReport } from './report';
import { buildPlayersCsv, buildQuestionsCsv, buildTeamsCsv, escapeCsvField, rowsToCsv, withBom } from './csv';
import { createTeams } from '../../../core/room/teams';
import type { Question, QuizConfig } from './types';

const Q: Question[] = [
  { id: 'q1', text: 'Q1?', choices: ['a', 'b'], correctIndex: 0 },
  { id: 'q2', text: 'Q2, "tricky"?', choices: ['a', 'b'], correctIndex: 1 },
];
const CONFIG: QuizConfig = { packId: 'test', questionCount: 2, secondsPerQuestion: 10, shuffle: false };
const PLAYERS = [
  { playerId: 'p1', name: 'Alice', avatarId: 'fighter', tint: 0, isBot: false },
  { playerId: 'p2', name: 'Bob', avatarId: 'wizard', tint: 1, isBot: true },
];

function playedState() {
  let s = createInitialState(CONFIG, Q, PLAYERS);
  s = dungeonDashReducer(s, { type: 'start', now: 0 });
  s = dungeonDashReducer(s, { type: 'tick', now: 3000 }); // countdown -> read
  s = dungeonDashReducer(s, { type: 'tick', now: 6000 }); // read -> question
  s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 0, now: 6100 }); // correct
  s = dungeonDashReducer(s, { type: 'answer', playerId: 'p2', choiceIndex: 1, now: 6200 }); // wrong (q1 correct=0)
  s = dungeonDashReducer(s, { type: 'next', now: 20000 }); // reveal -> leaderboard
  s = dungeonDashReducer(s, { type: 'next', now: 20100 }); // leaderboard -> read
  s = dungeonDashReducer(s, { type: 'skip', now: 20200 }); // read -> question (questionStartedAt = 20200)
  s = dungeonDashReducer(s, { type: 'answer', playerId: 'p1', choiceIndex: 1, now: 20300 }); // correct
  // p2 doesn't answer q2
  s = dungeonDashReducer(s, { type: 'tick', now: 20200 + CONFIG.secondsPerQuestion * 1000 });
  return s;
}

describe('buildAdventureReport', () => {
  it('summarises player count, question count and averages', () => {
    const report = buildAdventureReport(playedState(), 'ความรู้รอบตัว');
    expect(report.playerCount).toBe(2);
    expect(report.questionCount).toBe(2);
    expect(report.packNameTh).toBe('ความรู้รอบตัว');
  });

  it('flags a question as hardest when under 50% got it right', () => {
    const report = buildAdventureReport(playedState(), 'p');
    const q1 = report.questions[0]!; // both answered, p1 correct p2 wrong -> 50% -> not < 50, not hardest
    const q2 = report.questions[1]!; // only p1 answered, correct -> 100%, not hardest
    expect(q1.isHardest).toBe(false);
    expect(q2.isHardest).toBe(false);
  });

  it('computes per-question distribution and % correct', () => {
    const report = buildAdventureReport(playedState(), 'p');
    const q1 = report.questions[0]!;
    expect(q1.totalAnswered).toBe(2);
    expect(q1.correctCount).toBe(1);
    expect(q1.percentCorrect).toBe(50);
    expect(q1.distribution).toEqual([1, 1]);
  });

  it('ranks players by score and reports accuracy/unanswered/streak', () => {
    const report = buildAdventureReport(playedState(), 'p');
    const alice = report.players.find((p) => p.name === 'Alice')!;
    const bob = report.players.find((p) => p.name === 'Bob')!;
    expect(alice.rank).toBe(1);
    expect(alice.correctCount).toBe(2);
    expect(alice.unansweredCount).toBe(0);
    expect(alice.longestStreak).toBe(2);
    expect(bob.isBot).toBe(true);
    expect(bob.unansweredCount).toBe(1); // never answered q2
  });

  it('includes every question as a per-player answer cell, with nulls for unanswered', () => {
    const report = buildAdventureReport(playedState(), 'p');
    const bob = report.players.find((p) => p.name === 'Bob')!;
    expect(bob.answers).toHaveLength(2);
    expect(bob.answers[1]!.choiceIndex).toBeNull();
  });

  it('omits team data when no teams are passed', () => {
    const report = buildAdventureReport(playedState(), 'p');
    expect(report.teams).toBeNull();
  });

  it('includes a team summary (sorted by avg score) when teams are passed', () => {
    const teams = createTeams(2);
    const teamOf: Record<string, string> = { p1: teams[0]!.id, p2: teams[1]!.id };
    const report = buildAdventureReport(playedState(), 'p', teams, (id) => teamOf[id] ?? null);
    expect(report.teams).toHaveLength(2);
    expect(report.teams![0]!.avgScore).toBeGreaterThanOrEqual(report.teams![1]!.avgScore);
    const alice = report.players.find((p) => p.name === 'Alice')!;
    expect(alice.teamName).toBe(teams[0]!.name);
  });
});

describe('CSV builder', () => {
  it('escapes fields containing commas, quotes and newlines', () => {
    expect(escapeCsvField('plain')).toBe('plain');
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('joins rows with CRLF and fields with commas', () => {
    const csv = rowsToCsv([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(csv).toBe('a,b\r\nc,d');
  });

  it('prepends a UTF-8 BOM', () => {
    const csv = withBom('a,b');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('builds a questions CSV with a Thai header row and the tricky question escaped', () => {
    const report = buildAdventureReport(playedState(), 'p');
    const csv = buildQuestionsCsv(report);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('ข้อที่,คำถาม,คำตอบที่ถูก');
    expect(csv).toContain('"Q2, ""tricky""?"');
  });

  it('builds a players CSV with a Thai header row, adding a guild column only when teams exist', () => {
    const report = buildAdventureReport(playedState(), 'p');
    const csv = buildPlayersCsv(report);
    expect(csv).toContain('อันดับ,ชื่อ,ประเภท,คะแนน');
    expect(csv).not.toContain('กิลด์');

    const teams = createTeams(2);
    const teamOf: Record<string, string> = { p1: teams[0]!.id, p2: teams[1]!.id };
    const teamReport = buildAdventureReport(playedState(), 'p', teams, (id) => teamOf[id] ?? null);
    const teamCsv = buildPlayersCsv(teamReport);
    expect(teamCsv).toContain('กิลด์');
    expect(teamCsv).toContain(teams[0]!.name);
  });

  it('builds a teams CSV', () => {
    const teams = createTeams(2);
    const teamOf: Record<string, string> = { p1: teams[0]!.id, p2: teams[1]!.id };
    const report = buildAdventureReport(playedState(), 'p', teams, (id) => teamOf[id] ?? null);
    const csv = buildTeamsCsv(report);
    expect(csv).toContain('อันดับ,กิลด์,จำนวนสมาชิก,คะแนนเฉลี่ย,MVP');
  });
});
