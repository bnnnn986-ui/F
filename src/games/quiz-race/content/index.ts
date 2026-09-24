import type { QuestionPack } from '../logic/types';
import general from './general.json';
import officeFun from './office-fun.json';
import thailand from './thailand.json';

/** Validates a pack's shape at load time so a malformed custom-pack JSON fails loudly, not silently mid-game. */
export function validatePack(data: unknown): { ok: true; pack: QuestionPack } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (typeof data !== 'object' || data === null) return { ok: false, errors: ['ไม่ใช่ข้อมูล JSON ที่ถูกต้อง'] };
  const d = data as Record<string, unknown>;

  if (typeof d.id !== 'string' || !d.id.trim()) errors.push('ต้องมี id เป็นข้อความ');
  if (typeof d.nameTh !== 'string' || !d.nameTh.trim()) errors.push('ต้องมีชื่อชุดคำถาม (nameTh)');
  if (!Array.isArray(d.questions) || d.questions.length === 0) errors.push('ต้องมีคำถามอย่างน้อย 1 ข้อ');

  if (Array.isArray(d.questions)) {
    d.questions.forEach((q, i) => {
      if (typeof q !== 'object' || q === null) {
        errors.push(`คำถามข้อที่ ${i + 1}: รูปแบบไม่ถูกต้อง`);
        return;
      }
      const qq = q as Record<string, unknown>;
      if (typeof qq.text !== 'string' || !qq.text.trim()) errors.push(`คำถามข้อที่ ${i + 1}: ต้องมีข้อความคำถาม`);
      if (!Array.isArray(qq.choices) || qq.choices.length < 2 || qq.choices.length > 4) {
        errors.push(`คำถามข้อที่ ${i + 1}: ต้องมีตัวเลือก 2-4 ข้อ`);
      } else if (qq.choices.some((c) => typeof c !== 'string' || !c.trim())) {
        errors.push(`คำถามข้อที่ ${i + 1}: ตัวเลือกต้องเป็นข้อความทั้งหมด`);
      }
      if (
        typeof qq.correctIndex !== 'number' ||
        !Array.isArray(qq.choices) ||
        qq.correctIndex < 0 ||
        qq.correctIndex >= qq.choices.length
      ) {
        errors.push(`คำถามข้อที่ ${i + 1}: ต้องระบุคำตอบที่ถูกต้อง`);
      }
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, pack: data as QuestionPack };
}

const BUILT_IN_RAW = [general, officeFun, thailand];

export const BUILT_IN_PACKS: QuestionPack[] = BUILT_IN_RAW.map((raw) => {
  const result = validatePack(raw);
  if (!result.ok) {
    // A built-in pack failing validation is a build-time bug, not a user error.
    throw new Error(`Built-in pack "${(raw as { id?: string }).id}" failed validation: ${result.errors.join('; ')}`);
  }
  return result.pack;
});

export function getBuiltInPack(id: string): QuestionPack | undefined {
  return BUILT_IN_PACKS.find((p) => p.id === id);
}
