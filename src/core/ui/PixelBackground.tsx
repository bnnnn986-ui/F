import { useEffect, useRef } from 'preact/hooks';

interface Ember {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  flicker: number;
  life: number; // 0-1, resets when it reaches 1
}

interface DustMote {
  x: number;
  y: number;
  size: number;
  speed: number;
  twinkle: number;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Full-bleed animated pixel background for the tavern theme: a deep
 * dungeon-purple gradient with slow-rising fireplace embers and drifting
 * dust motes. Respects prefers-reduced-motion by rendering a single static
 * frame.
 */
export function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    const embers: Ember[] = [];
    const dust: DustMote[] = [];

    function resize() {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;

      embers.length = 0;
      const emberCount = Math.max(12, Math.floor((width * height) / 26000));
      for (let i = 0; i < emberCount; i++) {
        embers.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() < 0.75 ? 2 : 3,
          speed: 8 + Math.random() * 16,
          drift: (Math.random() - 0.5) * 10,
          flicker: Math.random() * Math.PI * 2,
          life: Math.random(),
        });
      }

      dust.length = 0;
      const dustCount = Math.max(8, Math.floor(width / 90));
      for (let i = 0; i < dustCount; i++) {
        dust.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: 1,
          speed: 3 + Math.random() * 4,
          twinkle: Math.random() * Math.PI * 2,
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
      grad.addColorStop(0, '#241521');
      grad.addColorStop(1, '#160c14');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      for (const mote of dust) {
        if (!reduced) {
          mote.twinkle += dt * 1.5;
          mote.x -= mote.speed * dt;
          if (mote.x < -4) mote.x = width + 4;
        }
        const alpha = 0.15 + 0.15 * Math.abs(Math.sin(mote.twinkle));
        ctx.fillStyle = `rgba(230, 210, 190, ${reduced ? 0.2 : alpha})`;
        ctx.fillRect(Math.round(mote.x), Math.round(mote.y), mote.size, mote.size);
      }

      for (const ember of embers) {
        if (!reduced) {
          ember.life += dt * (ember.speed / height);
          if (ember.life >= 1) {
            ember.life = 0;
            ember.x = Math.random() * width;
          }
          ember.flicker += dt * 4;
        }
        const y = height - ember.life * height;
        const x = ember.x + Math.sin(ember.flicker) * ember.drift;
        const alpha = reduced ? 0.7 : 0.4 + 0.6 * (1 - ember.life) * Math.abs(Math.sin(ember.flicker));
        ctx.fillStyle = `rgba(232, 178, 61, ${alpha})`;
        ctx.fillRect(Math.round(x), Math.round(y), ember.size, ember.size);
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
