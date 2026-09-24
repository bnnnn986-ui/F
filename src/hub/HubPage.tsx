import { useState } from 'preact/hooks';
import { GAME_MANIFESTS } from '../games/registry';
import type { GameManifest } from '../games/types';
import { GameCard } from './GameCard';
import { JoinPanel } from './JoinPanel';
import { HowToPlayModal } from './HowToPlayModal';
import { MuteToggle } from '../core/ui/MuteToggle';
import { PixelButton } from '../core/ui/PixelButton';
import { navigate } from '../app/router';
import { AvatarSprite } from '../core/ui/AvatarSprite';

export function HubPage() {
  const [activeGame, setActiveGame] = useState<GameManifest | null>(null);

  return (
    <div className="hub-page">
      <header className="hub-hero">
        <div className="hub-hero__topbar">
          <span />
          <MuteToggle />
        </div>
        <div className="hub-hero__logo" aria-hidden="true">
          {['P', 'I', 'X', 'E', 'L', ' ', 'P', 'A', 'R', 'T', 'Y'].map((ch, i) => (
            <span key={i} className="hub-hero__letter" style={{ animationDelay: `${i * 60}ms` }}>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </div>
        <h1 className="visually-hidden">Pixel Party</h1>
        <p className="hub-hero__tagline">ปาร์ตี้เกมพิกเซล เล่นพร้อมกันได้ทั้งห้อง ด้วยรหัสห้องเดียว</p>
        <div className="hub-hero__mascots" aria-hidden="true">
          <AvatarSprite avatarId="cat" size={56} />
          <AvatarSprite avatarId="panda" size={56} />
          <AvatarSprite avatarId="ghost" size={56} />
          <AvatarSprite avatarId="bunny" size={56} />
        </div>
        <div className="hub-hero__cta">
          <PixelButton variant="primary" big onClick={() => navigate('/party/host')}>
            🎉 สร้างห้องปาร์ตี้ (เป็นโฮสต์)
          </PixelButton>
        </div>
      </header>

      <div className="hub-page__join">
        <JoinPanel />
      </div>

      <p className="hub-page__catalogue-lead">เลือกเกมที่อยากเล่นก่อน แล้วค่อยสร้างห้องปาร์ตี้ก็ได้:</p>

      <main className="hub-grid">
        {GAME_MANIFESTS.map((manifest) => (
          <GameCard
            key={manifest.id}
            manifest={manifest}
            onClick={() => {
              if (manifest.status === 'ready') setActiveGame(manifest);
            }}
          />
        ))}
      </main>

      <footer className="hub-footer">
        <h2>เล่นยังไง?</h2>
        <div className="hub-footer__steps">
          <div className="hub-footer__step">
            <span className="hub-footer__num">1</span>
            <p>เลือกเกมแล้วกด “สร้างห้อง” บนจอใหญ่ (คอม/โปรเจกเตอร์)</p>
          </div>
          <div className="hub-footer__step">
            <span className="hub-footer__num">2</span>
            <p>ผู้เล่นสแกน QR หรือกรอกรหัสห้องจากมือถือของตัวเอง</p>
          </div>
          <div className="hub-footer__step">
            <span className="hub-footer__num">3</span>
            <p>ตั้งชื่อ เลือกอวตาร แล้วรอโฮสต์กด “เริ่มเกม”!</p>
          </div>
        </div>
        <p className="hub-footer__note">ไม่ต้องติดตั้งแอป ไม่ต้องสมัครสมาชิก — เล่นได้ทุกวัย</p>
      </footer>

      {activeGame && (
        <HowToPlayModal
          manifest={activeGame}
          open={!!activeGame}
          onClose={() => setActiveGame(null)}
          onHost={() => navigate(`/party/host?game=${activeGame.id}`)}
        />
      )}
    </div>
  );
}
