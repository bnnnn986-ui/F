import { useMemo } from 'preact/hooks';
import type { GameManifest } from '../games/types';
import { AvatarSprite } from '../core/ui/AvatarSprite';
import { DecorSprite } from '../core/ui/DecorSprite';
import { Badge } from '../core/ui/Badge';
import type { DecorId } from '../core/sprites/decor';
import { AVATARS } from '../core/sprites/avatars';

const AVATAR_IDS = new Set(AVATARS.map((a) => a.id));

export function GameCard({ manifest, onClick }: { manifest: GameManifest; onClick: () => void }) {
  const isReady = manifest.status === 'ready';
  const thumbs = useMemo(() => manifest.thumbnailSprites.slice(0, 3), [manifest.thumbnailSprites]);

  return (
    <button
      type="button"
      className="pixel-panel game-card"
      onClick={onClick}
      disabled={!isReady}
      aria-disabled={!isReady}
    >
      {!isReady && (
        <span className="game-card__ribbon">
          <Badge variant="soon">เร็วๆ นี้</Badge>
        </span>
      )}
      <div className="game-card__thumb">
        {thumbs.map((id) =>
          AVATAR_IDS.has(id) ? (
            <AvatarSprite key={id} avatarId={id} size={48} animation={isReady ? 'idle' : 'none'} />
          ) : (
            <DecorSprite key={id} id={id as DecorId} size={48} />
          ),
        )}
      </div>
      <h3 className="game-card__title">{manifest.titleTh}</h3>
      <p className="game-card__subtitle">{manifest.titleEn}</p>
      <p className="game-card__desc">{manifest.descriptionTh}</p>
      <div className="game-card__meta">
        <span>
          👥 {manifest.minPlayers}-{manifest.maxPlayers} คน
        </span>
        <span>⏱ {manifest.durationMinutes} นาที</span>
      </div>
      <div className="game-card__tags">
        {manifest.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    </button>
  );
}
