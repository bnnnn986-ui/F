import { useState } from 'preact/hooks';
import { PixelPanel } from '../../../core/ui/PixelPanel';
import { PixelButton } from '../../../core/ui/PixelButton';
import { Badge } from '../../../core/ui/Badge';
import { Icon } from '../../../core/ui/Icon';
import { Chevron } from '../../../core/ui/PixelShape';
import { QuizEditor } from './Editor';
import type { QuizSetup } from '../setupConfig';
import type { BotDifficulty } from '../logic/bots';
import type { QuizHostAction } from '../index';

const QUESTION_COUNTS: Array<number | 'all'> = [5, 10, 15, 'all'];
const SECOND_OPTIONS = [10, 20, 30];
const DIFFICULTY_LABEL: Record<BotDifficulty, string> = { easy: 'ง่าย', normal: 'ปกติ', hard: 'ยาก' };

export function SetupPanel({
  setup,
  availablePacks,
  playerCount,
  onHostAction,
}: {
  setup: QuizSetup;
  availablePacks: Array<{ id: string; nameTh: string; questionCount: number }>;
  playerCount: number;
  onHostAction: (action: QuizHostAction) => void;
}) {
  const [editorOpen, setEditorOpen] = useState(false);

  const configure = (patch: Partial<QuizSetup>) => onHostAction({ type: 'configure', setup: patch });

  return (
    <PixelPanel className="quiz-setup">
      <h2>ตั้งค่าภารกิจ: ดันเจี้ยนแดช</h2>

      <div className="quiz-setup__section">
        <p className="quiz-setup__label">เลือกคลังคำถาม</p>
        <div className="quiz-setup__chip-row">
          {availablePacks.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`quiz-setup__chip ${setup.config.packId === p.id ? 'is-active' : ''}`}
              onClick={() => configure({ config: { ...setup.config, packId: p.id } })}
            >
              {p.nameTh} <Badge>{p.questionCount} ข้อ</Badge>
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-setup__section">
        <p className="quiz-setup__label">จำนวนคำถาม</p>
        <div className="quiz-setup__chip-row">
          {QUESTION_COUNTS.map((c) => (
            <button
              key={c}
              type="button"
              className={`quiz-setup__chip ${setup.config.questionCount === c ? 'is-active' : ''}`}
              onClick={() => configure({ config: { ...setup.config, questionCount: c } })}
            >
              {c === 'all' ? 'ทั้งหมด' : c}
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-setup__section">
        <p className="quiz-setup__label">เวลาต่อข้อ (วินาที)</p>
        <div className="quiz-setup__chip-row">
          {SECOND_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`quiz-setup__chip ${setup.config.secondsPerQuestion === s ? 'is-active' : ''}`}
              onClick={() => configure({ config: { ...setup.config, secondsPerQuestion: s } })}
            >
              {s} วิ
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-setup__section quiz-setup__toggles">
        <label className="quiz-setup__toggle">
          <input
            type="checkbox"
            checked={setup.config.shuffle}
            onChange={(e) => configure({ config: { ...setup.config, shuffle: (e.target as HTMLInputElement).checked } })}
          />
          สุ่มลำดับคำถาม
        </label>
        <label className="quiz-setup__toggle">
          <input
            type="checkbox"
            checked={setup.extraTime}
            onChange={(e) => configure({ extraTime: (e.target as HTMLInputElement).checked })}
          />
          เวลาเพิ่มพิเศษ (x1.5) — โหมดช่วยเหลือ
        </label>
      </div>

      <div className="quiz-setup__section">
        <p className="quiz-setup__label">ความยากของบอท (NPC)</p>
        <div className="quiz-setup__chip-row">
          {(['easy', 'normal', 'hard'] as BotDifficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              className={`quiz-setup__chip ${setup.difficulty === d ? 'is-active' : ''}`}
              onClick={() => configure({ difficulty: d })}
            >
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-setup__actions">
        <PixelButton variant="secondary" onClick={() => setEditorOpen(true)}>
          <Icon name="quill" className="pp-icon--md" /> สร้างชุดคำถามเอง
        </PixelButton>
        <PixelButton
          variant="primary"
          big
          disabled={playerCount < 1}
          onClick={() => onHostAction({ type: 'start' })}
        >
          ออกผจญภัย! <Chevron direction="right" />
        </PixelButton>
      </div>
      {playerCount < 1 && <p className="quiz-setup__hint">รอนักผจญภัยอย่างน้อย 1 คน (หรือเพิ่มบอทจากโรงเตี๊ยม)</p>}

      {editorOpen && (
        <QuizEditor
          onClose={() => {
            setEditorOpen(false);
            configure({}); // refresh availablePacks after possible edits
          }}
        />
      )}
    </PixelPanel>
  );
}
