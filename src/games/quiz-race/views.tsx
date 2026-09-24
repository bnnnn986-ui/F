import { PixelPanel } from '../../core/ui/PixelPanel';
import { PixelButton } from '../../core/ui/PixelButton';
import { AvatarSprite } from '../../core/ui/AvatarSprite';

/**
 * Phase 1 placeholder views. The quiz-race manifest is `status: 'ready'`
 * so the party-room host/join flow (pick game → start → all screens switch
 * → back to lobby) is fully wired end-to-end; the real quiz reducer +
 * question UI + race track land in Phase 2.
 */
export function QuizRaceHostView({ onBackToLobby }: { view: unknown; onBackToLobby: () => void }) {
  return (
    <PixelPanel style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <AvatarSprite avatarId="cat" animation="run" size={64} />
        <AvatarSprite avatarId="panda" animation="run" size={64} />
        <AvatarSprite avatarId="ghost" animation="run" size={64} />
      </div>
      <h2>ควิซวิ่งแข่ง — กำลังเล่นอยู่</h2>
      <p>คำถามและแทร็กวิ่งแข่งจะมาใน Phase 2 — ตอนนี้ห้องปาร์ตี้พร้อมสลับเกมแล้ว</p>
      <PixelButton variant="secondary" onClick={onBackToLobby}>
        ⏹ กลับล็อบบี้
      </PixelButton>
    </PixelPanel>
  );
}

export function QuizRacePlayerView() {
  return (
    <PixelPanel style={{ textAlign: 'center' }}>
      <AvatarSprite avatarId="cat" animation="idle" size={72} />
      <h2>ควิซวิ่งแข่ง</h2>
      <p>รอโฮสต์เริ่มคำถามแรก…</p>
    </PixelPanel>
  );
}
