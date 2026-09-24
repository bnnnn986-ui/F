import { getJSON, setJSON } from '../../../core/storage/storage';
import type { AdventureReport } from '../logic/report';

const KEY = 'pp:quizrace:reports';
const MAX_REPORTS = 10;

export function loadReports(): AdventureReport[] {
  return getJSON<AdventureReport[]>(KEY, []);
}

/** Saves a report, keeping only the most recent `MAX_REPORTS` (newest first). */
export function saveReport(report: AdventureReport): void {
  const existing = loadReports();
  const next = [report, ...existing].slice(0, MAX_REPORTS);
  setJSON(KEY, next);
}
