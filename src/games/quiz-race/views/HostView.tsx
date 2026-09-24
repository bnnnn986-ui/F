import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import confetti from 'canvas-confetti';
import { PixelPanel } from '../../../core/ui/PixelPanel';
import { PixelButton } from '../../../core/ui/PixelButton';
import { AvatarSprite } from '../../../core/ui/AvatarSprite';
import { ItemSprite } from '../../../core/ui/ItemSprite';
import { TimerBar, CountdownRing } from '../../../core/ui/Timer';
import { playSound } from '../../../core/audio/audio';
import { RaceTrack } from './RaceTrack';
import { TeamRaceTrack } from './TeamRaceTrack';
import { SetupPanel } from './SetupPanel';
import { ReportView } from './ReportView';
import { Icon, EmblemIcon } from '../../../core/ui/Icon';
import { PixelShape, Chevron, type ShapeKind } from '../../../core/ui/PixelShape';
import type { EmblemName } from '../../../core/sprites/icons';
import type { QuizHostAction, QuizHostViewPayload } from '../index';

/** Mirrors logic/reducer.ts's getMaxPossibleScore, computed from the view payload (no full state here). */
function maxPossibleScoreFromView(v: QuizHostViewPayload): number {
  const questionsPlayed = v.phase === 'podium' ? v.totalQuestions : v.questionIndex + 1;
  return Math.max(1, questionsPlayed * 1500);
}

const SHAPES: ShapeKind[] = ['triangle', 'diamond', 'circle', 'square'];
const PLAQUE_COLORS = ['#c0392b', '#2471a3', '#d4ac0d', '#229954'];

export function QuizRaceHostView({
  view,
  onHostAction,
  onBackToLobby,
}: {
  view: unknown;
  onHostAction: (action: unknown) => void;
  onBackToLobby: () => void;
}) {
  const v = view as QuizHostViewPayload | null;
  const act = (a: QuizHostAction) => onHostAction(a);

  if (!v) return <PixelPanel style={{ textAlign: 'center' }}>กำลังโหลด…</PixelPanel>;

  if (v.phase === 'setup') {
    return <SetupPanel setup={v.setup} availablePacks={v.availablePacks} playerCount={v.playerCount} onHostAction={act} />;
  }

  if (v.phase === 'countdown') {
    return <CountdownScreen deadlineAt={v.deadlineAt} />;
  }

  if (v.phase === 'read') {
    return <ReadHost v={v} />;
  }

  if (v.phase === 'question') {
    return <QuestionHost v={v} />;
  }

  if (v.phase === 'reveal') {
    return <RevealHost v={v} onNext={() => act({ type: 'next' })} />;
  }

  if (v.phase === 'leaderboard') {
    return <LeaderboardHost v={v} onNext={() => act({ type: 'next' })} />;
  }

  if (v.phase === 'podium') {
    return (
      <PodiumHost
        v={v}
        onRestart={() => act({ type: 'restart' })}
        onExit={() => act({ type: 'exitToLobby' })}
        onBackToLobby={onBackToLobby}
      />
    );
  }

  return null;
}

function CountdownScreen({ deadlineAt }: { deadlineAt: number | null }) {
  const secondsLeft = deadlineAt ? Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)) : 0;
  const lastPlayed = useRef<number>(-1);
  useEffect(() => {
    if (secondsLeft !== lastPlayed.current && secondsLeft <= 3 && secondsLeft > 0) {
      playSound('countdown');
      lastPlayed.current = secondsLeft;
    }
  }, [secondsLeft]);
  return (
    <PixelPanel className="quiz-countdown" style={{ textAlign: 'center' }}>
      <p className="pixel-title quiz-countdown__num">{secondsLeft > 0 ? secondsLeft : 'GO!'}</p>
      <p>เตรียมตัวให้พร้อม นักผจญภัย!</p>
    </PixelPanel>
  );
}

function useCountdownSeconds(deadlineAt: number | null, timeLimitMs: number) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 200);
    return () => clearInterval(id);
  }, []);
  if (!deadlineAt) return { remainingMs: timeLimitMs, ratio: 1 };
  const remainingMs = Math.max(0, deadlineAt - Date.now());
  return { remainingMs, ratio: timeLimitMs > 0 ? remainingMs / timeLimitMs : 0 };
}

