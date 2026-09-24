import { useEffect, useState } from 'preact/hooks';
import { navigate } from './router';
import { usePartyClientState } from './usePartyClientState';
import { sendPartyIntent } from './partyClientStore';
import { loadGameModule } from '../games/registry';
import type { GameModule } from '../games/types';
import { PixelPanel } from '../core/ui/PixelPanel';
import { PixelButton } from '../core/ui/PixelButton';
import { PlayerLobby } from '../lobby/PlayerLobby';
import { PartyScoreboard } from '../lobby/PartyScoreboard';

/**
 * `#/party/play` — the player's whole-session screen: the party lobby
 * while `phase === 'lobby'`, or the active game's PlayerView while
 * `phase === 'in-game'`. Driven entirely by `partyClientStore`, so it
 * survives the host switching games without the player reconnecting.
 */
export function PartyPlayScreen() {
  const state = usePartyClientState();
  const [activeModule, setActiveModule] = useState<GameModule | null>(null);

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
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <p>คุณยังไม่ได้เข้าร่วมห้อง</p>
          <PixelButton variant="primary" onClick={() => navigate('/join')}>
            เข้าร่วมห้องด้วยรหัส
          </PixelButton>
        </PixelPanel>
      </div>
    );
  }

  if (state.status === 'connecting') {
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <p>กำลังเชื่อมต่อ…</p>
        </PixelPanel>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <p>{state.errorMessage}</p>
          <PixelButton variant="primary" onClick={() => navigate('/')}>
            กลับหน้าแรก
          </PixelButton>
        </PixelPanel>
      </div>
    );
  }

  if (state.phase === 'in-game' && activeModule) {
    const PlayerView = activeModule.PlayerView;
    return (
      <div className="screen-center">
        <PlayerView view={state.gameStatePayload} sendIntent={sendPartyIntent} />
      </div>
    );
  }

  const self = state.players.find((p) => p.playerId === state.selfPlayerId);
  return (
    <>
      {state.partyScores.length > 0 && (
        <div className="screen-center" style={{ minHeight: 0, paddingBottom: 0 }}>
          <PartyScoreboard scores={state.partyScores} />
        </div>
      )}
      <PlayerLobby self={self} players={state.players} />
    </>
  );
}
