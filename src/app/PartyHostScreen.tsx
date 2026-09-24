import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentType } from 'preact';
import { navigate } from './router';
import { getManifest, loadGameModule } from '../games/registry';
import type { GameModule } from '../games/types';
import { RoomHost } from '../core/room/host';
import { PeerHostTransport } from '../core/net/peerTransport';
import type { PartyScoreEntry, PartyTeamScoreEntry, RoomPhase, RoomPlayer, Team } from '../core/room/protocol';
import { HostLobby } from '../lobby/HostLobby';
import { GamePicker } from '../lobby/GamePicker';
import { PartyScoreboard } from '../lobby/PartyScoreboard';
import { TeamPanel } from '../lobby/TeamPanel';
import { PixelPanel } from '../core/ui/PixelPanel';
import { PixelButton } from '../core/ui/PixelButton';
import { D20Spinner } from '../core/ui/D20Spinner';
import { playSound } from '../core/audio/audio';
import { showToast } from '../core/ui/toast';
import { loadSnapshotFromStorage, isSnapshotFresh, type HostSnapshot } from '../core/room/snapshot';
import { Icon } from '../core/ui/Icon';
import { Chevron } from '../core/ui/PixelShape';
import { HostControlBar } from './HostControlBar';

type OpenState = 'checking-snapshot' | 'opening' | 'restoring' | 'open' | 'error';

/**
 * Host screen for the whole party: creates ONE room, stays mounted on
 * `#/party/host` for the entire session, and switches between the party
 * lobby (pick a game) and the active game's HostView as `phase` changes —
 * players stay connected throughout, never re-entering a code.
 */
