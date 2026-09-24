import { useEffect, useRef, useState } from 'preact/hooks';
import { navigate } from './router';
import { getManifest } from '../games/registry';
import type { GameModule } from '../games/types';
import { RoomHost } from '../core/room/host';
import { PeerHostTransport } from '../core/net/peerTransport';
import type { PartyScoreEntry, RoomPhase, RoomPlayer } from '../core/room/protocol';
import { HostLobby } from '../lobby/HostLobby';
import { GamePicker } from '../lobby/GamePicker';
import { PartyScoreboard } from '../lobby/PartyScoreboard';
import { PixelPanel } from '../core/ui/PixelPanel';
import { PixelButton } from '../core/ui/PixelButton';
import { playSound } from '../core/audio/audio';
import { showToast } from '../core/ui/toast';
import { loadGameModule } from '../games/registry';

type OpenState = 'opening' | 'open' | 'error';

/**
 * Host screen for the whole party: creates ONE room, stays mounted on
 * `#/party/host` for the entire session, and switches between the party
 * lobby (pick a game) and the active game's HostView as `phase` changes —
 * players stay connected throughout, never re-entering a code.
 */
export function PartyHostScreen({ preselectGameId }: { preselectGameId?: string }) {
  const [openState, setOpenState] = useState<OpenState>('opening');
  const [errorMsg, setErrorMsg] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [locked, setLocked] = useState(false);
  const [phase, setPhase] = useState<RoomPhase>('lobby');
  const [partyScores, setPartyScores] = useState<PartyScoreEntry[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(preselectGameId ?? null);
  const [activeModule, setActiveModule] = useState<GameModule | null>(null);

  const hostRef = useRef<RoomHost | null>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setOpenState('opening');

    (async () => {
      try {
        const transport = new PeerHostTransport();
        const host = new RoomHost({ transport });
        hostRef.current = host;

        host.on('lobbyChange', (list, isLocked) => {
          if (list.length > prevCountRef.current) playSound('join');
          prevCountRef.current = list.length;
          setPlayers(list);
          setLocked(isLocked);
          setPartyScores(host.getPartyScores());
        });
        host.on('phaseChange', (newPhase, gameId) => {
          setPhase(newPhase);
          if (newPhase === 'lobby') {
            setActiveModule(null);
            setPartyScores(host.getPartyScores());
          } else if (gameId) {
            loadGameModule(gameId).then((m) => !cancelled && setActiveModule(m));
          }
        });

        const { roomCode: code } = await host.open();
        if (cancelled) {
          host.close();
          return;
        }
        setRoomCode(code);
        setOpenState('open');
      } catch (err) {
        if (cancelled) return;
        setOpenState('error');
        setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างห้อง');
      }
    })();

    return () => {
      cancelled = true;
      hostRef.current?.close();
      hostRef.current = null;
    };
  }, []);

  if (openState === 'opening') {
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <p>กำลังสร้างห้องปาร์ตี้…</p>
        </PixelPanel>
      </div>
    );
  }

  if (openState === 'error') {
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <p>{errorMsg}</p>
          <PixelButton variant="primary" onClick={() => navigate('/')}>
            กลับหน้าแรก
          </PixelButton>
        </PixelPanel>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}${window.location.pathname}#/join/${roomCode}`;

  if (phase === 'in-game' && activeModule) {
    const HostView = activeModule.HostView;
    return (
      <div className="screen-center">
        <HostView view={hostRef.current?.getPlayers()} onBackToLobby={() => hostRef.current?.endGame()} />
      </div>
    );
  }

  const selectedManifest = selectedGameId ? getManifest(selectedGameId) : undefined;

  return (
    <div className="host-lobby">
      <HostLobby
        roomCode={roomCode}
        joinUrl={joinUrl}
        players={players}
        locked={locked}
        onToggleLock={() => hostRef.current?.setLocked(!locked)}
        onKick={(playerId) => {
          hostRef.current?.kickPlayer(playerId);
          showToast('เชิญผู้เล่นออกจากห้องแล้ว');
        }}
      />

      <PartyScoreboard scores={partyScores} />

      <GamePicker selectedGameId={selectedGameId} onSelect={setSelectedGameId} />

      <div className="host-lobby__start">
        <PixelButton
          variant="primary"
          big
          block
          disabled={!selectedGameId || players.length < 1}
          onClick={() => selectedGameId && hostRef.current?.startGame(selectedGameId)}
        >
          {selectedManifest ? `เริ่ม ${selectedManifest.titleTh} ▶` : 'เลือกเกมก่อนเริ่ม'}
        </PixelButton>
        {players.length < 1 && <p className="host-lobby__hint">รอผู้เล่นเข้าร่วมอย่างน้อย 1 คนก่อนเริ่มเกม</p>}
      </div>
    </div>
  );
}
