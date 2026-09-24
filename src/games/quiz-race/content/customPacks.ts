import { getJSON, setJSON } from '../../../core/storage/storage';
import { validatePack } from './index';
import type { QuestionPack } from '../logic/types';

const KEY = 'pp:quizrace:customPacks';

export function loadCustomPacks(): QuestionPack[] {
  return getJSON<QuestionPack[]>(KEY, []);
}

export function saveCustomPacks(packs: QuestionPack[]): void {
  setJSON(KEY, packs);
}

export function upsertCustomPack(pack: QuestionPack): void {
  const packs = loadCustomPacks();
  const idx = packs.findIndex((p) => p.id === pack.id);
  if (idx >= 0) packs[idx] = pack;
  else packs.push(pack);
  saveCustomPacks(packs);
}

export function deleteCustomPack(id: string): void {
  saveCustomPacks(loadCustomPacks().filter((p) => p.id !== id));
}

export function importPackFromJson(text: string): { ok: true; pack: QuestionPack } | { ok: false; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['ไฟล์ไม่ใช่ JSON ที่ถูกต้อง'] };
  }
  return validatePack(data);
}

export function exportPackToJson(pack: QuestionPack): string {
  return JSON.stringify(pack, null, 2);
}

export function newEmptyPack(): QuestionPack {
  return { id: `custom-${Date.now()}`, nameTh: 'ชุดคำถามใหม่', questions: [] };
}