/** Read phase: question text only, answer tiles stay hidden for a beat before answering opens. */
function ReadHost({ v }: { v: QuizHostViewPayload }) {
  return (
    <div className="quiz-question-host">
      <PixelPanel className="quiz-question-host__card">
        <div className="quiz-question-host__meta">
          <span>
            ข้อ {v.questionIndex + 1}/{v.totalQuestions}
          </span>
        </div>
        <h2 className="quiz-question-host__text">{v.question?.text}</h2>
        <p className="quiz-setup__hint">เตรียมตัวตอบ…</p>
      </PixelPanel>
    </div>
  );
}

/**
 * The host's "ถัดไป" control: a plain button when the host is driving manually, or (auto-play)
 * a draining countdown ring around the button that can still be pressed early to skip ahead.
 */
function NextControl({ deadlineAt, phaseTotalMs, onNext, children }: { deadlineAt: number | null; phaseTotalMs: number | null; onNext: () => void; children: ComponentChildren }) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!deadlineAt) return;
    const id = setInterval(() => force((n) => n + 1), 200);
    return () => clearInterval(id);
  }, [deadlineAt]);

  if (!deadlineAt || !phaseTotalMs) {
    return (
      <PixelButton variant="primary" big onClick={onNext}>
        {children}
      </PixelButton>
    );
  }

  const remainingSec = Math.max(0, (deadlineAt - Date.now()) / 1000);
  return (
    <button type="button" className="quiz-next-ring" onClick={onNext}>
      <CountdownRing seconds={remainingSec} total={phaseTotalMs / 1000} size={56} />
      <span className="quiz-next-ring__label">{children}</span>
    </button>
  );
}

function QuestionHost({ v }: { v: QuizHostViewPayload }) {
  const { remainingMs, ratio } = useCountdownSeconds(v.deadlineAt, v.timeLimitMs);
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const lastTick = useRef(-1);
  useEffect(() => {
    if (secondsLeft <= 5 && secondsLeft >= 0 && secondsLeft !== lastTick.current) {
      playSound('tick');
      lastTick.current = secondsLeft;
    }
  }, [secondsLeft]);

  return (
    <div className="quiz-question-host">
      <PixelPanel className="quiz-question-host__card">
        <div className="quiz-question-host__meta">
          <span>
            ข้อ {v.questionIndex + 1}/{v.totalQuestions}
          </span>
          <span>ตอบแล้ว {v.answeredCount}/{v.eligibleCount}</span>
        </div>
        <TimerBar ratio={ratio} />
        <h2 className="quiz-question-host__text">{v.question?.text}</h2>
        <div className="quiz-plaques">
          {v.question?.choices.map((choice, i) => (
            <div key={i} className="quiz-plaque" style={{ background: PLAQUE_COLORS[i] }}>
              <PixelShape kind={SHAPES[i]!} className="quiz-plaque__shape" />
              <span className="quiz-plaque__text">{choice}</span>
            </div>
          ))}
        </div>
      </PixelPanel>
      {v.teamMode && v.teamScores ? (
        <TeamRaceTrack teamScores={v.teamScores} runners={v.runners} maxScore={maxPossibleScoreFromView(v)} />
      ) : (
        <RaceTrack runners={v.runners} />
      )}
    </div>
  );
}

