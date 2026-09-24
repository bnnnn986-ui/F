import { AvatarSprite } from '../../../core/ui/AvatarSprite';
import { ItemSprite } from '../../../core/ui/ItemSprite';
import type { RunnerView } from '../logic/views';

const MAX_LANES = 10;

/** Dungeon-corridor race track: one lane per runner, positioned by score progress, chest at the finish. */
export function RaceTrack({ runners }: { runners: RunnerView[] }) {
  const sorted = [...runners].sort((a, b) => b.progress - a.progress);
  const visible = sorted.slice(0, MAX_LANES);
  const rest = sorted.length - visible.length;

  return (
    <div className="race-track">
      <div
        className="race-track__bg"
        aria-hidden="true"
        style={{ backgroundImage: "url('assets/pixellab/scenes/dungeon-bg.png')" }}
      />
      {visible.map((r) => (
        <div key={r.playerId} className={`race-track__lane ${!r.connected ? 'is-disconnected' : ''}`}>
          <span className="race-track__name">{r.name}</span>
          <div className="race-track__rail">
            <div className="race-track__runner" style={{ left: `${r.progress * 92}%` }}>
              <AvatarSprite avatarId={r.avatarId} tint={r.tint} size={36} animation={r.progress > 0 ? 'run' : 'idle'} />
            </div>
            <div className="race-track__chest">
              <ItemSprite id="treasure-chest" size={30} />
            </div>
          </div>
        </div>
      ))}
      {rest > 0 && <p className="race-track__more">และอีก {rest} คน</p>}
    </div>
  );
}
