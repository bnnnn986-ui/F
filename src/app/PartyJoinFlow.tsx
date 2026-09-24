import { useEffect, useState } from 'preact/hooks';
import { navigate } from './router';
import { isValidRoomCode, normalizeRoomCode } from '../core/net/roomCode';
import { PixelPanel } from '../core/ui/PixelPanel';
import { PixelInput } from '../core/ui/PixelInput';
import { PixelButton } from '../core/ui/PixelButton';
import { D20Spinner } from '../core/ui/D20Spinner';
import { PlayerForm } from '../lobby/PlayerForm';
import { loadProfile, saveProfile, type PlayerProfile } from '../core/storage/profile';
import { getOrCreatePlayerId } from '../core/storage/storage';
import { joinParty, loadSavedSession } from './partyClientStore';
import { usePartyClientState } from './usePartyClientState';
import { showToast } from '../core/ui/toast';

/**
 * `#/join` and `#/join/:code` — the one-time entry point into a party
 * room. Once connected, this screen hands off to `#/party/play` (see
 * `partyClientStore.ts`); the player never re-enters a code after this.
 *
 * Reload resilience: a bare `#/join` (no code, e.g. after a reload with no
 * saved query) with a saved session from before auto-reconnects silently
 * instead of asking the player to type the code again.
 */
export function PartyJoinFlow({ code }: { code?: string }) {
  const [phase, setPhase] = useState<'code' | 'profile' | 'resuming'>(code ? 'profile' : 'code');
  const [codeInput, setCodeInput] = useState(code ?? '');
  const [touched, setTouched] = useState(false);
  const [profile] = useState<PlayerProfile>(() => loadProfile());
  const clientState = usePartyClientState();

  useEffect(() => {
    if (code) {
      setCodeInput(code);
      setPhase('profile');
      return;
    }
    const saved = loadSavedSession();
    if (saved && clientState.status === 'idle') {
      setPhase('resuming');
      joinParty(saved.roomCode, saved.profile, saved.playerId, true).catch(() => setPhase('code'));
    }
  }, [code]);

  useEffect(() => {
    if (clientState.status === 'connected') navigate('/party/play');
    if (clientState.status === 'error') showToast(clientState.errorMessage, 'error');
  }, [clientState.status, clientState.errorMessage]);

  const roomCode = normalizeRoomCode(codeInput);

  const submitCode = (e: Event) => {
    e.preventDefault();
    setTouched(true);
    if (!isValidRoomCode(roomCode)) return;
    navigate(`/join/${roomCode}`);
  };

  const startJoin = (chosen: PlayerProfile) => {
    saveProfile(chosen);
    joinParty(roomCode, chosen, getOrCreatePlayerId()).catch(() => undefined);
  };

  if (phase === 'resuming') {
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <D20Spinner label="กำลังเชื่อมต่อกลับ…" />
        </PixelPanel>
      </div>
    );
  }

  if (phase === 'code') {
    const valid = isValidRoomCode(roomCode);
    return (
      <div className="screen-center">
        <PixelPanel>
          <h2>เข้าร่วมโรงเตี๊ยม</h2>
          <form onSubmit={submitCode} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <PixelInput
              value={codeInput}
              onInput={(e) => setCodeInput((e.target as HTMLInputElement).value.toUpperCase())}
              placeholder="รหัสห้อง"
              maxLength={8}
              autoFocus
              style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.15em' }}
            />
            {touched && !valid && <p style={{ color: 'var(--pp-danger)', margin: 0 }}>กรอกรหัสห้อง 5 ตัวอักษรให้ครบ</p>}
            <PixelButton type="submit" variant="primary" big disabled={!valid}>
              ถัดไป
            </PixelButton>
          </form>
        </PixelPanel>
      </div>
    );
  }

  if (clientState.status === 'connecting') {
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <D20Spinner label={`กำลังเชื่อมต่อโรงเตี๊ยม #${roomCode}…`} />
        </PixelPanel>
      </div>
    );
  }

  if (clientState.status === 'error') {
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <p>{clientState.errorMessage}</p>
          <PixelButton variant="primary" onClick={() => navigate('/')}>
            กลับหน้าแรก
          </PixelButton>
        </PixelPanel>
      </div>
    );
  }

  return (
    <div className="screen-center">
      <PlayerForm initial={profile} roomCode={roomCode} onSubmit={startJoin} />
    </div>
  );
}
