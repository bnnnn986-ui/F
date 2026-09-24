import { useState } from 'preact/hooks';
import { useInstallPrompt } from './useInstallPrompt';
import { PixelButton } from '../ui/PixelButton';
import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import { showToast } from '../ui/toast';

/**
 * "ติดตั้งแอป" — hidden entirely when already standalone or on a browser
 * with no install path at all (e.g. Firefox desktop). On Chrome/Android/
 * desktop it fires the native `beforeinstallprompt`; on iOS Safari (no
 * such API) it instead opens a 2-step instruction sheet.
 */
export function InstallButton({ compact = false }: { compact?: boolean }) {
  const { platform, canPromptNow, promptInstall } = useInstallPrompt();
  const [showIosSheet, setShowIosSheet] = useState(false);

  if (platform === 'standalone' || platform === 'unsupported') return null;
  if (platform === 'promptable' && !canPromptNow) return null;

  const onClick = async () => {
    if (platform === 'ios-safari') {
      setShowIosSheet(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === 'accepted') showToast('ติดตั้งแอปแล้ว', 'success');
  };

  return (
    <>
      <PixelButton variant="accent" onClick={onClick} aria-label="ติดตั้งแอป">
        <Icon name="star" className="pp-icon--md" /> {compact ? '' : 'ติดตั้งแอป'}
      </PixelButton>
      <Modal open={showIosSheet} onClose={() => setShowIosSheet(false)} title="ติดตั้งแอป">
        <p>วิธีติดตั้ง Pixel Tavern ไว้บนหน้าจอโฮม:</p>
        <ol className="pwa-ios-steps">
          <li>
            แตะปุ่ม <strong>แชร์</strong> ด้านล่างของ Safari
          </li>
          <li>
            เลือก <strong>เพิ่มไปยังหน้าจอโฮม</strong>
          </li>
        </ol>
        <PixelButton variant="primary" block onClick={() => setShowIosSheet(false)}>
          เข้าใจแล้ว
        </PixelButton>
      </Modal>
    </>
  );
}