/** Kahoot-style answer summary: a vertical bar per option (count/% above, correct check, avatar stack). */
function RevealHost({ v, onNext }: { v: QuizHostViewPayload; onNext: () => void }) {
  useEffect(() => {
    playSound('correct');
  }, [v.questionIndex]);
  const total = (v.distribution ?? []).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="quiz-question-host">
      <PixelPanel className="quiz-question-host__card">
        <div className="quiz-question-host__meta">
          <span>
            ข้อ {v.questionIndex + 1}/{v.totalQuestions}
          </span>
        </div>
        <h2 className="quiz-question-host__text">{v.question?.text}</h2>
        <div className="quiz-reveal-bars">
          {v.question?.choices.map((choice, i) => {
            const isCorrect = i === v.revealCorrectIndex;
            const count = v.distribution?.[i] ?? 0;
            const pct = Math.round((count / total) * 100);
            const voters = v.voters?.[i] ?? [];
            return (
              <div key={i} className={`quiz-reveal-bar ${isCorrect ? 'is-correct' : ''}`}>
                <div className="quiz-reveal-bar__stat">
                  {count} <span className="quiz-reveal-bar__pct">({pct}%)</span>
                  {isCorrect && <Icon name="check" className="pp-icon--sm" label="คำตอบที่ถูก" />}
                </div>
                <div className="quiz-reveal-bar__track">
                  <div className="quiz-reveal-bar__fill" style={{ height: `${pct}%`, background: PLAQUE_COLORS[i] }}>
                    <PixelShape kind={SHAPES[i]!} className="quiz-plaque__shape" />
                  </div>
                </div>
                <div className="quiz-reveal-bar__voters" data-testid={`quiz-reveal-voters-${i}`}>
                  {voters.slice(0, 6).map((voter) => (
                    <AvatarSprite key={voter.playerId} avatarId={voter.avatarId} tint={voter.tint} size={22} animation="none" />
                  ))}
                  {voters.length > 6 && <span className="quiz-reveal-bar__more">+{voters.length - 6}</span>}
                </div>
                <div className="quiz-plaque__text quiz-reveal-bar__label">{choice}</div>
              </div>
            );
          })}
        </div>
        <div className="quiz-next-row">
          <NextControl deadlineAt={v.deadlineAt} phaseTotalMs={v.phaseTotalMs} onNext={onNext}>
            ดูอันดับ <Chevron direction="right" />
          </NextControl>
        </div>
      </PixelPanel>
      {v.teamMode && v.teamScores ? (
        <TeamRaceTrack teamScores={v.teamScores} runners={v.runners} maxScore={maxPossibleScoreFromView(v)} />
      ) : (
        <RaceTrack runners={v.runners} />
      )}
    </div>
  );
}

/** Top-5 leaderboard between questions, with the host's next-question control. */
function LeaderboardHost({ v, onNext }: { v: QuizHostViewPayload; onNext: () => void }) {
  const top5 = v.leaderboard.slice(0, 5);
  const isLast = v.questionIndex + 1 >= v.totalQuestions;
  return (
    <PixelPanel className="quiz-question-host__card" style={{ textAlign: 'center' }}>
      <h2><Icon name="star" className="pp-icon--md" /> อันดับล่าสุด</h2>
      <ol className="party-scoreboard__list">
        {top5.map((e) => (
          <li key={e.player.playerId}>
            <span className="party-scoreboard__rank">#{e.rank}</span>
            <AvatarSprite avatarId={e.player.avatarId} tint={e.player.tint} size={32} animation="none" />
            <span className="party-scoreboard__name">
              {e.player.name}
              {e.player.isBot && <span className="npc-badge">NPC</span>}
            </span>
            <span className="party-scoreboard__total">{e.player.score}</span>
          </li>
        ))}
      </ol>
      <div className="quiz-next-row quiz-next-row--center">
        <NextControl deadlineAt={v.deadlineAt} phaseTotalMs={v.phaseTotalMs} onNext={onNext}>
          {isLast ? (
            <>ดูผลสรุป <Chevron direction="right" /></>
          ) : (
            <>ข้อถัดไป <Chevron direction="right" /></>
          )}
        </NextControl>
      </div>
    </PixelPanel>
  );
}