export function PartyHostScreen({ preselectGameId }: { preselectGameId?: string }) {
  const [openState, setOpenState] = useState<OpenState>('checking-snapshot');
  const [errorMsg, setErrorMsg] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [locked, setLocked] = useState(false);
  const [phase, setPhase] = useState<RoomPhase>('lobby');
  const [partyScores, setPartyScores] = useState<PartyScoreEntry[]>([]);
  const [teamMode, setTeamModeState] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [partyTeamScores, setPartyTeamScores] = useState<PartyTeamScoreEntry[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(preselectGameId ?? null);
  const [activeModule, setActiveModule] = useState<GameModule | null>(null);
  const [gameView, setGameView] = useState<unknown>(null);
  const [snapshot, setSnapshot] = useState<HostSnapshot | null>(null);
  const [ReportHistoryComp, setReportHistoryComp] = useState<ComponentType<{ onClose: () => void }> | null>(null);
  const [showReportHistory, setShowReportHistory] = useState(false);

  const hostRef = useRef<RoomHost | null>(null);
  const prevCountRef = useRef(0);

  function wireHost(host: RoomHost) {
    host.on('lobbyChange', (list, isLocked) => {
      if (list.length > prevCountRef.current) playSound('join');
      prevCountRef.current = list.length;
      setPlayers(list);
      setLocked(isLocked);
      setPartyScores(host.getPartyScores());
      setTeamModeState(host.getTeamMode());
      setTeams(host.getTeams());
      setPartyTeamScores(host.getPartyTeamScores());
    });
    host.on('phaseChange', (newPhase, gameId) => {
      setPhase(newPhase);
      if (newPhase === 'lobby') {
        setActiveModule(null);
        setGameView(null);
        setPartyScores(host.getPartyScores());
      } else if (gameId) {
        loadGameModule(gameId).then((m) => setActiveModule(m));
      }
    });
    host.on('gameViewChange', (view) => setGameView(view));
  }

  async function openFreshRoom() {
    setOpenState('opening');
    try {
      const transport = new PeerHostTransport();
      const host = new RoomHost({ transport });
      hostRef.current = host;
      wireHost(host);
      const { roomCode: code } = await host.open();
      setRoomCode(code);
      setPhase(host.getPhase());
      setOpenState('open');
    } catch (err) {
      setOpenState('error');
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างห้อง');
    }
  }

  async function restoreRoom(snap: HostSnapshot) {
    setOpenState('restoring');
    try {
      const transport = new PeerHostTransport();
      const host = new RoomHost({ transport });
      hostRef.current = host;
      wireHost(host);
      const { roomCode: code } = await host.restoreFromSnapshot(snap);
      setRoomCode(code);
      setPhase(host.getPhase());
      setPlayers(host.getPlayers());
      setPartyScores(host.getPartyScores());
      setTeamModeState(host.getTeamMode());
      setTeams(host.getTeams());
      setPartyTeamScores(host.getPartyTeamScores());
      if (host.getActiveGameId()) {
        const module = await loadGameModule(host.getActiveGameId()!);
        setActiveModule(module);
      }
      setOpenState('open');
    } catch {
      showToast('กู้คืนห้องเดิมไม่สำเร็จ กำลังสร้างห้องใหม่', 'error');
      await openFreshRoom();
    }
  }

  useEffect(() => {
    const existing = loadSnapshotFromStorage();
    if (existing && isSnapshotFresh(existing)) {
      setSnapshot(existing);
      setOpenState('checking-snapshot');
    } else {
      openFreshRoom();
    }
    return () => {
      hostRef.current?.close();
      hostRef.current = null;
    };
  }, []);

  if (openState === 'checking-snapshot' && snapshot) {
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <h2>กู้คืนห้อง #{snapshot.roomCode} ต่อไหม?</h2>
          <p>พบห้องเดิมที่เพิ่งปิดไป ({snapshot.players.length} นักผจญภัย) จะกู้คืนหรือเริ่มห้องใหม่ดี?</p>
          <div className="host-actions-row">
            <PixelButton variant="primary" big onClick={() => restoreRoom(snapshot)}>
              กู้คืนห้องเดิม
            </PixelButton>
            <PixelButton variant="secondary" onClick={openFreshRoom}>
              เริ่มห้องใหม่
            </PixelButton>
          </div>
        </PixelPanel>
      </div>
    );
  }

  if (openState === 'opening' || openState === 'checking-snapshot') {
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <D20Spinner label="กำลังสร้างโรงเตี๊ยม…" />
        </PixelPanel>
      </div>
    );
  }

  if (openState === 'restoring') {
    return (
      <div className="screen-center">
        <PixelPanel style={{ textAlign: 'center' }}>
          <D20Spinner label="กำลังกู้คืนห้อง… (อาจใช้เวลาสักครู่)" />
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
    // Generic control bar for whatever game is mounted: pause/resume state is read duck-typed off
    // the game's own view payload (games that don't report one just hide the pause/resume button).
    const pausedFromView = gameView && typeof gameView === 'object' && 'paused' in gameView ? Boolean((gameView as { paused: unknown }).paused) : undefined;
    return (
      <div className="screen-center">
        <HostControlBar
          paused={pausedFromView}
          onPause={() => hostRef.current?.sendHostAction({ type: 'pause' })}
          onResume={() => hostRef.current?.sendHostAction({ type: 'resume' })}
          onSkip={() => hostRef.current?.sendHostAction({ type: 'skip' })}
          onGoToPodium={() => hostRef.current?.sendHostAction({ type: 'end' })}
          onQuitWithoutScores={() => hostRef.current?.endGame()}
        />
        <HostView
          view={gameView}
          onHostAction={(action) => hostRef.current?.sendHostAction(action)}
          onBackToLobby={() => hostRef.current?.endGame()}
        />
      </div>
    );
  }

  const selectedManifest = selectedGameId ? getManifest(selectedGameId) : undefined;
  const botCount = players.filter((p) => p.isBot).length;

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
          showToast('เชิญนักผจญภัยออกจากโรงเตี๊ยมแล้ว');
        }}
      />

      <div className="host-lobby__bots">
        <PixelButton
          variant="secondary"
          disabled={botCount >= 10}
          onClick={() => {
            const bot = hostRef.current?.addBot();
            if (bot) showToast(`เพิ่ม ${bot.name} (บอท) เข้าห้องแล้ว`);
          }}
        >
          เพิ่มนักผจญภัย NPC ({botCount}/10)
        </PixelButton>
        <PixelButton
          variant="secondary"
          onClick={() => {
            setShowReportHistory(true);
            if (!ReportHistoryComp) {
              import('../games/quiz-race/views/ReportHistoryModal').then((m) => setReportHistoryComp(() => m.ReportHistoryModal));
            }
          }}
        >
<Icon name="scroll" className="pp-icon--md" /> รายงานย้อนหลัง
        </PixelButton>
      </div>

      {showReportHistory && ReportHistoryComp && <ReportHistoryComp onClose={() => setShowReportHistory(false)} />}

      <PartyScoreboard scores={partyScores} teamScores={partyTeamScores} />

      <TeamPanel
        teamMode={teamMode}
        teams={teams}
        players={players}
        onSetTeamMode={(on) => hostRef.current?.setTeamMode(on)}
        onSetTeamCount={(n) => hostRef.current?.setTeamCount(n)}
        onAutoBalance={() => hostRef.current?.autoBalanceTeams()}
        onCyclePlayerTeam={(playerId, teamId) => hostRef.current?.movePlayerToTeam(playerId, teamId)}
      />

      <GamePicker selectedGameId={selectedGameId} onSelect={setSelectedGameId} />

      <div className="host-lobby__start">
        <PixelButton
          variant="primary"
          big
          block
          disabled={!selectedGameId || players.length < 1}
          onClick={() => selectedGameId && hostRef.current?.startGame(selectedGameId)}
        >
          {selectedManifest ? (
            <>
              ออกผจญภัย: {selectedManifest.titleTh} <Chevron direction="right" />
            </>
          ) : (
            'เลือกภารกิจก่อนเริ่ม'
          )}
        </PixelButton>
        {players.length < 1 && <p className="host-lobby__hint">รอนักผจญภัยเข้าร่วมอย่างน้อย 1 คนก่อนเริ่ม</p>}
      </div>
    </div>
  );
}
