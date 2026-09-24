import { showToast } from '../ui/toast';

interface NavigatorWithShare extends Navigator {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
}

/**
 * Shares the room join link via the native Web Share sheet
 * (Android/iOS/some desktop browsers). Falls back to copying the link to
 * the clipboard (and a toast) everywhere else, or if the user cancels the
 * share sheet's underlying call throws for a reason other than
 * cancellation.
 */
export async function shareJoinLink(url: string, roomCode?: string): Promise<void> {
  const nav = navigator as NavigatorWithShare;
  const text = roomCode ? `มาร่วมโรงเตี๊ยม รหัสห้อง ${roomCode}` : 'มาร่วมโรงเตี๊ยมกัน';
  if (nav.share) {
    try {
      await nav.share({ title: 'Pixel Tavern', text, url });
      return;
    } catch (err) {
      // AbortError: the user dismissed the share sheet — not an error, just stop.
      if (err instanceof Error && err.name === 'AbortError') return;
      // Any other failure (e.g. share() unsupported for this data on this
      // browser) falls through to the clipboard copy below.
    }
  }
  await copyToClipboard(url);
}

async function copyToClipboard(url: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      showToast('คัดลอกลิงก์เชิญแล้ว', 'success');
      return;
    }
  } catch {
    /* fall through to the manual-copy toast below */
  }
  showToast('คัดลอกลิงก์ไม่สำเร็จ ลองคัดลอกจากแถบที่อยู่', 'error');
}
