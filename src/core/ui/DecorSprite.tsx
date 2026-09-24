import { useEffect, useRef } from 'preact/hooks';
import { renderSprite } from '../sprites/engine';
import { DECOR, type DecorId } from '../sprites/decor';

export function DecorSprite({ id, size = 32, className = '' }: { id: DecorId; size?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const scale = size / 16;
    const source = renderSprite(DECOR[id], scale);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0);
  }, [id, size]);
  return <canvas ref={canvasRef} width={size} height={size} className={className} />;
}
