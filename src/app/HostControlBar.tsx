import { useState } from 'preact/hooks';
import { PixelButton } from '../core/ui/PixelButton';
import { Modal } from '../core/ui/Modal';
import { Icon } from '../core/ui/Icon';

/**
 * Generic host control bar, shown in the room shell (top-right, compact)
 * over whatever game is currently mounted: Pause/Resume, Skip and "จบเกม"
 * (with a confirm modal) — game-agnostic, driven entirely by opaque host
 * actions the mounted game's `onHostAction` may or may not understand.
 */
/** Phases the generic in-game control bar should be visible for — hidden during setup (no round running yet) and podium (round is over). */
const VISIBLE_PHASES = new Set(['countdown', 'read', 'question', 'reveal', 'leaderboard']);

export function HostControlBar({
  phase,
  paused,
  onPause,
  onResume,
  onSkip,
  onGoToPodium,
  onQuitWithoutScores,
}: {
  /** The mounted game's current phase (from its host view payload, if it reports one) — controls visibility. */
  phase?: string;
  /** Undefined when the current game doesn't report a pause state — the Pause/Resume button is hidden then. */
  paused?: boolean;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  /** "ไปที่โพเดียมเลย" — end the round now, tallying scores earned so far. */
  onGoToPodium: () => void;
  /** "กลับโรงเตี๊ยมโดยไม่บันทึกคะแนน" — bail out, no party-score points awarded. */
  onQuitWithoutScores: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (phase !== undefined && !VISIBLE_PHASES.has(phase)) return null;

  const buttons = (
    <>
      {paused !== undefined && (
        <PixelButton
          variant="secondary"
          size="sm"
          silent
          onClick={paused ? onResume : onPause}
          aria-label={paused ? 'เล่นต่อ' : 'หยุดชั่วคราว'}
        >
          <Icon name={paused ? 'lightning' : 'hourglass'} className="pp-icon--sm" label={paused ? 'เล่นต่อ' : 'หยุดชั่วคราว'} />
          <span className="host-control-bar__label">{paused ? 'เล่นต่อ' : 'หยุด'}</span>
        </PixelButton>
      )}
      <PixelButton variant="secondary" size="sm" silent onClick={onSkip}>
        <Icon name="lightning" className="pp-icon--sm" /> <span className="host-control-bar__label">ข้าม</span>
      </PixelButton>
      <PixelButton variant="danger" size="sm" silent onClick={() => setConfirmOpen(true)}>
        <Icon name="cross" className="pp-icon--sm" /> <span className="host-control-bar__label">จบเกม</span>
      </PixelButton>
    </>
  );

  return (
    <>
      {/* Wide viewports: compact row, always visible. Narrow: a single "เมนูโฮสต์" button opening a bottom sheet. */}
      <div className="host-control-bar host-control-bar--desktop" data-testid="host-control-bar">
        {buttons}
      </div>
      <button
        type="button"
        className="host-control-bar__trigger"
        onClick={() => setSheetOpen(true)}
        aria-label="เมนูโฮสต์"
      >
        <Icon name="scroll" className="pp-icon--md" /> เมนูโฮสต์
      </button>
      {sheetOpen && (
        <div className="host-control-sheet__overlay" onClick={() => setSheetOpen(false)}>
          <div
            className="host-control-sheet"
            data-testid="host-control-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="host-control-sheet__grip" aria-hidden="true" />
            <div className="host-control-bar__label-row">เมนูโฮสต์</div>
            <div className="host-control-sheet__buttons">{buttons}</div>
            <PixelButton variant="secondary" block onClick={() => setSheetOpen(false)}>
              ปิด
            </PixelButton>
          </div>
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="จบภารกิจนี้แล้วกลับโรงเตี๊ยม?">
        <p>เลือกได้ว่าจะเก็บคะแนนที่ทำได้แล้วหรือไม่</p>
        <div className="host-actions-row host-actions-row--stack">
          <PixelButton
            variant="primary"
            big
            onClick={() => {
              setConfirmOpen(false);
              onGoToPodium();
            }}
          >
            <Icon name="crown" className="pp-icon--md" /> ไปที่โพเดียมเลย
          </PixelButton>
          <PixelButton
            variant="danger"
            onClick={() => {
              setConfirmOpen(false);
              onQuitWithoutScores();
            }}
          >
            กลับโรงเตี๊ยมโดยไม่บันทึกคะแนน
          </PixelButton>
          <PixelButton variant="secondary" onClick={() => setConfirmOpen(false)}>
            ยกเลิก
          </PixelButton>
        </div>
      </Modal>
    </>
  );
}
