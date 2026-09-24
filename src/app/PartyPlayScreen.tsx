import { useEffect, useState } from 'preact/hooks';
import { navigate } from './router';
import { usePartyClientState } from './usePartyClientState';
import { sendPartyIntent, joinParty, loadSavedSession, choosePartyTeam } from './partyClientStore';
import { loadGameModule } from '../games/registry';
import type { GameModule } from '../games/types';
import { PixelPanel } from '../core/ui/PixelPanel';
import { PixelButton } from '../core/ui/PixelButton';
import { D20Spinner } from '../core/ui/D20Spinner';
import { PlayerLobby } from '../lobby/PlayerLobby';
import { PartyScoreboard } from '../lobby/PartyScoreboard';
import { useWakeLock } from '../core/device/wakeLock';

/**
 * `#/party/play` — the player's whole-session screen: the party lobby
 * while `phase === 'lobby'`, or the active game's PlayerView while
 * `phase === 'in-game'`. Driven entirely by `partyClientStore`, so it
 * survives the host switching games without the player reconnecting.
 *
 * Reload resilience: if this screen mounts with no live connection but a
 * saved session (room code + playerId) from before a reload, it silently
 * reconnects to the same room/identity instead of asking for the code again.
 */
export function PartyPlayScreen() {
  const state = usePartyClientState();
  const [activeModule, setActiveModule] = useState<GameModule | null>(null);
  const [resumeFailed, setResumeFailed] = useState<string | null>(null);

  useWakeLock(state.status === 'connected');

  useEffect(() => {
    if (state.status !== 'idle') return;
    const saved = loadSavedSession();
    if (!saved) return;
    joinParty(saved.roomCode, saved.profile, saved.playerId, true).catch(() => setResumeFailed(saved.roomCode));
  }, [state.status]);

  useEffect(() => {
    if (state.phase === 'in-game' && state.activeGameId) {
      let cancelled = false;
      loadGameModule(state.activeGameId).then((m) => !cancelled && setActiveModule(m));
      return () => {
        cancelled = true;
      };
    }
    setActiveModule(null);
  }, [state.phase, state.activeGameId]);

  if (state.status === 'idle') {
    if (resumeFailed) {
      return (
        <div className="screen-center">
          <PixelPanel style={{ textAlign: 'center' }}>
            <p>เชื่อมต่อกลับห้อง #{resumeFailed} ไม่สำเร็จ</p>
            <PixelButton variant="primary" onClick={() => navigate(`/join/${resumeFailed}`)}>
              ลองเข้าร่วมอีกครั้ง
            </PixelButton>
          </PixelPanel>
        </div>
      );
    }
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <p>คุณยังไม่ได้เข้าร่วมโรงเตี๊ยม</p>
          <PixelButton variant="primary" onClick={() => navigate('/join')}>
            เข้าร่วมด้วยรหัส
          </PixelButton>
        </PixelPanel>
      </div>
    );
  }

  if (state.status === 'connecting') {
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <D20Spinner label={state.isResuming ? 'กำลังเชื่อมต่อกลับ…' : 'กำลังเชื่อมต่อ…'} />
        </PixelPanel>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <p>{state.errorMessage}</p>
          <PixelButton variant="primary" onClick={() => navigate(`/join/${state.roomCode}`)}>
            ลองเข้าร่วมอีกครั้ง
          </PixelButton>
          <PixelButton variant="secondary" onClick={() => navigate('/')}>
            กลับหน้าแรก
          </PixelButton>
        </PixelPanel>
      </div>
    );
  }

  if (state.phase === 'in-game' && activeModule) {
    const PlayerView = activeModule.PlayerView;
    return (
      <div className="screen-center screen-center--game">
        <PlayerView view={state.gameStatePayload} sendIntent={sendPartyIntent} />
      </div>
    );
  }

  const self = state.players.find((p) => p.playerId === state.selfPlayerId);
  return (
    <>
      {(state.partyScores.length > 0 || state.partyTeamScores.length > 0) && (
        <div className="screen-center" style={{ minHeight: 0, paddingBottom: 0 }}>
          <PartyScoreboard scores={state.partyScores} teamScores={state.partyTeamScores} />
        </div>
      )}
      <PlayerLobby
        self={self}
        players={state.players}
        teamMode={state.teamMode}
        teams={state.teams}
        onChooseTeam={choosePartyTeam}
        roomCode={state.roomCode}
        joinUrl={`${window.location.origin}${window.location.pathname}#/join/${state.roomCode}`}
      />
    </>
  );
}
