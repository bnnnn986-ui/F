import { useEffect, useRef, useState } from 'preact/hooks';
import { PixelPanel } from '../../../core/ui/PixelPanel';
import { AvatarSprite } from '../../../core/ui/AvatarSprite';
import { TimerBar } from '../../../core/ui/Timer';
import { playSound } from '../../../core/audio/audio';
import { Icon } from '../../../core/ui/Icon';
import { PixelShape, type ShapeKind } from '../../../core/ui/PixelShape';
import type { QuizPlayerIntent, QuizPlayerViewPayload } from '../index';

const SHAPES: ShapeKind[] = ['triangle', 'diamond', 'circle', 'square'];
const PLAQUE_COLORS = ['#c0392b', '#2471a3', '#d4ac0d', '#229954'];

export function QuizRacePlayerView({ view, sendIntent }: { view: unknown; sendIntent: (intent: unknown) => void }) {
  const v = view as QuizPlayerViewPayload | null;
  const send = (i: QuizPlayerIntent) => sendIntent(i);

  if (!v) {
    return (
      <PixelPanel style={{ textAlign: 'center' }}>
        <AvatarSprite avatarId="fighter" size={72} animation="idle" />
        <p>กำลังโหลด…</p>
      </PixelPanel>
    );
  }

  if (v.phase === 'setup' || v.phase === 'countdown') {
    return (
      <PixelPanel style={{ textAlign: 'center' }}>
        <AvatarSprite avatarId="fighter" size={80} animation="idle" />
        <h2>{v.phase === 'countdown' ? 'เตรียมตัว!' : 'รอผู้คุมเกมตั้งค่าภารกิจ…'}</h2>
        <p>ดันเจี้ยนแดชกำลังจะเริ่ม</p>
      </PixelPanel>
    );
  }

  if (v.isSpectator && v.phase !== 'podium') {
    return (
      <PixelPanel style={{ textAlign: 'center' }}>
        <AvatarSprite avatarId="ghost" size={80} animation="idle" />
        <h2>คุณเข้าร่วมระหว่างเกม</h2>
        <p>รอข้อถัดไปเพื่อร่วมเล่นนะ</p>
      </PixelPanel>
    );
  }

  if (v.phase === 'question') {
    return <QuestionPlayer v={v} onAnswer={(choiceIndex) => send({ type: 'answer', choiceIndex })} />;
  }

  if (v.phase === 'reveal') {
    return <ResultPlayer v={v} />;
  }

  if (v.phase === 'podium') {
    return <PodiumPlayer v={v} />;
  }

  return null;
}

function QuestionPlayer({ v, onAnswer }: { v: QuizPlayerViewPayload; onAnswer: (choiceIndex: number) => void }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 200);
    return () => clearInterval(id);
  }, []);
  const remainingMs = v.deadlineAt ? Math.max(0, v.deadlineAt - Date.now()) : v.timeLimitMs;
  const ratio = v.timeLimitMs > 0 ? remainingMs / v.timeLimitMs : 0;

  const lockIn = (choiceIndex: number) => {
    if (v.hasAnswered) return;
    playSound('click');
    onAnswer(choiceIndex);
  };

  return (
    <div className="quiz-player-question">
      <div className="quiz-question-host__meta">
        <span>
          ข้อ {v.questionIndex + 1}/{v.totalQuestions}
        </span>
      </div>
      <TimerBar ratio={ratio} />
      <h2 className="quiz-player-question__text">{v.question?.text}</h2>
      <div className="quiz-plaques quiz-plaques--player">
        {v.question?.choices.map((choice, i) => (
          <button
            key={i}
            type="button"
            data-testid={`quiz-answer-${i}`}
            className={`quiz-plaque quiz-plaque--button ${v.lockedChoiceIndex === i ? 'is-locked' : ''}`}
            style={{ background: PLAQUE_COLORS[i] }}
            disabled={v.hasAnswered}
            onClick={() => lockIn(i)}
          >
            <PixelShape kind={SHAPES[i]!} className="quiz-plaque__shape" />
            <span className="quiz-plaque__text">{choice}</span>
          </button>
        ))}
      </div>
      {v.hasAnswered && (
        <p className="quiz-player-question__locked">
          <Icon name="lock" className="pp-icon--sm" /> ล็อกคำตอบแล้ว! รอเพื่อนๆ ตอบให้ครบ…
        </p>
      )}
    </div>
  );
}

function ResultPlayer({ v }: { v: QuizPlayerViewPayload }) {
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    playSound(v.result?.correct ? 'correct' : 'wrong');
  }, [v.result?.correct]);

  return (
    <PixelPanel style={{ textAlign: 'center' }} className={v.result?.correct ? 'quiz-result--correct' : 'quiz-result--wrong'}>
      <p className="quiz-result__mark">
        {v.result ? <Icon name={v.result.correct ? 'check' : 'cross'} scale={2} /> : '…'}
      </p>
      <h2>{v.result?.correct ? 'ถูกต้อง!' : v.result ? 'ผิดพลาด!' : 'ไม่ได้ตอบ'}</h2>
      {v.result && v.result.points > 0 && (
        <p className="quiz-result__points">
          +{v.result.points}{' '}
          {v.streak >= 2 && (
            <>
              <Icon name="flame" className="pp-icon--sm" />x{v.streak}
            </>
          )}
        </p>
      )}
      <p>
        อันดับ {v.rank ?? '-'} จาก {v.totalPlayers}
      </p>
      <p className="quiz-result__score">คะแนนรวม {v.score}</p>
    </PixelPanel>
  );
}

function PodiumPlayer({ v }: { v: QuizPlayerViewPayload }) {
  return (
    <PixelPanel style={{ textAlign: 'center' }}>
      <h2>{v.podiumTitleTh ?? 'จบภารกิจ!'}</h2>
      <p>
        อันดับของคุณ: {v.rank ?? '-'} จาก {v.totalPlayers}
      </p>
      <p className="quiz-result__score">คะแนนรวม {v.score}</p>
      <p>รอผู้คุมเกมเลือกภารกิจถัดไป…</p>
    </PixelPanel>
  );
}
