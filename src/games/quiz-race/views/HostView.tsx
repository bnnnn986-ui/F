import { useEffect, useRef, useState } from 'preact/hooks';
import confetti from 'canvas-confetti';
import { PixelPanel } from '../../../core/ui/PixelPanel';
import { PixelButton } from '../../../core/ui/PixelButton';
import { AvatarSprite } from '../../../core/ui/AvatarSprite';
import { ItemSprite } from '../../../core/ui/ItemSprite';
import { TimerBar } from '../../../core/ui/Timer';
import { playSound } from '../../../core/audio/audio';
import { RaceTrack } from './RaceTrack';
import { SetupPanel } from './SetupPanel';
import type { QuizHostAction, QuizHostViewPayload } from '../index';

const SHAPES = ['▲', '◆', '●', '■'];
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

  if (v.phase === 'question') {
    return <QuestionHost v={v} />;
  }

  if (v.phase === 'reveal') {
    return <RevealHost v={v} onNext={() => act({ type: 'next' })} />;
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
              <span className="quiz-plaque__shape">{SHAPES[i]}</span>
              <span className="quiz-plaque__text">{choice}</span>
            </div>
          ))}
        </div>
      </PixelPanel>
      <RaceTrack runners={v.runners} />
    </div>
  );
}

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
        <div className="quiz-plaques">
          {v.question?.choices.map((choice, i) => {
            const isCorrect = i === v.revealCorrectIndex;
            const count = v.distribution?.[i] ?? 0;
            return (
              <div
                key={i}
                className={`quiz-plaque ${isCorrect ? 'quiz-plaque--correct' : 'quiz-plaque--dim'}`}
                style={{ background: PLAQUE_COLORS[i] }}
              >
                <span className="quiz-plaque__shape">{SHAPES[i]}</span>
                <span className="quiz-plaque__text">{choice}</span>
                <div className="quiz-plaque__bar" style={{ width: `${(count / total) * 100}%` }} />
                <span className="quiz-plaque__count">{count}</span>
              </div>
            );
          })}
        </div>
        <PixelButton variant="primary" big onClick={onNext}>
          {v.questionIndex + 1 >= v.totalQuestions ? 'ดูผลสรุป ▶' : 'ข้อถัดไป ▶'}
        </PixelButton>
      </PixelPanel>
      <RaceTrack runners={v.runners} />
    </div>
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
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    playSound('fanfare');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.4 } });
    }
  }, []);

  const top3 = v.leaderboard.slice(0, 3);
  const order = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd for podium visual order

  return (
    <PixelPanel className="quiz-podium" style={{ textAlign: 'center' }}>
      <h2>🏆 ตำนานประจำดันเจี้ยน</h2>
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
            <PixelPanel dark>
              🎯 แม่นยำที่สุด: {v.podiumStats.mostAccurate.name} ({v.podiumStats.mostAccurate.correctCount}/{v.podiumStats.mostAccurate.totalQuestions})
            </PixelPanel>
          )}
          {v.podiumStats.fastest && (
            <PixelPanel dark>⚡ ตอบไวที่สุด: {v.podiumStats.fastest.name}</PixelPanel>
          )}
          {v.podiumStats.longestStreak && (
            <PixelPanel dark>
              🔥 สตรีคยาวที่สุด: {v.podiumStats.longestStreak.name} ({v.podiumStats.longestStreak.streak})
            </PixelPanel>
          )}
        </div>
      )}

      <ol className="quiz-podium__full-list">
        {v.leaderboard.map((e) => (
          <li key={e.player.playerId}>
            #{e.rank} {e.player.name}
            {e.player.isBot && <span className="npc-badge">NPC</span>} — {e.player.score}
          </li>
        ))}
      </ol>

      <div className="host-actions-row">
        <PixelButton variant="secondary" onClick={onRestart}>
          🔁 เล่นอีกรอบ
        </PixelButton>
        <PixelButton variant="primary" big onClick={onExit}>
          🏠 กลับโรงเตี๊ยม
        </PixelButton>
      </div>
      <PixelButton className="quiz-podium__force-exit" variant="danger" onClick={onBackToLobby}>
        ออกฉุกเฉิน (ไม่บันทึกคะแนน)
      </PixelButton>
    </PixelPanel>
  );
}

