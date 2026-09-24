import { useState } from 'preact/hooks';
import './quizrace.css';
import { Modal } from '../../../core/ui/Modal';
import { PixelButton } from '../../../core/ui/PixelButton';
import { loadReports } from '../content/reportHistory';
import { ReportView } from './ReportView';
import type { AdventureReport } from '../logic/report';

/** "รายงานย้อนหลัง" — the last 10 Dungeon Dash reports, kept in localStorage so they survive going back to the tavern and page reloads. */
export function ReportHistoryModal({ onClose }: { onClose: () => void }) {
  const [reports] = useState<AdventureReport[]>(() => loadReports());
  const [selected, setSelected] = useState<AdventureReport | null>(null);

  if (selected) {
    return (
      <div className="quiz-report-overlay">
        <ReportView report={selected} onClose={() => setSelected(null)} />
        <div className="no-print quiz-report-overlay__close">
          <PixelButton variant="secondary" onClick={onClose}>
            ปิดหน้าต่าง
          </PixelButton>
        </div>
      </div>
    );
  }

  return (
    <Modal open onClose={onClose} title="รายงานย้อนหลัง">
      {reports.length === 0 ? (
        <p>ยังไม่มีรายงานภารกิจที่จบแล้ว</p>
      ) : (
        <ul className="quiz-editor__pack-list">
          {reports.map((r) => (
            <li key={r.generatedAt}>
              <span>
                {new Date(r.generatedAt).toLocaleString('th-TH')} · {r.packNameTh} · {r.playerCount} คน
              </span>
              <PixelButton variant="secondary" onClick={() => setSelected(r)}>
                ดูรายงาน
              </PixelButton>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
