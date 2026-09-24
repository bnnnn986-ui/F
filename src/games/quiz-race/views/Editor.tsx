import { useState } from 'preact/hooks';
import { Modal } from '../../../core/ui/Modal';
import { PixelButton } from '../../../core/ui/PixelButton';
import { PixelInput } from '../../../core/ui/PixelInput';
import { PixelPanel } from '../../../core/ui/PixelPanel';
import { showToast } from '../../../core/ui/toast';
import { Chevron } from '../../../core/ui/PixelShape';
import { Icon } from '../../../core/ui/Icon';
import {
  deleteCustomPack,
  exportPackToJson,
  importPackFromJson,
  loadCustomPacks,
  newEmptyPack,
  upsertCustomPack,
} from '../content/customPacks';
import type { Question, QuestionPack } from '../logic/types';

function newQuestion(): Question {
  return { id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: '', choices: ['', ''], correctIndex: 0 };
}

/** Simple in-browser editor for custom question packs: create/edit/delete, reorder, import/export JSON. */
export function QuizEditor({ onClose }: { onClose: () => void }) {
  const [packs, setPacks] = useState<QuestionPack[]>(() => loadCustomPacks());
  const [editing, setEditing] = useState<QuestionPack | null>(null);
  const [importText, setImportText] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const refresh = () => setPacks(loadCustomPacks());

  const savePack = (pack: QuestionPack) => {
    const errors: string[] = [];
    if (!pack.nameTh.trim()) errors.push('ต้องตั้งชื่อชุดคำถาม');
    if (pack.questions.length === 0) errors.push('ต้องมีคำถามอย่างน้อย 1 ข้อ');
    pack.questions.forEach((q, i) => {
      if (!q.text.trim()) errors.push(`ข้อ ${i + 1}: ยังไม่มีคำถาม`);
      if (q.choices.length < 2) errors.push(`ข้อ ${i + 1}: ต้องมีตัวเลือกอย่างน้อย 2 ข้อ`);
      if (q.choices.some((c) => !c.trim())) errors.push(`ข้อ ${i + 1}: มีตัวเลือกว่างอยู่`);
    });
    if (errors.length > 0) {
      showToast(errors[0]!, 'error');
      return;
    }
    upsertCustomPack(pack);
    refresh();
    setEditing(null);
    showToast('บันทึกชุดคำถามแล้ว', 'success');
  };

  const doImport = () => {
    const result = importPackFromJson(importText);
    if (!result.ok) {
      setImportErrors(result.errors);
      return;
    }
    upsertCustomPack(result.pack);
    refresh();
    setImportText('');
    setImportErrors([]);
    showToast('นำเข้าชุดคำถามแล้ว', 'success');
  };

  if (editing) {
    return <QuestionPackEditor pack={editing} onCancel={() => setEditing(null)} onSave={savePack} />;
  }

  return (
    <Modal open onClose={onClose} title="สร้างชุดคำถามเอง">
      <div className="quiz-editor">
        <PixelButton
          variant="primary"
          onClick={() => setEditing(newEmptyPack())}
        >
          + ชุดคำถามใหม่
        </PixelButton>

        <ul className="quiz-editor__pack-list">
          {packs.length === 0 && <p>ยังไม่มีชุดคำถามที่สร้างเอง</p>}
          {packs.map((p) => (
            <li key={p.id}>
              <span>
                {p.nameTh} ({p.questions.length} ข้อ)
              </span>
              <div className="quiz-editor__pack-actions">
                <PixelButton variant="secondary" onClick={() => setEditing(p)}>
                  แก้ไข
                </PixelButton>
                <PixelButton
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard?.writeText(exportPackToJson(p)).catch(() => undefined);
                    showToast('คัดลอก JSON แล้ว');
                  }}
                >
                  ส่งออก
                </PixelButton>
                <PixelButton
                  variant="danger"
                  onClick={() => {
                    deleteCustomPack(p.id);
                    refresh();
                  }}
                >
                  ลบ
                </PixelButton>
              </div>
            </li>
          ))}
        </ul>

        <PixelPanel dark>
          <p className="quiz-setup__label">นำเข้าจาก JSON</p>
          <textarea
            className="quiz-editor__import-box"
            value={importText}
            onInput={(e) => setImportText((e.target as HTMLTextAreaElement).value)}
            placeholder='{"id": "...", "nameTh": "...", "questions": [...]}'
            rows={4}
          />
          {importErrors.map((e) => (
            <p key={e} style={{ color: 'var(--pp-danger)' }}>
              {e}
            </p>
          ))}
          <PixelButton variant="secondary" onClick={doImport} disabled={!importText.trim()}>
            นำเข้า
          </PixelButton>
        </PixelPanel>

        <PixelButton variant="primary" onClick={onClose}>
          เสร็จสิ้น
        </PixelButton>
      </div>
    </Modal>
  );
}

