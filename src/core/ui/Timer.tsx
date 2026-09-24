/** Horizontal countdown bar: fills from 100% to 0%, colour shifts as time runs low. */
export function TimerBar({ ratio }: { ratio: number }) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const color = clamped < 0.25 ? 'var(--pp-danger)' : clamped < 0.5 ? 'var(--pp-accent)' : 'var(--pp-success)';
  return (
    <div className="pixel-timerbar" role="progressbar" aria-valuenow={Math.round(clamped * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="pixel-timerbar__fill" style={{ width: `${clamped * 100}%`, background: color }} />
    </div>
  );
}

/** Circular countdown ring built from conic-gradient (no SVG needed), with the number in the middle. */
export function CountdownRing({ seconds, total, size = 72 }: { seconds: number; total: number; size?: number }) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
  const color = ratio < 0.25 ? 'var(--pp-danger)' : ratio < 0.5 ? 'var(--pp-accent)' : 'var(--pp-success)';
  const deg = ratio * 360;
  return (
    <div
      className="pixel-ring pixel-border"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `conic-gradient(${color} ${deg}deg, var(--pp-bg) ${deg}deg)`,
      }}
    >
      <span className="pixel-ring__num" style={{ fontSize: size * 0.32 }}>
        {Math.max(0, Math.ceil(seconds))}
      </span>
    </div>
  );
}
