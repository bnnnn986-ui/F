import type { AdventureReport } from './report';

/** Escapes one CSV field: quotes it whenever it contains a comma, quote or newline. */
export function escapeCsvField(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
}

/** UTF-8 BOM prefix so Thai text opens correctly in Excel. */
export const UTF8_BOM = '﻿';

export function withBom(csv: string): string {
  return UTF8_BOM + csv;
}

export function buildQuestionsCsv(report: AdventureReport): string {
  const header = ['ข้อที่', 'คำถาม', 'คำตอบที่ถูก', '% ตอบถูก', 'จำนวนที่ตอบ', 'เวลาเฉลี่ย (วินาที)', 'ยากที่สุด'];
  const rows = report.questions.map((q) => [
    String(q.index + 1),
    q.text,
    q.correctChoiceText,
    String(q.percentCorrect),
    String(q.totalAnswered),
    q.avgResponseMs !== null ? (q.avgResponseMs / 1000).toFixed(1) : '-',
    q.isHardest ? 'ใช่' : '',
  ]);
  return withBom(rowsToCsv([header, ...rows]));
}

export function buildPlayersCsv(report: AdventureReport): string {
  const hasTeams = report.teams !== null;
  const header = [
    'อันดับ',
    'ชื่อ',
    'ประเภท',
    ...(hasTeams ? ['กิลด์'] : []),
    'คะแนน',
    'ตอบถูก',
    'จากทั้งหมด',
    '% ความแม่นยำ',
    'เวลาเฉลี่ย (วินาที)',
    'สตรีคยาวที่สุด',
    'ไม่ได้ตอบ',
  ];
  const rows = report.players.map((p) => [
    String(p.rank),
    p.name,
    p.isBot ? 'NPC' : 'ผู้เล่น',
    ...(hasTeams ? [p.teamName ?? '-'] : []),
    String(p.score),
    String(p.correctCount),
    String(p.totalQuestions),
    String(p.accuracyPct),
    p.avgResponseMs !== null ? (p.avgResponseMs / 1000).toFixed(1) : '-',
    String(p.longestStreak),
    String(p.unansweredCount),
  ]);
  return withBom(rowsToCsv([header, ...rows]));
}

export function buildTeamsCsv(report: AdventureReport): string {
  const header = ['อันดับ', 'กิลด์', 'จำนวนสมาชิก', 'คะแนนเฉลี่ย', 'MVP'];
  const rows = (report.teams ?? []).map((t, i) => [String(i + 1), t.teamName, String(t.memberCount), String(t.avgScore), t.mvpName ?? '-']);
  return withBom(rowsToCsv([header, ...rows]));
}
