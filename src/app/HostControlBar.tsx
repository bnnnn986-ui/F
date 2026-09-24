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
export function HostControlBar({
  paused,
  onPause,
  onResume,
  onSkip,
  onGoToPodium,
  onQuitWithoutScores,
}: {
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

  return (
    <>
      <div className="host-control-bar" data-testid="host-control-bar">
        {paused !== undefined && (
          <PixelButton
            variant="secondary"
            silent
            onClick={paused ? onResume : onPause}
            aria-label={paused ? 'เล่นต่อ' : 'หยุดชั่วคราว'}
          >
            <Icon name={paused ? 'lightning' : 'hourglass'} className="pp-icon--md" label={paused ? 'เล่นต่อ' : 'หยุดชั่วคราว'} />
            <span className="host-control-bar__label">{paused ? 'เล่นต่อ' : 'หยุด'}</span>
          </PixelButton>
        )}
        <PixelButton variant="secondary" silent onClick={onSkip}>
          <Icon name="lightning" className="pp-icon--md" /> <span className="host-control-bar__label">ข้าม</span>
        </PixelButton>
        <PixelButton variant="danger" silent onClick={() => setConfirmOpen(true)}>
          <Icon name="cross" className="pp-icon--md" /> <span className="host-control-bar__label">จบเกม</span>
        </PixelButton>
      </div>

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