function PodiumHost({
  v,
  onRestart,
  onExit,
  onBackToLobby,
}: {
  v: QuizHostViewPayload;
  onRestart: () => void;
  onExit: () => void;
  onBackToLobby: () => void;
}) {
  const fired = useRef(false);
  const [showReport, setShowReport] = useState(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    playSound('fanfare');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.4 } });
    }
  }, []);

  if (showReport && v.report) {
    return <ReportView report={v.report} onClose={() => setShowReport(false)} />;
  }

  const top3 = v.leaderboard.slice(0, 3);
  const order = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd for podium visual order

  return (
    <PixelPanel className="quiz-podium" style={{ textAlign: 'center' }}>
      <h2><Icon name="crown" className="pp-icon--md" /> ตำนานประจำดันเจี้ยน</h2>

      {v.teamMode && v.teamScores && v.teamScores.length > 0 && (
        <div className="quiz-podium__teams">
          <p className="quiz-setup__label">ผลกิลด์ (คะแนนเฉลี่ย)</p>
          <ol className="party-scoreboard__list">
            {[...v.teamScores]
              .sort((a, b) => b.avgScore - a.avgScore)
              .map((ts, i) => (
                <li key={ts.team.id}>
                  <span className="party-scoreboard__rank">#{i + 1}</span>
                  <span className="party-scoreboard__name" style={{ color: ts.team.color }}>
                    <EmblemIcon name={ts.team.emblem as EmblemName} className="pp-icon--sm" /> {ts.team.name}
                  </span>
                  <span className="party-scoreboard__total">{ts.avgScore} คะแนน</span>
                  {ts.mvpPlayerId && (
                    <span className="quiz-podium__mvp">
                      MVP: {v.leaderboard.find((e) => e.player.playerId === ts.mvpPlayerId)?.player.name ?? '-'}
                    </span>
                  )}
                </li>
              ))}
          </ol>
        </div>
      )}

      <div className="quiz-podium__stands">
        {order.map((entry, i) =>
          entry ? (
            <div key={entry.player.playerId} className={`quiz-podium__stand quiz-podium__stand--${entry.rank}`}>
              {entry.rank === 1 && <ItemSprite id="trophy" size={40} />}
              <AvatarSprite avatarId={entry.player.avatarId} tint={entry.player.tint} size={56} animation="idle" pop />
              <p className="quiz-podium__name">
                {entry.player.name}
                {entry.player.isBot && <span className="npc-badge">NPC</span>}
              </p>
              <p className="quiz-podium__score">{entry.player.score}</p>
              <div className="quiz-podium__block">#{entry.rank}</div>
            </div>
          ) : (
            <div key={`empty-${i}`} className="quiz-podium__stand quiz-podium__stand--empty" />
          ),
        )}
      </div>

      {v.podiumStats && (
        <div className="quiz-podium__stats">
          {v.podiumStats.mostAccurate && (
            <PixelPanel dark className="quiz-podium__stat-card">
              <Icon name="target" className="pp-icon--md" />
              <p className="quiz-podium__stat-value">{v.podiumStats.mostAccurate.name}</p>
              <p className="quiz-podium__stat-label">
                แม่นยำที่สุด ({v.podiumStats.mostAccurate.correctCount}/{v.podiumStats.mostAccurate.totalQuestions})
              </p>
            </PixelPanel>
          )}
          {v.podiumStats.fastest && (
            <PixelPanel dark className="quiz-podium__stat-card">
              <Icon name="lightning" className="pp-icon--md" />
              <p className="quiz-podium__stat-value">{v.podiumStats.fastest.name}</p>
              <p className="quiz-podium__stat-label">ตอบไวที่สุด</p>
            </PixelPanel>
          )}
          {v.podiumStats.longestStreak && (
            <PixelPanel dark className="quiz-podium__stat-card">
              <Icon name="flame" className="pp-icon--md" />
              <p className="quiz-podium__stat-value">{v.podiumStats.longestStreak.name}</p>
              <p className="quiz-podium__stat-label">สตรีคยาวที่สุด ({v.podiumStats.longestStreak.streak})</p>
            </PixelPanel>
          )}
        </div>
      )}

      <table className="quiz-podium__full-list">
        <thead>
          <tr>
            <th>อันดับ</th>
            <th>นักผจญภัย</th>
            <th>คะแนน</th>
          </tr>
        </thead>
        <tbody>
          {v.leaderboard.map((e) => (
            <tr key={e.player.playerId}>
              <td>#{e.rank}</td>
              <td>
                {e.player.name}
                {e.player.isBot && <span className="npc-badge">NPC</span>}
              </td>
              <td className="pixel-num">{e.player.score}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="host-actions-row">
        <PixelButton variant="secondary" onClick={() => setShowReport(true)}>
          <Icon name="scroll" className="pp-icon--md" /> ดูรายงานผล
        </PixelButton>
        <PixelButton variant="secondary" onClick={onRestart}>
          <Icon name="replay" className="pp-icon--md" /> เล่นอีกรอบ
        </PixelButton>
        <PixelButton variant="primary" onClick={onExit}>
          <Icon name="home" className="pp-icon--md" /> กลับโรงเตี๊ยม
        </PixelButton>
      </div>
      <PixelButton className="quiz-podium__force-exit" variant="danger" onClick={onBackToLobby}>
        ออกฉุกเฉิน (ไม่บันทึกคะแนน)
      </PixelButton>
    </PixelPanel>
  );
}

