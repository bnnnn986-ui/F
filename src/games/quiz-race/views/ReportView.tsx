import { useMemo, useState } from 'preact/hooks';
import { PixelPanel } from '../../../core/ui/PixelPanel';
import { PixelButton } from '../../../core/ui/PixelButton';
import { Icon } from '../../../core/ui/Icon';
import { Chevron } from '../../../core/ui/PixelShape';
import type { AdventureReport, PlayerReportRow } from '../logic/report';
import { buildPlayersCsv, buildQuestionsCsv, buildTeamsCsv } from '../logic/csv';

function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type SortKey = 'rank' | 'score' | 'accuracyPct' | 'avgResponseMs' | 'longestStreak' | 'unansweredCount';

const SORT_LABEL: Record<SortKey, string> = {
  rank: 'อันดับ',
  score: 'คะแนน',
  accuracyPct: '% ความแม่นยำ',
  avgResponseMs: 'เวลาเฉลี่ย',
  longestStreak: 'สตรีคยาวสุด',
  unansweredCount: 'ไม่ได้ตอบ',
};

export function ReportView({ report, onClose }: { report: AdventureReport; onClose: () => void }) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [selected, setSelected] = useState<PlayerReportRow | null>(null);

  const sortedPlayers = useMemo(() => {
    const arr = [...report.players];
    arr.sort((a, b) => {
      const av = a[sortKey] ?? -1;
      const bv = b[sortKey] ?? -1;
      return (av - bv) * sortDir;
    });
    return arr;
  }, [report.players, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const dateStr = new Date(report.generatedAt).toLocaleString('th-TH');

  return (
    <div className="quiz-report" id="quiz-report-printable">
      <div className="quiz-report__toolbar no-print">
        <PixelButton variant="secondary" onClick={onClose}>
          <Chevron direction="left" /> กลับ
        </PixelButton>
        <div className="quiz-report__toolbar-actions">
          <PixelButton
            variant="secondary"
            onClick={() => {
              downloadTextFile(`dungeon-dash-players-${report.generatedAt}.csv`, buildPlayersCsv(report));
              downloadTextFile(`dungeon-dash-questions-${report.generatedAt}.csv`, buildQuestionsCsv(report));
              if (report.teams) downloadTextFile(`dungeon-dash-teams-${report.generatedAt}.csv`, buildTeamsCsv(report));
            }}
          >
            ดาวน์โหลด CSV
          </PixelButton>
          <PixelButton variant="primary" onClick={() => window.print()}>
            พิมพ์ / บันทึก PDF
          </PixelButton>
        </div>
      </div>

      <PixelPanel className="quiz-report__panel">
        <h2><Icon name="scroll" className="pp-icon--md" /> บันทึกการผจญภัย</h2>
        <p className="quiz-report__meta">
          {dateStr} · คลังคำถาม: {report.packNameTh} · ผู้เล่น {report.playerCount} คน · {report.questionCount} ข้อ
        </p>
        <div className="quiz-report__summary">
          <div>
            <span className="quiz-report__summary-num">{report.avgAccuracyPct}%</span>
            <span>ความแม่นยำเฉลี่ย</span>
          </div>
          <div>
            <span className="quiz-report__summary-num">{report.avgResponseMs !== null ? (report.avgResponseMs / 1000).toFixed(1) : '-'}s</span>
            <span>เวลาตอบเฉลี่ย</span>
          </div>
        </div>

        {report.teams && (
          <>
            <h3>สรุปผลกิลด์</h3>
            <table className="quiz-report__table">
              <thead>
                <tr>
                  <th>อันดับ</th>
                  <th>กิลด์</th>
                  <th>สมาชิก</th>
                  <th>คะแนนเฉลี่ย</th>
                  <th>MVP</th>
                </tr>
              </thead>
              <tbody>
                {report.teams.map((t, i) => (
                  <tr key={t.teamId}>
                    <td>#{i + 1}</td>
                    <td style={{ color: t.color }}>{t.teamName}</td>
                    <td>{t.memberCount}</td>
                    <td>{t.avgScore}</td>
                    <td>{t.mvpName ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h3>รายข้อคำถาม</h3>
        <table className="quiz-report__table">
          <thead>
            <tr>
              <th>ข้อ</th>
              <th>คำถาม</th>
              <th>คำตอบที่ถูก</th>
              <th>% ตอบถูก</th>
              <th>การกระจายคำตอบ</th>
              <th>เวลาเฉลี่ย</th>
            </tr>
          </thead>
          <tbody>
            {report.questions.map((q) => (
              <tr key={q.index} className={q.isHardest ? 'quiz-report__row--hardest' : ''}>
                <td>{q.index + 1}</td>
                <td>
                  {q.text}
                  {q.isHardest && <span className="npc-badge">ยากที่สุด</span>}
                </td>
                <td>{q.correctChoiceText}</td>
                <td>{q.percentCorrect}%</td>
                <td>
                  <div className="quiz-report__dist">
                    {q.distribution.map((count, i) => (
                      <span
                        key={i}
                        className="quiz-report__dist-bar"
                        style={{ width: `${Math.max(4, (count / Math.max(1, q.totalAnswered)) * 40)}px` }}
                        title={`ตัวเลือกที่ ${i + 1}: ${count}`}
                      />
                    ))}
                  </div>
                </td>
                <td>{q.avgResponseMs !== null ? (q.avgResponseMs / 1000).toFixed(1) + 's' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>รายชื่อนักผจญภัย (คลิกเพื่อดูรายละเอียด)</h3>
        <table className="quiz-report__table">
          <thead>
            <tr>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                <th key={key} className="no-print quiz-report__sortable" onClick={() => toggleSort(key)}>
                  {SORT_LABEL[key]} {sortKey === key && <Chevron direction={sortDir === 1 ? 'up' : 'down'} />}
                </th>
              ))}
              <th className="print-only">อันดับ</th>
              <th>ชื่อ</th>
              {report.teams && <th>กิลด์</th>}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((p) => (
              <tr key={p.playerId} className="quiz-report__player-row" onClick={() => setSelected(p)}>
                <td className="no-print">{p.rank}</td>
                <td className="no-print">{p.score}</td>
                <td className="no-print">{p.accuracyPct}%</td>
                <td className="no-print">{p.avgResponseMs !== null ? (p.avgResponseMs / 1000).toFixed(1) + 's' : '-'}</td>
                <td className="no-print">{p.longestStreak}</td>
                <td className="no-print">{p.unansweredCount}</td>
                <td className="print-only">{p.rank}</td>
                <td>
                  {p.name}
                  {p.isBot && <span className="npc-badge">NPC</span>}
                </td>
                {report.teams && <td>{p.teamName ?? '-'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </PixelPanel>

      {selected && (
        <div className="quiz-report__drilldown no-print">
          <PixelPanel>
            <div className="quiz-report__drilldown-header">
              <h3>
                {selected.name} — คำตอบทีละข้อ
              </h3>
              <PixelButton variant="secondary" onClick={() => setSelected(null)}>
                ปิด
              </PixelButton>
            </div>
            <table className="quiz-report__table">
              <thead>
                <tr>
                  <th>ข้อ</th>
                  <th>คำตอบ</th>
                  <th>ผล</th>
                  <th>เวลา</th>
                  <th>คะแนน</th>
                </tr>
              </thead>
              <tbody>
                {selected.answers.map((a) => (
                  <tr key={a.questionIndex}>
                    <td>{a.questionIndex + 1}</td>
                    <td>{a.choiceIndex !== null ? `ตัวเลือกที่ ${a.choiceIndex + 1}` : 'ไม่ได้ตอบ'}</td>
                    <td>{a.choiceIndex === null ? '—' : <Icon name={a.correct ? 'check' : 'cross'} className="pp-icon--sm" />}</td>
                    <td>{a.elapsedMs !== null ? (a.elapsedMs / 1000).toFixed(1) + 's' : '-'}</td>
                    <td>{a.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PixelPanel>
        </div>
      )}
    </div>
  );
}
