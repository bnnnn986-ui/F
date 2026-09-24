import { useEffect, useRef } from 'preact/hooks';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  twinkle: number;
}

interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function drawPixelCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.fillStyle = 'rgba(244, 234, 209, 0.5)';
  const blocks: [number, number, number, number][] = [
    [0, 4, 16, 4],
    [4, 0, 10, 4],
    [-4, 6, 4, 2],
    [16, 6, 4, 2],
  ];
  for (const [bx, by, bw, bh] of blocks) {
    ctx.fillRect(x + bx * scale, y + by * scale, bw * scale, bh * scale);
  }
}

/**
 * Full-bleed animated pixel background: a soft parallax field of twinkling
 * stars plus slow-drifting pixel clouds. Respects prefers-reduced-motion by
 * rendering a single static frame.
 */
export function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    const stars: Star[] = [];
    const clouds: Cloud[] = [];

    function resize() {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      stars.length = 0;
      const starCount = Math.floor((width * height) / 9000);
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height * 0.7,
          size: Math.random() < 0.8 ? 2 : 3,
          speed: 4 + Math.random() * 8,
          twinkle: Math.random() * Math.PI * 2,
        });
      }
      clouds.length = 0;
      const cloudCount = Math.max(3, Math.floor(width / 340));
      for (let i = 0; i < cloudCount; i++) {
        clouds.push({
          x: Math.random() * width,
          y: height * (0.08 + Math.random() * 0.35),
          scale: 2 + Math.random() * 3,
          speed: 6 + Math.random() * 10,
        });
      }
    }

    resize();
    window.addEventListener('resize', resize);

    const reduced = prefersReducedMotion();
    let raf = 0;
    let last = performance.now();

    function frame(now: number) {
      if (!ctx || !canvas) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      ctx.clearRect(0, 0, width, height);
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#1a1c2c');
      grad.addColorStop(1, '#2b2e4a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      for (const star of stars) {
        if (!reduced) {
          star.twinkle += dt * 2;
          star.x -= star.speed * dt * 0.2;
          if (star.x < -4) star.x = width + 4;
        }
        const alpha = 0.4 + 0.6 * Math.abs(Math.sin(star.twinkle));
        ctx.fillStyle = `rgba(255, 246, 224, ${reduced ? 0.6 : alpha})`;
        ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
      }

      for (const cloud of clouds) {
        if (!reduced) {
          cloud.x -= cloud.speed * dt;
          if (cloud.x < -80) cloud.x = width + 80;
        }
        drawPixelCloud(ctx, cloud.x, cloud.y, cloud.scale);
      }

      if (!reduced) raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        display: 'block',
      }}
    />
  );
}
