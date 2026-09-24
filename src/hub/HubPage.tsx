import { useState } from 'preact/hooks';
import { GAME_MANIFESTS } from '../games/registry';
import type { GameManifest } from '../games/types';
import { GameCard } from './GameCard';
import { JoinPanel } from './JoinPanel';
import { HowToPlayModal } from './HowToPlayModal';
import { HapticToggle, MuteToggle } from '../core/ui/MuteToggle';
import { LargeTextToggle } from '../core/ui/LargeTextToggle';
import { PixelButton } from '../core/ui/PixelButton';
import { ItemSprite } from '../core/ui/ItemSprite';
import { navigate } from '../app/router';
import { AvatarSprite } from '../core/ui/AvatarSprite';
import { Icon } from '../core/ui/Icon';
import { InstallButton } from '../core/pwa/InstallButton';
import { OFFLINE_MESSAGE_TH, useOnlineStatus } from '../core/device/online';

export function HubPage() {
  const [activeGame, setActiveGame] = useState<GameManifest | null>(null);
  const online = useOnlineStatus();

  return (
    <div className="hub-page">
      <header className="hub-hero">
        <div className="hub-hero__banner" style={{ backgroundImage: "url('assets/pixellab/scenes/tavern-bg.png')" }} aria-hidden="true" />
        <div className="hub-hero__topbar">
          <InstallButton compact />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <LargeTextToggle />
            <MuteToggle />
            <HapticToggle />
          </div>
        </div>
        <div className="hub-hero__logo">
          <ItemSprite id="d20" size={40} className="hub-hero__d20" />
          <div className="hub-hero__logo-text" aria-hidden="true">
            {['P', 'I', 'X', 'E', 'L', ' ', 'T', 'A', 'V', 'E', 'R', 'N'].map((ch, i) => (
              <span key={i} className="hub-hero__letter" style={{ animationDelay: `${i * 60}ms` }}>
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </div>
        </div>
        <h1 className="visually-hidden">Pixel Tavern</h1>
        <p className="hub-hero__tagline">รวมพลนักผจญภัย เล่นเกมปาร์ตี้ด้วยกันทั้งออฟฟิศและห้องเรียน</p>
        <div className="hub-hero__mascots" aria-hidden="true">
          <AvatarSprite avatarId="fighter" size={56} />
          <AvatarSprite avatarId="wizard" size={56} />
          <AvatarSprite avatarId="rogue" size={56} />
          <AvatarSprite avatarId="bard" size={56} />
        </div>
        <div className="hub-hero__cta">
          <PixelButton variant="primary" big disabled={!online} onClick={() => online && navigate('/party/host')}>
            <Icon name="mug" className="pp-icon--md" /> สร้างโรงเตี๊ยม (เป็นผู้คุมเกม)
          </PixelButton>
          {!online && <p className="join-panel__hint">{OFFLINE_MESSAGE_TH}</p>}
        </div>
      </header>

      <div className="hub-page__join">
        <JoinPanel />
      </div>

      <p className="hub-page__catalogue-lead">เลือกภารกิจที่อยากเล่นก่อน แล้วค่อยสร้างโรงเตี๊ยมก็ได้:</p>

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
            <p>เลือกภารกิจแล้วกด "สร้างโรงเตี๊ยม" บนจอใหญ่ (คอมหรือโปรเจกเตอร์)</p>
          </div>
          <div className="hub-footer__step">
            <span className="hub-footer__num">2</span>
            <p>นักผจญภัยสแกน QR หรือกรอกรหัสห้องจากมือถือของตัวเอง</p>
          </div>
          <div className="hub-footer__step">
            <span className="hub-footer__num">3</span>
            <p>ตั้งชื่อ เลือกตัวละคร แล้วรอผู้คุมเกมกด "ออกผจญภัย!"</p>
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
