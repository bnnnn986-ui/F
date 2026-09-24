import { PALETTE, type PixelGrid } from './palette';

/** In-memory cache: sprite-string-grid (+ scale) -> rendered canvas. */
const canvasCache = new Map<string, HTMLCanvasElement>();

/** Optional overrides: sprite id -> PNG url, loaded once from the manifest. */
let overrideManifest: Record<string, string> | null = null;
let overrideLoadPromise: Promise<void> | null = null;

/**
 * Loads `public/assets/pixellab/manifest.json` (if present) which maps a
 * sprite id to a PNG file name that should override the code-drawn sprite.
 * Safe to call multiple times; only fetches once. Missing file = no-op,
 * so Phase 1 works with zero PNGs on disk.
 */
export function loadPixelLabOverrides(baseUrl = 'assets/pixellab/manifest.json'): Promise<void> {
  if (overrideLoadPromise) return overrideLoadPromise;
  overrideLoadPromise = fetch(baseUrl)
    .then((res) => (res.ok ? res.json() : {}))
    .then((json) => {
      overrideManifest = json as Record<string, string>;
    })
    .catch(() => {
      overrideManifest = {};
    });
  return overrideLoadPromise;
}

function cacheKey(grid: PixelGrid, scale: number): string {
  return `${scale}|${grid.join('|')}`;
}

/**
 * Renders a palette-indexed string grid to a pixel-perfect canvas, scaled
 * by an integer factor (no smoothing). Results are cached by content.
 */
export function renderSprite(grid: PixelGrid, scale = 4): HTMLCanvasElement {
  const key = cacheKey(grid, scale);
  const cached = canvasCache.get(key);
  if (cached) return cached;

  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < height; y++) {
      const row = grid[y] ?? '';
      for (let x = 0; x < width; x++) {
        const ch = row[x] ?? '.';
        if (ch === '.') continue;
        const color = PALETTE[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  canvasCache.set(key, canvas);
  return canvas;
}

/** Renders a sprite to a data URL (useful for <img> tags / favicons). */
export function spriteToDataUrl(grid: PixelGrid, scale = 4): string {
  return renderSprite(grid, scale).toDataURL('image/png');
}

/**
 * Draws a sprite id onto a 2D context at (x, y), preferring a PixelLab PNG
 * override when the manifest lists one, otherwise falling back to the
 * code-drawn grid. `frames` supplies the code-drawn animation frames.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  spriteId: string,
  frames: PixelGrid[],
  frameIndex: number,
  x: number,
  y: number,
  scale = 4,
): void {
  const overridePath = overrideManifest?.[spriteId];
  if (overridePath) {
    const img = getOverrideImage(overridePath);
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
      return;
    }
  }
  const frame = frames[frameIndex % frames.length];
  if (!frame) return;
  const canvas = renderSprite(frame, scale);
  ctx.drawImage(canvas, x, y);
}

const overrideImageCache = new Map<string, HTMLImageElement>();
function getOverrideImage(path: string): HTMLImageElement {
  let img = overrideImageCache.get(path);
  if (!img) {
    img = new Image();
    img.src = `assets/pixellab/${path}`;
    overrideImageCache.set(path, img);
  }
  return img;
}

/**
 * Small helper that advances an animation frame index on a fixed interval.
 * Returns a `tick(nowMs)` function returning the current frame index, and
 * a `stop()` to clean up — call `tick` from a requestAnimationFrame loop.
 */
export function createFrameClock(frameCount: number, msPerFrame = 400) {
  let startTime: number | null = null;
  return {
    tick(nowMs: number): number {
      if (startTime === null) startTime = nowMs;
      const elapsed = nowMs - startTime;
      return Math.floor(elapsed / msPerFrame) % frameCount;
    },
    reset() {
      startTime = null;
    },
  };
}
