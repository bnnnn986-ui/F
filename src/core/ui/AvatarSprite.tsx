import { useEffect, useRef, useState } from 'preact/hooks';
import { createFrameClock, drawSprite } from '../sprites/engine';
import { getAvatar } from '../sprites/avatars';
import { getCharacter } from '../sprites/heroes';
import { getRecoloredDataUrl } from '../sprites/recolor';

export interface AvatarSpriteProps {
  avatarId: string;
  /** Outfit hue tint, 0 = original PNG colours. See core/sprites/recolor.ts. */
  tint?: number;
  size?: number; // rendered box size in px
  animation?: 'idle' | 'run' | 'none';
  facing?: 'left' | 'right';
  pop?: boolean;
  className?: string;
}

/**
 * Draws a party character (hero class or polymorph critter). Primary art
 * is a real PixelLab PNG, recoloured client-side by `tint` (see
 * `core/sprites/recolor.ts`), animated with a pure-CSS bob (idle) / faster
 * bob+tilt (run). Falls back to the code-drawn canvas critter from
 * `sprites/avatars` if the PNG is missing or fails to load.
 */
export function AvatarSprite({
  avatarId,
  tint = 0,
  size = 64,
  animation = 'idle',
  facing = 'right',
  pop,
  className = '',
}: AvatarSpriteProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setImageFailed(false);
    const character = getCharacter(avatarId);
    getRecoloredDataUrl(character.pngPath, tint)
      .then((url) => !cancelled && setDataUrl(url))
      .catch(() => !cancelled && setImageFailed(true));
    return () => {
      cancelled = true;
    };
  }, [avatarId, tint]);

  const wrapperClasses = ['pixel-avatar', pop ? 'pixel-avatar--pop' : '', className].filter(Boolean).join(' ');
  const flip = facing === 'left';

  if (!imageFailed) {
    const animClass = animation === 'run' ? 'pixel-avatar-img--run' : animation === 'idle' ? 'pixel-avatar-img--idle' : '';
    return (
      <div
        className={wrapperClasses}
        style={{ width: size, height: size, transform: flip ? 'scaleX(-1)' : undefined }}
      >
        {dataUrl && (
          <img
            src={dataUrl}
            width={size}
            height={size}
            alt=""
            draggable={false}
            className={animClass}
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
    );
  }

  return <CodeDrawnAvatar avatarId={avatarId} size={size} animation={animation} className={wrapperClasses} />;
}

/** Fallback: renders the procedurally-drawn 16x16 critter to a canvas. */
function CodeDrawnAvatar({
  avatarId,
  size,
  animation,
  className,
}: {
  avatarId: string;
  size: number;
  animation: 'idle' | 'run' | 'none';
  className: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const avatar = getAvatar(avatarId);
    const frames = animation === 'run' ? avatar.run : avatar.idle;
    const scale = size / 16;

    if (animation === 'none') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawSprite(ctx, `${avatarId}-idle`, frames, 0, 0, 0, scale);
      return;
    }

    const clock = createFrameClock(frames.length, animation === 'run' ? 180 : 500);
    let raf = 0;
    const loop = (now: number) => {
      const frame = clock.tick(now);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawSprite(ctx, `${avatarId}-${animation}`, frames, frame, 0, 0, scale);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [avatarId, animation, size]);

  return (
    <div className={className} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} width={size} height={size} />
    </div>
  );
}