function QuestionPackEditor({
  pack,
  onCancel,
  onSave,
}: {
  pack: QuestionPack;
  onCancel: () => void;
  onSave: (pack: QuestionPack) => void;
}) {
  const [draft, setDraft] = useState<QuestionPack>(pack);

  const updateQuestion = (index: number, patch: Partial<Question>) => {
    setDraft((d) => ({ ...d, questions: d.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)) }));
  };
  const updateChoice = (qIndex: number, cIndex: number, value: string) => {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q, i) =>
        i === qIndex ? { ...q, choices: q.choices.map((c, j) => (j === cIndex ? value : c)) } : q,
      ),
    }));
  };
  const addChoice = (qIndex: number) => {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q, i) => (i === qIndex && q.choices.length < 4 ? { ...q, choices: [...q.choices, ''] } : q)),
    }));
  };
  const removeChoice = (qIndex: number, cIndex: number) => {
    setDraft((d) => ({
      ...d,
      questions: d.questions.map((q, i) =>
        i === qIndex && q.choices.length > 2
          ? { ...q, choices: q.choices.filter((_, j) => j !== cIndex), correctIndex: q.correctIndex === cIndex ? 0 : q.correctIndex }
          : q,
      ),
    }));
  };
  const move = (index: number, dir: -1 | 1) => {
    setDraft((d) => {
      const next = [...d.questions];
      const target = index + dir;
      if (target < 0 || target >= next.length) return d;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return { ...d, questions: next };
    });
  };

  return (
    <Modal open onClose={onCancel} title="แก้ไขชุดคำถาม">
      <div className="quiz-editor">
        <PixelInput
          value={draft.nameTh}
          onInput={(e) => setDraft((d) => ({ ...d, nameTh: (e.target as HTMLInputElement).value }))}
          placeholder="ชื่อชุดคำถาม"
        />

        {draft.questions.map((q, qi) => (
          <PixelPanel dark key={q.id} className="quiz-editor__question">
            <div className="quiz-editor__question-header">
              <strong>ข้อ {qi + 1}</strong>
              <div>
                <PixelButton variant="secondary" onClick={() => move(qi, -1)} disabled={qi === 0} aria-label="เลื่อนข้อขึ้น">
                  <Chevron direction="up" />
                </PixelButton>
                <PixelButton variant="secondary" onClick={() => move(qi, 1)} disabled={qi === draft.questions.length - 1} aria-label="เลื่อนข้อลง">
                  <Chevron direction="down" />
                </PixelButton>
                <PixelButton
                  variant="danger"
                  onClick={() => setDraft((d) => ({ ...d, questions: d.questions.filter((_, i) => i !== qi) }))}
                >
                  ลบ
                </PixelButton>
              </div>
            </div>
            <PixelInput
              value={q.text}
              onInput={(e) => updateQuestion(qi, { text: (e.target as HTMLInputElement).value })}
              placeholder="ข้อความคำถาม"
            />
            {q.choices.map((c, ci) => (
              <div key={ci} className="quiz-editor__choice-row">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctIndex === ci}
                  onChange={() => updateQuestion(qi, { correctIndex: ci })}
                  aria-label={`ตัวเลือกที่ ${ci + 1} ถูกต้อง`}
                />
                <PixelInput value={c} onInput={(e) => updateChoice(qi, ci, (e.target as HTMLInputElement).value)} placeholder={`ตัวเลือก ${ci + 1}`} />
                {q.choices.length > 2 && (
                  <PixelButton variant="danger" onClick={() => removeChoice(qi, ci)} aria-label="ลบตัวเลือกนี้">
                    <Icon name="cross" className="pp-icon--sm" />
                  </PixelButton>
                )}
              </div>
            ))}
            {q.choices.length < 4 && (
              <PixelButton variant="secondary" onClick={() => addChoice(qi)}>
                + ตัวเลือก
              </PixelButton>
            )}
          </PixelPanel>
        ))}

        <PixelButton variant="secondary" onClick={() => setDraft((d) => ({ ...d, questions: [...d.questions, newQuestion()] }))}>
          + เพิ่มคำถาม
        </PixelButton>

        <div className="quiz-editor__save-row">
          <PixelButton variant="secondary" onClick={onCancel}>
            ยกเลิก
          </PixelButton>
          <PixelButton variant="primary" onClick={() => onSave(draft)}>
            บันทึก
          </PixelButton>
        </div>
      </div>
    </Modal>
  );
}
