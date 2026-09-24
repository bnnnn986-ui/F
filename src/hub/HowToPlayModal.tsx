import { Modal } from '../core/ui/Modal';
import { PixelButton } from '../core/ui/PixelButton';
import type { GameManifest } from '../games/types';

export function HowToPlayModal({
  manifest,
  open,
  onClose,
  onHost,
}: {
  manifest: GameManifest;
  open: boolean;
  onClose: () => void;
  onHost: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={`วิธีเล่น: ${manifest.titleTh}`}>
      <ol className="how-to-play">
        {manifest.howToPlayTh.map((step, i) => (
          <li key={i}>
            <span className="how-to-play__num">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="how-to-play__actions">
        <PixelButton variant="secondary" onClick={onClose}>
          ปิด
        </PixelButton>
        <PixelButton variant="primary" big onClick={onHost}>
          สร้างห้องแล้วเล่นเกมนี้
        </PixelButton>
      </div>
    </Modal>
  );
}
